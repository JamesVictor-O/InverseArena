"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { getContractConfig } from "@/lib/contracts-client";
import { Currency, CURRENCY_INFO } from "@/lib/contract-types";
import { getContractAddresses } from "@/lib/contracts";
import {
  requestMantleSepoliaNetwork,
  isMantleSepolia,
  MANTLE_SEPOLIA,
} from "@/lib/network";

// ERC20 ABI for token approvals
const IERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)",
] as const;

interface CreateGameParams {
  currency: Currency;
  entryFee: number;
  maxPlayers: number;
  name?: string;
}

interface CreatorStakeInfo {
  stakedAmount: string;
  yieldAccumulated: string;
  timestamp: number;
  activeGamesCount: number;
  hasStaked: boolean;
}

interface UseGameManagerReturn {
  createGame: (params: CreateGameParams) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
  checkAndApproveToken: (
    currency: Currency,
    amount: number
  ) => Promise<boolean>;
  getTokenBalance: (currency: Currency) => Promise<string>;
  stakeAsCreator: (amount: number) => Promise<boolean>;
  unstakeCreator: () => Promise<boolean>;
  getCreatorStake: () => Promise<CreatorStakeInfo | null>;
}

export function useGameManager(): UseGameManagerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get signer from injected wallet (MetaMask, etc.)
  const getSigner = useCallback(async () => {
    if (typeof window === "undefined") {
      throw new Error("Window object not available");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error(
        "No wallet provider found. Please install MetaMask or another Web3 wallet."
      );
    }

    // Request account access if needed
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      if (error.code === 4001) {
        throw new Error("Please connect your wallet to continue.");
      }
      throw err;
    }

    const provider = new ethers.BrowserProvider(ethereum);

    // Check network and prompt to switch if needed
    const isCorrectNetwork = await isMantleSepolia(provider);
    if (!isCorrectNetwork) {
      const network = await provider.getNetwork();
      const networkName =
        network.chainId === BigInt(1)
          ? "Ethereum Mainnet"
          : network.chainId === BigInt(11155111)
          ? "Sepolia"
          : network.chainId === BigInt(5000)
          ? "Mantle Mainnet"
          : `Chain ID ${network.chainId}`;

      // Try to switch network automatically
      const switched = await requestMantleSepoliaNetwork();
      if (!switched) {
        throw new Error(
          `Wrong network: ${networkName}. Please switch to Mantle Sepolia (Chain ID: ${MANTLE_SEPOLIA.chainId}) in your wallet.`
        );
      }

      // Wait a bit for network switch to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify switch was successful
      const providerAfterSwitch = new ethers.BrowserProvider(ethereum);
      const networkAfterSwitch = await providerAfterSwitch.getNetwork();
      if (networkAfterSwitch.chainId !== BigInt(MANTLE_SEPOLIA.chainId)) {
        throw new Error(
          `Failed to switch to Mantle Sepolia. Please switch manually in your wallet to Chain ID ${MANTLE_SEPOLIA.chainId}.`
        );
      }
    }

    const signer = await provider.getSigner();
    return signer;
  }, []);

  // Check token balance
  const getTokenBalance = useCallback(
    async (currency: Currency): Promise<string> => {
      try {
        const signer = await getSigner();
        const addresses = getContractAddresses();
        const currencyInfo = CURRENCY_INFO[currency];

        if (currency === Currency.MNT) {
          // Native token balance
          const balance = await signer.provider.getBalance(
            await signer.getAddress()
          );
          return ethers.formatUnits(balance, 18);
        } else {
          // ERC20 token balance
          const tokenAddress =
            currency === Currency.USDT0 ? addresses.USDT0 : addresses.METH;
          const tokenContract = new ethers.Contract(
            tokenAddress,
            IERC20_ABI,
            signer
          );
          const balance = await tokenContract.balanceOf(
            await signer.getAddress()
          );
          return ethers.formatUnits(balance, currencyInfo.decimals);
        }
      } catch (err) {
        console.error("Error getting token balance:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        throw new Error(`Failed to get balance: ${message}`);
      }
    },
    [getSigner]
  );

  // Check and approve token if needed
  const checkAndApproveToken = useCallback(
    async (currency: Currency, amount: number): Promise<boolean> => {
      if (currency === Currency.MNT) {
        return true;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error("No wallet provider found");
        }

        // Helper to wait for network to stabilize
        const ensureNetwork = async (): Promise<ethers.BrowserProvider> => {
          // Get initial network
          const initialProvider = new ethers.BrowserProvider(ethereum);
          let currentNetwork = await initialProvider.getNetwork();

          // If already on correct network, return provider
          if (currentNetwork.chainId === BigInt(MANTLE_SEPOLIA.chainId)) {
            return initialProvider;
          }

          // Network is wrong, request switch
          console.log(
            `Current network: Chain ID ${currentNetwork.chainId}, switching to Mantle Sepolia...`
          );
          const switched = await requestMantleSepoliaNetwork();
          if (!switched) {
            throw new Error(
              `Failed to switch network. Please switch to Mantle Sepolia (Chain ID: ${MANTLE_SEPOLIA.chainId}) manually.`
            );
          }

          // Wait for network change event with timeout
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              ethereum.removeListener("chainChanged", chainChangedHandler);
              reject(
                new Error("Network switch timeout - please switch manually")
              );
            }, 15000);

            const chainChangedHandler = (newChainId: string) => {
              const chainIdNum = BigInt(parseInt(newChainId, 16));
              console.log(`Network changed to Chain ID: ${chainIdNum}`);
              if (chainIdNum === BigInt(MANTLE_SEPOLIA.chainId)) {
                clearTimeout(timeout);
                ethereum.removeListener("chainChanged", chainChangedHandler);
                // Give it a moment to fully stabilize
                setTimeout(() => resolve(), 1000);
              }
            };

            ethereum.on("chainChanged", chainChangedHandler);

            // Also check periodically in case event doesn't fire
            const checkInterval = setInterval(async () => {
              try {
                const checkProvider = new ethers.BrowserProvider(ethereum);
                const network = await checkProvider.getNetwork();
                if (network.chainId === BigInt(MANTLE_SEPOLIA.chainId)) {
                  clearInterval(checkInterval);
                  clearTimeout(timeout);
                  ethereum.removeListener("chainChanged", chainChangedHandler);
                  setTimeout(() => resolve(), 500);
                }
              } catch (err) {
                // Ignore errors during check
              }
            }, 500);
          });

          // Create fresh provider after network switch
          const provider = new ethers.BrowserProvider(ethereum);
          const finalNetwork = await provider.getNetwork();

          if (finalNetwork.chainId !== BigInt(MANTLE_SEPOLIA.chainId)) {
            throw new Error(
              `Network switch failed. Current network: Chain ID ${finalNetwork.chainId}. Please switch to Mantle Sepolia (Chain ID: ${MANTLE_SEPOLIA.chainId}) manually.`
            );
          }

          return provider;
        };

        // Ensure we're on the correct network
        const provider = await ensureNetwork();
        const addresses = getContractAddresses();
        const gameManagerConfig = getContractConfig("GameManager");
        const currencyInfo = CURRENCY_INFO[currency];

        const tokenAddress =
          currency === Currency.USDT0 ? addresses.USDT0 : addresses.METH;

        // Wait a bit more for network to fully stabilize after switch
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if contract has code deployed (with retry for network stability)
        let code: string | undefined;
        let retries = 0;
        const maxRetries = 5;

        while (!code && retries < maxRetries) {
          try {
            // Create completely fresh provider for each attempt
            const checkProvider = new ethers.BrowserProvider(ethereum);

            // Verify network first
            try {
              const networkCheck = await checkProvider.getNetwork();
              if (networkCheck.chainId !== BigInt(MANTLE_SEPOLIA.chainId)) {
                throw new Error(
                  `Network mismatch: Chain ID ${networkCheck.chainId}`
                );
              }
            } catch (networkErr: any) {
              if (
                networkErr.code === "NETWORK_ERROR" ||
                networkErr.message?.includes("network changed")
              ) {
                console.log("Network still changing, waiting...");
                await new Promise((resolve) =>
                  setTimeout(resolve, 2000 * (retries + 1))
                );
                retries++;
                continue;
              }
              throw networkErr;
            }

            // Now check contract code
            code = await checkProvider.getCode(tokenAddress);
            break; // Success
          } catch (codeError: any) {
            retries++;

            // Handle network change errors
            if (
              codeError.code === "NETWORK_ERROR" ||
              codeError.message?.includes("network changed")
            ) {
              console.log(
                `Network changed during check (attempt ${retries}/${maxRetries}), waiting for stabilization...`
              );
              await new Promise((resolve) =>
                setTimeout(resolve, 2000 * retries)
              ); // Exponential backoff
              continue;
            }

            // If all retries exhausted
            if (retries >= maxRetries) {
              throw new Error(
                `Failed to verify token contract after ${maxRetries} attempts: ${
                  codeError.message || "Unknown error"
                }`
              );
            }

            // For other errors, wait and retry
            console.log(
              `Contract check error (attempt ${retries}/${maxRetries}):`,
              codeError.message
            );
            await new Promise((resolve) => setTimeout(resolve, 1500 * retries));
          }
        }

        if (!code || code === "0x" || code === "0x0") {
          throw new Error(
            `Token contract not found at ${tokenAddress} on Mantle Sepolia. ` +
              `Please ensure mock tokens are deployed at this address.`
          );
        }

        // Create signer and contract instance
        const signer = await provider.getSigner();
        const tokenContract = new ethers.Contract(
          tokenAddress,
          IERC20_ABI,
          signer
        );

        // Always request approval (safe even if already approved)
        // The allowance check was failing due to RPC/decoding issues,
        // but approving is safe and will work even if already approved
        const userAddress = await signer.getAddress();
        console.log(
          `Requesting approval for ${currencyInfo.symbol} from ${userAddress}...`
        );

        try {
          const approveTx = await tokenContract.approve(
            gameManagerConfig.address,
            ethers.MaxUint256 // Approve max for better UX (safe even if already approved)
          );
          console.log(`Approval transaction submitted: ${approveTx.hash}`);

          const receipt = await approveTx.wait();
          if (!receipt) {
            throw new Error("Approval transaction receipt not found");
          }
          console.log(`Approval confirmed in block: ${receipt.blockNumber}`);
        } catch (approveError) {
          console.error(`Error during approval transaction:`, approveError);

          // Check if error is because allowance is already sufficient
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error = approveError as any;
          if (error.code === "ACTION_REJECTED" || error.code === 4001) {
            throw new Error(
              "Approval was rejected. Please approve to continue."
            );
          }

          const errorMsg =
            approveError instanceof Error
              ? approveError.message
              : "Unknown error";
          throw new Error(
            `Failed to approve ${currencyInfo.symbol}: ${errorMsg}`
          );
        }

        return true;
      } catch (err) {
        console.error("Error approving token:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        throw new Error(`Token approval failed: ${message}`);
      }
    },
    [getSigner]
  );

  // Create game
  const createGame = useCallback(
    async (params: CreateGameParams): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { currency, entryFee, maxPlayers } = params;
        const signer = await getSigner();
        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          signer
        );

        const currencyInfo = CURRENCY_INFO[currency];

        if (entryFee < 0.001) {
          throw new Error("Entry fee must be at least 0.001 tokens");
        }

        if (maxPlayers < 4 || maxPlayers > 20) {
          throw new Error("Max players must be between 4 and 20");
        }

        // Convert entry fee to token units (for balance check and approval)
        const entryFeeTokenUnits = ethers.parseUnits(
          entryFee.toString(),
          currencyInfo.decimals
        );

        // Convert entry fee to 18 decimals (wei) for contract validation
        // The contract expects entry fees in 18-decimal format regardless of token decimals
        const entryFeeWei = ethers.parseUnits(entryFee.toString(), 18);

        // Check and approve token if needed (for ERC20 tokens)
        // Approval must be in token's native decimals
        if (currency !== Currency.MNT) {
          await checkAndApproveToken(currency, entryFee);
        }

        // Check balance
        const balance = await getTokenBalance(currency);
        if (parseFloat(balance) < entryFee) {
          throw new Error(
            `Insufficient balance. You have ${balance} ${currencyInfo.symbol}, but need ${entryFee} ${currencyInfo.symbol}`
          );
        }

        // Use provided name or default
        const gameName = params.name || "Quick Play Game";

        let tx: ethers.ContractTransactionResponse;

        // Call the appropriate create function based on currency
        // Note: Contract expects entryFee in 18-decimal format for validation,
        // but the actual transfer will use the token's native decimals internally
        if (currency === Currency.MNT) {
          // Native MNT - use createQuickPlayGame
          // For MNT, entryFeeWei and entryFeeTokenUnits are the same (both 18 decimals)
          tx = await gameManager.createQuickPlayGame(
            gameName,
            entryFeeWei,
            maxPlayers,
            {
              value: entryFeeTokenUnits, // msg.value must be in wei (18 decimals)
            }
          );
        } else if (currency === Currency.USDT0) {
          // USDT0 - use createQuickPlayGameUSDT0
          // Contract expects entryFee in 18 decimals for validation (MIN_ENTRY_FEE check)
          // But will transfer entryFeeTokenUnits (6 decimals) from the user's wallet
          tx = await gameManager.createQuickPlayGameUSDT0(
            gameName,
            entryFeeWei, // 18 decimals for validation
            maxPlayers
          );
        } else if (currency === Currency.METH) {
          // mETH - use createQuickPlayGameMETH
          // mETH has 18 decimals, so entryFeeWei and entryFeeTokenUnits are the same
          tx = await gameManager.createQuickPlayGameMETH(
            gameName,
            entryFeeWei,
            maxPlayers
          );
        } else {
          throw new Error(`Unsupported currency: ${currency}`);
        }

        console.log("Transaction submitted:", tx.hash);

        // Wait for transaction confirmation
        const receipt = await tx.wait();

        if (!receipt) {
          throw new Error("Transaction receipt not found");
        }

        console.log("Transaction confirmed:", receipt);

        // Extract gameId from event
        const gameCreatedEvent = receipt.logs.find((log: ethers.Log) => {
          try {
            const parsedLog = gameManager.interface.parseLog(log);
            return parsedLog && parsedLog.name === "GameCreated";
          } catch {
            return false;
          }
        });

        if (gameCreatedEvent) {
          const parsedEvent = gameManager.interface.parseLog(gameCreatedEvent);
          if (parsedEvent && parsedEvent.args) {
            const gameId = parsedEvent.args.gameId.toString();
            console.log("Game created with ID:", gameId);
            return gameId;
          }
        }
        console.warn(
          "GameCreated event not found in receipt. Transaction succeeded but gameId could not be extracted."
        );
        return "pending";
      } catch (err) {
        console.error("Error creating game:", err);
        const errorMessage =
          (err instanceof Error && (err as { reason?: string }).reason) ||
          (err instanceof Error ? err.message : null) ||
          "Failed to create game";
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner, checkAndApproveToken, getTokenBalance]
  );

  // Stake as creator
  const stakeAsCreator = useCallback(
    async (amount: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const signer = await getSigner();
        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          signer
        );

        const addresses = getContractAddresses();
        const currencyInfo = CURRENCY_INFO[Currency.USDT0];

        // Convert amount to token units (6 decimals for USDT0)
        const amountTokenUnits = ethers.parseUnits(
          amount.toString(),
          currencyInfo.decimals
        );

        // Check and approve USDT0 if needed
        const approved = await checkAndApproveToken(Currency.USDT0, amount);
        if (!approved) {
          throw new Error("Token approval failed or was rejected.");
        }

        // Check balance
        const balance = await getTokenBalance(Currency.USDT0);
        if (parseFloat(balance) < amount) {
          throw new Error(
            `Insufficient balance. You have ${balance} USDT0, but need ${amount} USDT0`
          );
        }

        // Call stakeAsCreator function (using function call instead of method)
        const tx = await gameManager["stakeAsCreator(uint256)"](amountTokenUnits);
        console.log("Stake transaction submitted:", tx.hash);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log("Stake transaction confirmed:", receipt);

        return true;
      } catch (err) {
        console.error("Error staking as creator:", err);
        const errorMessage =
          (err instanceof Error && (err as { reason?: string }).reason) ||
          (err instanceof Error ? err.message : null) ||
          "Failed to stake";
        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner, checkAndApproveToken, getTokenBalance]
  );

  // Unstake creator
  const unstakeCreator = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const signer = await getSigner();
      const gameManagerConfig = getContractConfig("GameManager");
      const gameManager = new ethers.Contract(
        gameManagerConfig.address,
        gameManagerConfig.abi,
        signer
      );

      // Call unstakeCreator function
      const tx = await gameManager.unstakeCreator();
      console.log("Unstake transaction submitted:", tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Unstake transaction confirmed:", receipt);

      return true;
    } catch (err) {
      console.error("Error unstaking:", err);
      const errorMessage =
        (err instanceof Error && (err as { reason?: string }).reason) ||
        (err instanceof Error ? err.message : null) ||
        "Failed to unstake";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getSigner]);

  // Get creator stake info
  const getCreatorStake = useCallback(async (): Promise<CreatorStakeInfo | null> => {
    try {
      const signer = await getSigner();
      const gameManagerConfig = getContractConfig("GameManager");
      const gameManager = new ethers.Contract(
        gameManagerConfig.address,
        gameManagerConfig.abi,
        signer
      );

      const userAddress = await signer.getAddress();
      const currencyInfo = CURRENCY_INFO[Currency.USDT0];

      // Call getCreatorStake function
      const stakeInfo = await gameManager.getCreatorStake(userAddress);
      
      const stakedAmount = ethers.formatUnits(stakeInfo[0], currencyInfo.decimals);
      const yieldAccumulated = ethers.formatUnits(stakeInfo[1], currencyInfo.decimals);
      const timestamp = Number(stakeInfo[2]);
      const activeGamesCount = Number(stakeInfo[3]);
      const hasStaked = stakeInfo[4];

      return {
        stakedAmount,
        yieldAccumulated,
        timestamp,
        activeGamesCount,
        hasStaked,
      };
    } catch (err) {
      console.error("Error getting creator stake:", err);
      return null;
    }
  }, [getSigner]);

  return {
    createGame,
    isLoading,
    error,
    checkAndApproveToken,
    getTokenBalance,
    stakeAsCreator,
    unstakeCreator,
    getCreatorStake,
  };
}
