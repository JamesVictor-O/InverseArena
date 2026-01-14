"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { getContractConfig } from "@/lib/contracts-client";
import { Currency, CURRENCY_INFO, Choice } from "@/lib/contract-types";
import { getContractAddresses } from "@/lib/contracts";
import {
  requestMantleSepoliaNetwork,
  isMantleSepolia,
  MANTLE_SEPOLIA,
} from "@/lib/network";

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

interface PlayerInfo {
  isPlaying: boolean;
  hasMadeChoice: boolean;
  choice?: Choice;
  eliminated: boolean;
  roundEliminated?: number;
  entryAmount: string;
}

interface RoundInfo {
  roundNumber: number;
  deadline: number;
  processed: boolean;
  winningChoice?: Choice;
  headCount?: number;
  tailCount?: number;
  survivors?: string[];
  blockchainTimestamp?: number; // Current blockchain timestamp when fetched
}

interface PlayerChoiceInfo {
  address: string;
  choice?: Choice;
  hasMadeChoice: boolean;
  eliminated: boolean;
  roundEliminated?: number;
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
  startGameAfterCountdown: (gameId: string) => Promise<boolean>;
  makeChoice: (gameId: string, choice: Choice) => Promise<boolean>;
  withdrawWinnings: (
    gameId: string,
    leaveInYield?: boolean
  ) => Promise<boolean>;
  getPlayerInfo: (
    gameId: string,
    playerAddress?: string
  ) => Promise<PlayerInfo | null>;
  getRoundInfo: (
    gameId: string,
    roundNumber: number
  ) => Promise<RoundInfo | null>;
  getWinningsWithdrawn: (gameId: string) => Promise<boolean>;
  getAllPlayersChoices: (
    gameId: string,
    roundNumber: number,
    playerList: string[]
  ) => Promise<PlayerChoiceInfo[]>;
  getRoundStatistics: (
    gameId: string,
    roundNumber: number,
    playerList: string[]
  ) => Promise<{ headCount: number; tailCount: number } | null>;
  processRoundTimeout: (gameId: string) => Promise<boolean>;
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
        // IMPORTANT: Contract expects USDT0 entry fees in 6 decimals, not 18!
        // Use explicit decimals to match contract constants
        const entryFeeDecimals = currency === Currency.USDT0 ? 6 : 18;
        const entryFeeTokenUnits = ethers.parseUnits(
          entryFee.toString(),
          entryFeeDecimals
        );

        console.log(
          `Entry fee conversion: ${entryFee} ${
            currencyInfo.symbol
          } -> ${entryFeeTokenUnits.toString()} (using ${entryFeeDecimals} decimals)`
        );

        // Validate entry fee range - use explicit decimals to match contract
        const minEntryFee =
          currency === Currency.USDT0
            ? ethers.parseUnits("1", 6) // MIN_ENTRY_FEE_USDT0 = 1 * 10^6
            : ethers.parseUnits("0.001", 18); // MIN_ENTRY_FEE_METH/MNT = 0.001 ether
        const maxEntryFee =
          currency === Currency.USDT0
            ? ethers.parseUnits("100000", 6) // MAX_ENTRY_FEE_USDT0 = 100000 * 10^6
            : ethers.parseUnits("100", 18); // MAX_ENTRY_FEE_METH/MNT = 100 ether

        if (
          entryFeeTokenUnits < minEntryFee ||
          entryFeeTokenUnits > maxEntryFee
        ) {
          throw new Error(
            `Entry fee must be between ${ethers.formatUnits(
              minEntryFee,
              currencyInfo.decimals
            )} and ${ethers.formatUnits(maxEntryFee, currencyInfo.decimals)} ${
              currencyInfo.symbol
            }`
          );
        }
        if (currency !== Currency.MNT) {
          await checkAndApproveToken(currency, entryFee);
        }

        const balance = await getTokenBalance(currency);
        if (parseFloat(balance) < entryFee) {
          throw new Error(
            `Insufficient balance. You have ${balance} ${currencyInfo.symbol}, but need ${entryFee} ${currencyInfo.symbol}`
          );
        }
        const gameName = params.name || "Quick Play Game";

        let tx: ethers.ContractTransactionResponse;
        if (currency === Currency.MNT) {
          tx = await gameManager.createQuickPlayGame(
            gameName,
            entryFeeTokenUnits,
            maxPlayers,
            {
              value: entryFeeTokenUnits,
            }
          );
        } else if (currency === Currency.USDT0) {
          console.log(`Creating USDT0 game:`);
          console.log(`  Entry fee (human readable): ${entryFee} USDT0`);
          console.log(`  Currency decimals: ${currencyInfo.decimals}`);
          console.log(
            `  Entry fee token units (6 decimals): ${entryFeeTokenUnits.toString()}`
          );
          console.log(
            `  Should be: ${entryFee * 10 ** 6} (${entryFee} * 10^6)`
          );
          console.log(`  Max players: ${maxPlayers}`);

          const expectedValue = BigInt(Math.floor(entryFee * 10 ** 6));
          if (entryFeeTokenUnits !== expectedValue) {
            console.error(
              `WARNING: Entry fee conversion mismatch! Expected ${expectedValue}, got ${entryFeeTokenUnits}`
            );
            throw new Error(
              `Entry fee conversion error. Expected ${expectedValue} (6 decimals), got ${entryFeeTokenUnits}`
            );
          }

          tx = await gameManager.createQuickPlayGameUSDT0(
            gameName,
            entryFeeTokenUnits,
            maxPlayers
          );
        } else if (currency === Currency.METH) {
          tx = await gameManager.createQuickPlayGameMETH(
            gameName,
            entryFeeTokenUnits,
            maxPlayers
          );
        } else {
          throw new Error(`Unsupported currency: ${currency}`);
        }

        console.log("Transaction submitted:", tx.hash);

        const receipt = await tx.wait();

        if (!receipt) {
          throw new Error("Transaction receipt not found");
        }

        console.log("Transaction confirmed:", receipt);

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

        // Validate minimum stake (30 USDT0 = 30 * 10^6)
        const MIN_STAKE = 30 * 10 ** 6;
        if (amountTokenUnits < BigInt(MIN_STAKE)) {
          throw new Error(
            `Minimum stake is 30 USDT0. You tried to stake ${amount} USDT0.`
          );
        }

        // Check if contract is paused
        try {
          const isPaused = await gameManager.paused();
          if (isPaused) {
            throw new Error(
              "Contract is currently paused. Please try again later."
            );
          }
        } catch (err) {
          console.warn("Could not check pause status:", err);
        }

        // Check balance
        const balance = await getTokenBalance(Currency.USDT0);
        if (parseFloat(balance) < amount) {
          throw new Error(
            `Insufficient balance. You have ${balance} USDT0, but need ${amount} USDT0`
          );
        }

        // Check and approve USDT0 if needed
        const approved = await checkAndApproveToken(Currency.USDT0, amount);
        if (!approved) {
          throw new Error("Token approval failed or was rejected.");
        }

        // Verify approval was set correctly
        const tokenContract = new ethers.Contract(
          addresses.USDT0,
          IERC20_ABI,
          signer
        );
        const userAddress = await signer.getAddress();
        const allowance = await tokenContract.allowance(
          userAddress,
          gameManagerConfig.address
        );

        console.log(
          `Allowance check: ${ethers.formatUnits(
            allowance,
            currencyInfo.decimals
          )} USDT0, Required: ${amount} USDT0`
        );

        if (BigInt(allowance) < BigInt(amountTokenUnits)) {
          throw new Error(
            `Insufficient allowance. Approved: ${ethers.formatUnits(
              allowance,
              currencyInfo.decimals
            )} USDT0, Required: ${amount} USDT0. Please approve more tokens.`
          );
        }

        // Verify GameManager's USDT0 address matches
        const contractUSDT0 = await gameManager.USDT0();
        if (contractUSDT0.toLowerCase() !== addresses.USDT0.toLowerCase()) {
          throw new Error(
            `USDT0 address mismatch. Contract: ${contractUSDT0}, Expected: ${addresses.USDT0}`
          );
        }

        // Check if YieldVault USDT0 protocol is enabled
        try {
          const yieldVaultConfig = getContractConfig("YieldVault");
          const yieldVault = new ethers.Contract(
            yieldVaultConfig.address,
            yieldVaultConfig.abi,
            signer.provider
          );

          // PROTOCOL_USDT0 = 1 (check YieldVault for protocol enum)
          const protocolInfo = await yieldVault.protocols(1); // PROTOCOL_USDT0 = 1
          if (!protocolInfo.enabled) {
            throw new Error(
              "USDT0 protocol is disabled in YieldVault. Please contact the contract owner to enable it."
            );
          }
          console.log("USDT0 protocol is enabled in YieldVault ✓");
          console.log(
            `Protocol info: ${JSON.stringify({
              name: protocolInfo.name,
              enabled: protocolInfo.enabled,
              address: protocolInfo.protocolAddress,
            })}`
          );
        } catch (vaultError: unknown) {
          if (
            vaultError instanceof Error &&
            vaultError.message &&
            vaultError.message.includes("disabled")
          ) {
            throw vaultError;
          }
          console.warn(
            "Could not check YieldVault protocol status:",
            vaultError
          );
        }

        console.log(
          `Calling stakeAsCreator with amount: ${amountTokenUnits.toString()} (${amount} USDT0)`
        );
        console.log(`GameManager address: ${gameManagerConfig.address}`);
        console.log(`USDT0 address: ${addresses.USDT0}`);
        console.log(`Contract USDT0: ${contractUSDT0}`);

        // Estimate gas to catch any revert errors before sending
        let gasEstimate: bigint;
        try {
          console.log("Estimating gas for stakeAsCreator...");
          gasEstimate = await gameManager.stakeAsCreator.estimateGas(
            amountTokenUnits
          );
          console.log(`Gas estimate: ${gasEstimate.toString()}`);
        } catch (gasError: unknown) {
          console.error("Gas estimation failed:", gasError);

          // Try to decode revert reason
          const err = gasError as {
            data?: string;
            reason?: string;
            message?: string;
          };
          if (err.data && err.data !== "0x" && err.data.length > 10) {
            try {
              const errorResult = gameManager.interface.parseError(err.data);
              if (errorResult) {
                throw new Error(`Transaction will fail: ${errorResult.name}`);
              }

              const errorSelector = "0x08c379a0";
              if (err.data.startsWith(errorSelector)) {
                const encoded = err.data.slice(10);
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                  ["string"],
                  "0x" + encoded
                );
                if (decoded[0]) {
                  throw new Error(`Transaction will fail: ${decoded[0]}`);
                }
              }
            } catch (parseErr) {}
          }

          throw new Error(
            `Transaction will fail. Possible reasons: 1) Contract paused, ` +
              `2) Insufficient balance/allowance, 3) Amount < 30 USDT0, ` +
              `4) YieldVault misconfigured. Error: ${
                err.message || err.reason || "Unknown"
              }`
          );
        }

        // Submit transaction with better error handling
        try {
          const tx = await gameManager.stakeAsCreator(amountTokenUnits, {
            gasLimit: gasEstimate + gasEstimate / BigInt(5), // Add 20% buffer
          });
          console.log("Stake transaction submitted:", tx.hash);

          const receipt = await tx.wait();
          if (!receipt) {
            throw new Error("Transaction receipt not found");
          }
          console.log("Stake transaction confirmed:", receipt);

          return true;
        } catch (txError: unknown) {
          console.error("Transaction submission failed:", txError);

          // Handle RPC errors
          const err = txError as {
            code?: number | string;
            message?: string;
            data?: unknown;
          };
          if (err.code === -32603 || err.code === "UNKNOWN_ERROR") {
            throw new Error(
              `RPC Error: ${err.message || "Internal JSON-RPC error"}. ` +
                `The transaction would fail on-chain. Please verify: ` +
                `1) Contract is not paused, 2) Sufficient balance & allowance, ` +
                `3) Minimum stake amount (30 USDT0), 4) YieldVault is configured correctly.`
            );
          }

          throw txError;
        }
      } catch (err) {
        console.error("Error staking as creator:", err);

        // Handle specific error cases
        let errorMessage: string;

        if (err instanceof Error) {
          // Check if it's an RPC error
          if (
            err.message.includes("Internal JSON-RPC error") ||
            err.message.includes("could not coalesce error") ||
            err.message.includes("UNKNOWN_ERROR")
          ) {
            errorMessage =
              "Transaction would fail. Common causes:\n" +
              "• Contract is paused (contact owner)\n" +
              "• Insufficient token balance or allowance\n" +
              "• Amount less than 30 USDT0 minimum\n" +
              "• YieldVault protocol disabled\n\n" +
              `Technical error: ${err.message}`;
          } else {
            const errWithReason = err as unknown as { reason?: string };
            if (errWithReason.reason) {
              errorMessage = errWithReason.reason;
            } else {
              errorMessage = err.message;
            }
          }
        } else {
          errorMessage =
            "Failed to stake. Please try again or check the console for details.";
        }

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
  const getCreatorStake =
    useCallback(async (): Promise<CreatorStakeInfo | null> => {
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

        const stakedAmount = ethers.formatUnits(
          stakeInfo[0],
          currencyInfo.decimals
        );
        const yieldAccumulated = ethers.formatUnits(
          stakeInfo[1],
          currencyInfo.decimals
        );
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

  const startGameAfterCountdown = useCallback(
    async (gameId: string): Promise<boolean> => {
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

        console.log(
          `[useGameManager] Starting game after countdown: ${gameId}`
        );

        // Call startGameAfterCountdown on the contract
        const tx = await gameManager.startGameAfterCountdown(gameId, {
          gasLimit: 500000, // Reasonable gas limit for starting game
        });

        console.log(
          `[useGameManager] Start game transaction submitted: ${tx.hash}`
        );

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log(
          `[useGameManager] Start game confirmed in block: ${receipt?.blockNumber}`
        );

        return true;
      } catch (err) {
        console.error("Error starting game after countdown:", err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = err as any;

        // Try to extract revert reason
        let errorMessage = "Failed to start game";
        if (error.reason) {
          errorMessage = error.reason;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Check for specific error cases
        if (errorMessage.includes("Countdown not expired")) {
          errorMessage = "Countdown has not expired yet";
        } else if (errorMessage.includes("Not enough players")) {
          errorMessage = "Not enough players to start the game";
        } else if (errorMessage.includes("Game not in countdown")) {
          errorMessage = "Game is not in countdown phase";
        }

        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner]
  );

  const makeChoice = useCallback(
    async (gameId: string, choice: Choice): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // Validate inputs
        const gameIdNum = Number(gameId);
        if (isNaN(gameIdNum) || gameIdNum < 0) {
          throw new Error("Invalid game ID");
        }

        if (choice !== Choice.Head && choice !== Choice.Tail) {
          throw new Error("Invalid choice. Must be Head (0) or Tail (1)");
        }

        const signer = await getSigner();
        const provider = signer.provider;
        if (!provider) {
          throw new Error("Provider not available");
        }

        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          signer
        );

        console.log(
          `[useGameManager] Making choice for game ${gameId}: ${
            choice === Choice.Head ? "Head" : "Tail"
          }`
        );

        // Pre-flight checks using blockchain time for accuracy
        try {
          // Get current block for accurate timestamp
          const [game, currentBlock] = await Promise.all([
            gameManager.games(gameIdNum),
            provider.getBlock("latest"),
          ]);

          if (!currentBlock) {
            throw new Error("Failed to get current block");
          }

          const blockchainTimestamp = Number(currentBlock.timestamp);

          // Check game status
          const gameStatus = Number(game.status);
          if (gameStatus !== 2) {
            // 2 = InProgress
            throw new Error("Game not in progress");
          }

          // Check round deadline using blockchain time
          const currentRound = Number(game.currentRound);
          if (currentRound > 0) {
            const round = await gameManager.rounds(gameIdNum, currentRound);
            if (round && round.deadline) {
              const deadline = Number(round.deadline);
              if (blockchainTimestamp >= deadline) {
                throw new Error("Round time expired");
              }
            }
          }
        } catch (checkErr) {
          console.warn("[useGameManager] Pre-flight check failed:", checkErr);
          // Re-throw validation errors
          if (checkErr instanceof Error) {
            throw checkErr;
          }
          // Otherwise continue, let contract validate
        }

        // Convert gameId to BigInt for contract call (ABI expects uint256)
        const gameIdBigInt = BigInt(gameIdNum);
        // Choice is already a number (0 or 1), which matches uint8 enum

        // Call makeChoice on the contract - ABI: makeChoice(uint256 gameId, uint8 choice)
        const tx = await gameManager.makeChoice(gameIdBigInt, choice, {
          gasLimit: 500000, // Set gas limit to prevent estimation issues
        });

        console.log(
          `[useGameManager] Make choice transaction submitted: ${tx.hash}`
        );

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log(
          `[useGameManager] Make choice confirmed in block: ${receipt?.blockNumber}`
        );

        if (!receipt || receipt.status !== 1) {
          // Transaction reverted - try to decode the revert reason
          let revertReason = "Transaction reverted";

          try {
            // Try to simulate the call to get the revert reason
            await gameManager.makeChoice.staticCall(gameIdBigInt, choice);
            // If staticCall succeeds, the revert happened during execution
            revertReason =
              "Transaction reverted during execution (check contract state)";
          } catch (staticCallError: any) {
            // Extract revert reason from static call error
            if (staticCallError.reason) {
              revertReason = staticCallError.reason;
            } else if (staticCallError.data) {
              try {
                // Try to parse as custom error
                const decoded = gameManager.interface.parseError(
                  staticCallError.data
                );
                if (decoded) {
                  revertReason = decoded.name;
                }
              } catch {
                // Try to decode as a revert string (Error(string))
                if (
                  typeof staticCallError.data === "string" &&
                  staticCallError.data.startsWith("0x")
                ) {
                  try {
                    // Error(string) selector is 0x08c379a0, data after that is the string
                    if (staticCallError.data.startsWith("0x08c379a0")) {
                      const reason = ethers.AbiCoder.defaultAbiCoder().decode(
                        ["string"],
                        "0x" + staticCallError.data.slice(10)
                      );
                      if (reason && reason[0]) {
                        revertReason = reason[0];
                      }
                    }
                  } catch {
                    // Ignore decode errors
                  }
                }
              }
            } else if (staticCallError.message) {
              revertReason = staticCallError.message;
            }
          }

          console.error(
            `[useGameManager] Transaction reverted: ${revertReason}`
          );
          throw new Error(revertReason);
        }

        // Verify the ChoiceMade event was emitted
        const choiceMadeEvent = receipt.logs.find((log: ethers.Log) => {
          try {
            const parsed = gameManager.interface.parseLog(log);
            return parsed?.name === "ChoiceMade";
          } catch {
            return false;
          }
        });

        if (choiceMadeEvent) {
          console.log("[useGameManager] ChoiceMade event confirmed");
        }

        return true;
      } catch (err) {
        console.error("Error making choice:", err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = err as any;

        let errorMessage = "Failed to make choice";

        // Extract error message from various error formats
        if (error.reason) {
          errorMessage = error.reason;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }

        // Parse contract revert reasons
        if (error.data) {
          try {
            const gameManagerConfig = getContractConfig("GameManager");
            const tempContract = new ethers.Contract(
              gameManagerConfig.address,
              gameManagerConfig.abi,
              signer.provider || undefined
            );
            const decoded = tempContract.interface.parseError(error.data);
            if (decoded) {
              errorMessage = decoded.name || errorMessage;
            }
          } catch {
            // Ignore parsing errors
          }
        }

        // Map contract errors to user-friendly messages
        const errorLower = errorMessage.toLowerCase();

        if (
          errorLower.includes("round time expired") ||
          errorLower.includes("round expired")
        ) {
          errorMessage =
            "Round time has expired. Please wait for the next round.";
        } else if (
          errorLower.includes("choice already made") ||
          errorLower.includes("already made")
        ) {
          errorMessage = "You have already made your choice for this round.";
        } else if (
          errorLower.includes("already eliminated") ||
          errorLower.includes("eliminated")
        ) {
          errorMessage = "You have been eliminated from this game.";
        } else if (
          errorLower.includes("game not in progress") ||
          errorLower.includes("not in progress")
        ) {
          errorMessage = "Game is not in progress.";
        } else if (
          errorLower.includes("not a player") ||
          errorLower.includes("not a player")
        ) {
          errorMessage = "You are not a player in this game.";
        } else if (errorLower.includes("invalid choice")) {
          errorMessage = "Invalid choice. Must be Head (0) or Tail (1).";
        } else if (
          errorLower.includes("user rejected") ||
          errorLower.includes("user denied")
        ) {
          errorMessage = "Transaction cancelled. Please try again.";
        } else if (errorLower.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas fees.";
        } else if (errorLower.includes("paused")) {
          errorMessage =
            "Contract is currently paused. Please try again later.";
        }

        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner]
  );

  const withdrawWinnings = useCallback(
    async (gameId: string, leaveInYield = false): Promise<boolean> => {
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

        console.log(
          `[useGameManager] Withdrawing winnings for game ${gameId}, leaveInYield: ${leaveInYield}`
        );

        // Call withdrawWinnings on the contract
        const tx = await gameManager.withdrawWinnings(gameId, leaveInYield, {
          gasLimit: 500000,
        });

        console.log(
          `[useGameManager] Withdraw winnings transaction submitted: ${tx.hash}`
        );

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log(
          `[useGameManager] Withdraw winnings confirmed in block: ${receipt?.blockNumber}`
        );

        return true;
      } catch (err) {
        console.error("Error withdrawing winnings:", err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = err as any;

        let errorMessage = "Failed to withdraw winnings";
        if (error.reason) {
          errorMessage = error.reason;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        if (errorMessage.includes("Not the winner")) {
          errorMessage = "You are not the winner of this game";
        } else if (errorMessage.includes("Game not completed")) {
          errorMessage = "Game is not completed yet";
        } else if (errorMessage.includes("Already withdrawn")) {
          errorMessage = "Winnings have already been withdrawn";
        } else if (errorMessage.includes("Yield not yet distributed")) {
          errorMessage = "Yield has not been distributed yet";
        }

        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner]
  );

  const getPlayerInfo = useCallback(
    async (
      gameId: string,
      playerAddress?: string
    ): Promise<PlayerInfo | null> => {
      try {
        const signer = await getSigner();
        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          signer
        );

        const address = playerAddress || (await signer.getAddress());

        const playerInfo = await gameManager.playerInfo(gameId, address);

        return {
          isPlaying: playerInfo[0],
          hasMadeChoice: playerInfo[1],
          choice:
            playerInfo[2] !== undefined ? Number(playerInfo[2]) : undefined,
          eliminated: playerInfo[3],
          roundEliminated:
            playerInfo[4] !== undefined ? Number(playerInfo[4]) : undefined,
          entryAmount: ethers.formatUnits(playerInfo[5] || 0, 18),
        };
      } catch (err) {
        console.error("Error getting player info:", err);
        return null;
      }
    },
    [getSigner]
  );

  const getRoundInfo = useCallback(
    async (gameId: string, roundNumber: number): Promise<RoundInfo | null> => {
      try {
        const signer = await getSigner();
        const provider = signer.provider;
        if (!provider) {
          throw new Error("Provider not available");
        }

        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          signer
        );

        // Fetch round info and current block in parallel
        const [round, currentBlock] = await Promise.all([
          gameManager.rounds(gameId, roundNumber),
          provider.getBlock("latest"),
        ]);

        if (!currentBlock) {
          throw new Error("Failed to get current block");
        }

        const blockchainTimestamp = Number(currentBlock.timestamp);

        const roundInfo: RoundInfo = {
          roundNumber,
          deadline: Number(round.deadline || 0),
          processed: round.processed || false,
          winningChoice:
            round.winningChoice !== undefined
              ? Number(round.winningChoice)
              : undefined,
        };

        // Include blockchain timestamp for accurate time calculation
        if (blockchainTimestamp) {
          roundInfo.blockchainTimestamp = blockchainTimestamp;
        }

        return roundInfo;
      } catch (err) {
        console.error("Error getting round info:", err);
        return null;
      }
    },
    [getSigner]
  );

  const getAllPlayersChoices = useCallback(
    async (
      gameId: string,
      roundNumber: number,
      playerList: string[]
    ): Promise<PlayerChoiceInfo[]> => {
      try {
        const signer = await getSigner();
        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          signer
        );

        const choices: PlayerChoiceInfo[] = [];

        // Fetch player info for each player (includes their choice)
        for (const playerAddress of playerList) {
          try {
            const playerInfoData = await gameManager.getPlayerInfo(
              gameId,
              playerAddress
            );
            choices.push({
              address: playerAddress,
              choice:
                playerInfoData.choice !== undefined
                  ? Number(playerInfoData.choice)
                  : undefined,
              hasMadeChoice: playerInfoData.hasMadeChoice || false,
              eliminated: playerInfoData.eliminated || false,
              roundEliminated:
                playerInfoData.roundEliminated !== undefined
                  ? Number(playerInfoData.roundEliminated)
                  : undefined,
            });
          } catch (err) {
            console.warn(
              `Failed to get player info for ${playerAddress}:`,
              err
            );
          }
        }

        return choices;
      } catch (err) {
        console.error("Error getting all players choices:", err);
        return [];
      }
    },
    [getSigner]
  );

  const getRoundStatistics = useCallback(
    async (
      gameId: string,
      roundNumber: number,
      playerList: string[]
    ): Promise<{ headCount: number; tailCount: number } | null> => {
      try {
        // Calculate statistics by fetching all players' choices
        const playerChoices = await getAllPlayersChoices(
          gameId,
          roundNumber,
          playerList
        );

        let headCount = 0;
        let tailCount = 0;

        for (const player of playerChoices) {
          if (player.choice === Choice.Head) {
            headCount++;
          } else if (player.choice === Choice.Tail) {
            tailCount++;
          }
        }

        return { headCount, tailCount };
      } catch (err) {
        console.error("Error getting round statistics:", err);
        return null;
      }
    },
    [getAllPlayersChoices]
  );

  const processRoundTimeout = useCallback(
    async (gameId: string): Promise<boolean> => {
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

        console.log(
          `[useGameManager] Processing round timeout for game ${gameId}`
        );

        // Call processRoundTimeout on the contract
        const tx = await gameManager.processRoundTimeout(gameId, {
          gasLimit: 500000,
        });

        console.log(
          `[useGameManager] Process round timeout transaction submitted: ${tx.hash}`
        );

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log(
          `[useGameManager] Process round timeout confirmed in block: ${receipt?.blockNumber}`
        );

        return true;
      } catch (err) {
        console.error("Error processing round timeout:", err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = err as any;

        let errorMessage = "Failed to process round timeout";
        if (error.reason) {
          errorMessage = error.reason;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        if (errorMessage.includes("Round not timed out yet")) {
          errorMessage = "Round has not timed out yet";
        } else if (errorMessage.includes("Round already processed")) {
          errorMessage = "Round has already been processed";
        } else if (errorMessage.includes("Game not in progress")) {
          errorMessage = "Game is not in progress";
        } else if (errorMessage.includes("No players remaining")) {
          errorMessage = "No players remaining";
        }

        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getSigner]
  );

  const getWinningsWithdrawn = useCallback(
    async (gameId: string): Promise<boolean> => {
      try {
        const signer = await getSigner();
        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          signer
        );

        const withdrawn = await gameManager.winningsWithdrawn(gameId);
        return withdrawn;
      } catch (err) {
        console.error("Error checking if winnings withdrawn:", err);
        return false;
      }
    },
    [getSigner]
  );

  return {
    createGame,
    isLoading,
    error,
    checkAndApproveToken,
    getTokenBalance,
    stakeAsCreator,
    unstakeCreator,
    getCreatorStake,
    startGameAfterCountdown,
    makeChoice,
    withdrawWinnings,
    getPlayerInfo,
    getRoundInfo,
    getWinningsWithdrawn,
    getAllPlayersChoices,
    getRoundStatistics,
    processRoundTimeout,
  };
}
