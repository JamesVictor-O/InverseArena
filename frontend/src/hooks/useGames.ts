"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { getContractConfig } from "@/lib/contracts-client";
import {
  Currency,
  CURRENCY_INFO,
  GameStatus,
  GameMode,
} from "@/lib/contract-types";
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
] as const;

export interface GameData {
  gameId: string;
  mode: GameMode;
  status: GameStatus;
  currency: Currency;
  currencyAddress: string;
  entryFee: string;
  maxPlayers: number;
  minPlayers: number;
  startTime: number;
  countdownDeadline?: number;
  currentRound: number;
  creator: string;
  winner?: string;
  totalPrizePool: string;
  yieldAccumulated: string;
  yieldProtocol: number;
  yieldDistributed: boolean;
  name: string;
  playerCount: number;
  currentPlayerCount: number;
  canJoin: boolean;
  isPlayer: boolean;
  isCreator: boolean;
  playerList?: string[];
}

interface UseGamesReturn {
  games: GameData[];
  featuredGames: GameData[];
  activeGames: GameData[];
  isLoading: boolean;
  error: string | null;
  refreshGames: () => Promise<void>;
  fetchGameById: (gameId: string) => Promise<GameData | null>;
  joinGame: (gameId: string, entryFee: string) => Promise<boolean>;
}

const BATCH_SIZE = 20; // Fetch games in batches to avoid RPC limits

export function useGames(walletAddress?: string): UseGamesReturn {
  const [games, setGames] = useState<GameData[]>([]);
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
    }

    return await provider.getSigner();
  }, []);

  // Fetch all games from the contract
  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.mantle.xyz"
      );
      const gameManagerConfig = getContractConfig("GameManager");
      const gameManager = new ethers.Contract(
        gameManagerConfig.address,
        gameManagerConfig.abi,
        provider
      );

      // Get total games count from stats
      const stats = await gameManager.stats();
      const totalGames = Number(stats.totalGames);

      if (totalGames === 0) {
        setGames([]);
        setIsLoading(false);
        return;
      }

      console.log(`Fetching ${totalGames} games...`);

      // Fetch games in batches
      // Start from the most recent games (highest IDs) and work backwards
      const gamePromises: Promise<GameData | null>[] = [];
      const batchCount = 5; // Fetch last N batches
      const startGameId = Math.max(0, totalGames - BATCH_SIZE * batchCount); // Fetch last N batches
      const endGameId = Math.max(1, totalGames); // At least check game ID 0

      for (let gameId = startGameId; gameId < endGameId; gameId++) {
        gamePromises.push(
          (async (): Promise<GameData | null> => {
            try {
              // Check if game exists by calling getGame
              // Note: getGame throws if game doesn't exist due to validGame modifier
              const gameData = await gameManager.getGame(gameId);

              // Handle tuple return from contract (getGame returns multiple values)
              // Contract returns: (uint256 gameId_, GameMode mode, GameStatus status, Currency currency, ...)
              const returnedGameId =
                gameData.gameId_?.toString() ||
                gameData[0]?.toString() ||
                gameId.toString();

              // Verify gameId matches (should always match if game exists)
              if (returnedGameId !== gameId.toString()) {
                console.warn(
                  `Game ID mismatch: expected ${gameId}, got ${returnedGameId}`
                );
                return null;
              }

              // Get players list
              let playerList: string[] = [];
              try {
                const players = await gameManager.getGamePlayers(gameId);
                // Handle both array and tuple return formats
                if (Array.isArray(players)) {
                  playerList = players.filter(
                    (addr) => addr && addr !== ethers.ZeroAddress
                  );
                } else if (players && typeof players === "object") {
                  // Might be a tuple-like object
                  playerList = Object.values(players).filter(
                    (addr) =>
                      addr &&
                      typeof addr === "string" &&
                      addr !== ethers.ZeroAddress
                  ) as string[];
                }
                console.log(
                  `Fetched ${playerList.length} players for game ${gameId}:`,
                  playerList
                );
              } catch (err) {
                console.warn(
                  `Failed to fetch players for game ${gameId}:`,
                  err
                );
                // Game might not have players yet
              }

              // Check if current user is a player
              let isPlayer = false;
              if (walletAddress) {
                try {
                  const playerInfo = await gameManager.getPlayerInfo(
                    gameId,
                    walletAddress
                  );
                  isPlayer = playerInfo.isPlaying || false;
                } catch {
                  isPlayer = false;
                }
              }

              // Handle both tuple and object return formats
              const currency = Number(
                gameData.currency !== undefined
                  ? gameData.currency
                  : gameData[3]
              ) as Currency;
              const currencyInfo = CURRENCY_INFO[currency];
              const status = Number(
                gameData.status !== undefined ? gameData.status : gameData[2]
              ) as GameStatus;
              const mode = Number(
                gameData.mode !== undefined ? gameData.mode : gameData[1]
              ) as GameMode;

              const entryFee =
                gameData.entryFee !== undefined
                  ? gameData.entryFee
                  : gameData[4];
              const maxPlayers =
                gameData.maxPlayers !== undefined
                  ? gameData.maxPlayers
                  : gameData[5];
              const currentRound =
                gameData.currentRound !== undefined
                  ? gameData.currentRound
                  : gameData[6];
              const winner =
                gameData.winner !== undefined ? gameData.winner : gameData[7];
              const totalPrizePool =
                gameData.totalPrizePool !== undefined
                  ? gameData.totalPrizePool
                  : gameData[8];
              const yieldAccumulated =
                gameData.yieldAccumulated !== undefined
                  ? gameData.yieldAccumulated
                  : gameData[9];
              const playerCount =
                gameData.playerCount !== undefined
                  ? gameData.playerCount
                  : gameData[10];
              const gameName =
                gameData.gameName !== undefined
                  ? gameData.gameName
                  : gameData[11] || "";
              const creator = gameData.creator || "";
              const currencyAddress = gameData.currencyAddress || "";

              // Calculate entry fee in human-readable format
              const entryFeeDecimals = currency === Currency.USDT0 ? 6 : 18;
              const entryFeeFormatted = ethers.formatUnits(
                entryFee,
                entryFeeDecimals
              );

              // Determine if user can join
              const canJoin =
                status === GameStatus.Waiting ||
                status === GameStatus.Countdown;
              // Note: isCreator will be recalculated after fetching actualCreator from games mapping

              // Check countdown deadline if in countdown status
              let countdownDeadline: number | undefined;
              if (status === GameStatus.Countdown) {
                try {
                  const countdownRemaining =
                    await gameManager.getCountdownTimeRemaining(gameId);
                  const currentTime = Math.floor(Date.now() / 1000);
                  countdownDeadline = currentTime + Number(countdownRemaining);
                } catch {
                  // Could not fetch countdown
                }
              }

              // Get additional data from games mapping (creator, startTime)
              let actualCreator = creator;
              let startTime = 0;
              try {
                const gameStruct = await gameManager.games(gameId);
                actualCreator = gameStruct.creator || creator || "";
                // Handle different return formats
                if (!actualCreator || actualCreator === "") {
                  // Try accessing as array index or property
                  actualCreator =
                    gameStruct[0] || gameStruct.creator || creator || "";
                }
                startTime = Number(gameStruct.startTime || 0);
                console.log(
                  `[fetchGames] Creator for game ${gameId}:`,
                  actualCreator
                );
              } catch (err) {
                console.warn(
                  `[fetchGames] Failed to fetch games mapping for game ${gameId}:`,
                  err
                );
                // Could not fetch from games mapping, use creator from gameData if available
                if (!actualCreator) {
                  // Try to extract creator from gameData if available
                  actualCreator = creator || "";
                }
              }

              return {
                gameId: returnedGameId,
                mode,
                status,
                currency,
                currencyAddress,
                entryFee: entryFeeFormatted,
                maxPlayers: Number(maxPlayers),
                minPlayers: 4, // Default min players
                startTime,
                countdownDeadline,
                currentRound: Number(currentRound || 0),
                creator: actualCreator,
                winner:
                  winner && winner !== ethers.ZeroAddress ? winner : undefined,
                totalPrizePool: ethers.formatUnits(
                  totalPrizePool || 0,
                  entryFeeDecimals
                ),
                yieldAccumulated: ethers.formatUnits(
                  yieldAccumulated || 0,
                  entryFeeDecimals
                ),
                yieldProtocol: 0, // Not returned by getGame, would need to fetch from games mapping
                yieldDistributed: false, // Not returned by getGame, would need to fetch from games mapping
                name: gameName || `Game #${gameId}`,
                playerCount: Number(playerCount || playerList.length),
                currentPlayerCount: playerList.length,
                canJoin,
                isPlayer,
                isCreator:
                  actualCreator && walletAddress
                    ? actualCreator.toLowerCase() ===
                      walletAddress.toLowerCase()
                    : false,
                playerList: playerList || [], // Add playerList to the returned object
              };
            } catch (err) {
              // Game doesn't exist or error fetching - skip it
              console.warn(`Failed to fetch game ${gameId}:`, err);
              return null;
            }
          })()
        );
      }

      // Wait for all promises and filter out nulls
      const results = await Promise.all(gamePromises);
      const validGames = results.filter(
        (game): game is GameData => game !== null
      );

      // Sort by gameId descending (newest first)
      validGames.sort((a, b) => Number(b.gameId) - Number(a.gameId));

      console.log(`Loaded ${validGames.length} games`);
      setGames(validGames);
    } catch (err) {
      console.error("Error fetching games:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch games");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Fetch a single game by ID
  const fetchGameById = useCallback(
    async (gameId: string): Promise<GameData | null> => {
      try {
        // Validate gameId before processing
        if (
          !gameId ||
          gameId === "undefined" ||
          gameId === "null" ||
          String(gameId).trim() === ""
        ) {
          console.error(`Invalid game ID: ${gameId}`);
          return null;
        }

        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.mantle.xyz"
        );
        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          provider
        );

        const gameIdNum = Number(gameId);
        if (isNaN(gameIdNum) || gameIdNum < 0) {
          console.error(`Invalid game ID (not a valid number): ${gameId}`);
          return null;
        }

        // Fetch the specific game
        const gameData = await gameManager.getGame(gameIdNum);

        // Handle tuple return from contract (same logic as in fetchGames)
        const returnedGameId =
          gameData.gameId_?.toString() || gameData[0]?.toString() || gameId;

        // Get player list
        let playerList: string[] = [];
        try {
          const players = await gameManager.getGamePlayers(gameIdNum);
          // Handle both array and tuple return formats
          if (Array.isArray(players)) {
            playerList = players.filter(
              (addr) => addr && addr !== ethers.ZeroAddress
            );
          } else if (players && typeof players === "object") {
            // Might be a tuple-like object
            playerList = Object.values(players).filter(
              (addr) =>
                addr && typeof addr === "string" && addr !== ethers.ZeroAddress
            ) as string[];
          }
          console.log(
            `[fetchGameById] Fetched ${playerList.length} players for game ${gameIdNum}:`,
            playerList
          );
        } catch (err) {
          console.warn(
            `[fetchGameById] Failed to fetch players for game ${gameIdNum}:`,
            err
          );
          // If getGamePlayers fails, playerList stays empty
        }

        // Extract game data
        const currency = Number(
          gameData.currency !== undefined ? gameData.currency : gameData[3]
        ) as Currency;
        const status = Number(
          gameData.status !== undefined ? gameData.status : gameData[2]
        ) as GameStatus;
        const mode = Number(
          gameData.mode !== undefined ? gameData.mode : gameData[1]
        ) as GameMode;

        const entryFee =
          gameData.entryFee !== undefined ? gameData.entryFee : gameData[4];
        const maxPlayers =
          gameData.maxPlayers !== undefined ? gameData.maxPlayers : gameData[5];
        const currentRound =
          gameData.currentRound !== undefined
            ? gameData.currentRound
            : gameData[6];
        const winner =
          gameData.winner !== undefined ? gameData.winner : gameData[7];
        const totalPrizePool =
          gameData.totalPrizePool !== undefined
            ? gameData.totalPrizePool
            : gameData[8];
        const yieldAccumulated =
          gameData.yieldAccumulated !== undefined
            ? gameData.yieldAccumulated
            : gameData[9];
        const playerCount =
          gameData.playerCount !== undefined
            ? gameData.playerCount
            : gameData[10];
        const gameName =
          gameData.gameName !== undefined
            ? gameData.gameName
            : gameData[11] || "";

        const entryFeeDecimals = currency === Currency.USDT0 ? 6 : 18;
        const entryFeeFormatted = ethers.formatUnits(
          entryFee,
          entryFeeDecimals
        );

        // Get additional data from games mapping
        let creator = "";
        let startTime = 0;
        let countdownDeadline: number | undefined;

        try {
          const gameStruct = await gameManager.games(gameIdNum);
          creator = gameStruct.creator || "";
          // Handle different return formats
          if (!creator || creator === "") {
            // Try accessing as array index or property
            creator = gameStruct[0] || gameStruct.creator || "";
          }
          startTime = gameStruct.startTime ? Number(gameStruct.startTime) : 0;
          console.log(
            `[fetchGameById] Creator for game ${gameIdNum}:`,
            creator
          );

          // Check countdown if in countdown status
          if (status === GameStatus.Countdown) {
            try {
              const countdownRemaining =
                await gameManager.getCountdownTimeRemaining(gameIdNum);
              const currentTime = Math.floor(Date.now() / 1000);
              countdownDeadline = currentTime + Number(countdownRemaining);
            } catch {
              // Could not fetch countdown
            }
          }
        } catch {
          // Could not fetch from games mapping
        }

        // Determine if user can join and if they're a player/creator
        const canJoin =
          status === GameStatus.Waiting || status === GameStatus.Countdown;
        const isPlayer = walletAddress
          ? playerList.some(
              (addr) => addr.toLowerCase() === walletAddress.toLowerCase()
            )
          : false;
        const isCreator = walletAddress
          ? creator.toLowerCase() === walletAddress.toLowerCase()
          : false;

        const game: GameData = {
          gameId: returnedGameId,
          mode,
          status,
          currency,
          currencyAddress:
            currency === Currency.USDT0
              ? getContractAddresses().USDT0
              : getContractAddresses().METH,
          entryFee: entryFeeFormatted,
          maxPlayers: Number(maxPlayers),
          minPlayers: 4,
          startTime,
          countdownDeadline,
          currentRound: Number(currentRound || 0),
          creator,
          winner: winner && winner !== ethers.ZeroAddress ? winner : undefined,
          totalPrizePool: ethers.formatUnits(
            totalPrizePool || 0,
            entryFeeDecimals
          ),
          yieldAccumulated: ethers.formatUnits(
            yieldAccumulated || 0,
            entryFeeDecimals
          ),
          yieldProtocol: 0,
          yieldDistributed: false,
          name: gameName || `Game #${gameId}`,
          playerCount: Number(playerCount || playerList.length),
          currentPlayerCount: playerList.length,
          canJoin,
          isPlayer,
          isCreator,
          playerList: playerList || [],
        };

        return game;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Failed to fetch game ${gameId}:`, err);
        if (
          errorMessage?.includes("Game does not exist") ||
          errorMessage?.includes("Invalid game") ||
          errorMessage?.includes("validGame")
        ) {
          return null;
        }
        return null;
      }
    },
    [walletAddress]
  );

  // Join a game
  const joinGame = useCallback(
    async (gameId: string, entryFee: string): Promise<boolean> => {
      setError(null);

      try {
        const signer = await getSigner();
        const gameManagerConfig = getContractConfig("GameManager");
        const gameManager = new ethers.Contract(
          gameManagerConfig.address,
          gameManagerConfig.abi,
          signer
        );

        // Find the game to get currency and entry fee details
        const game = games.find((g) => g.gameId === gameId);
        if (!game) {
          throw new Error("Game not found");
        }

        const currencyInfo = CURRENCY_INFO[game.currency];

        // Convert entry fee to token units (use correct decimals)
        const entryFeeDecimals = game.currency === Currency.USDT0 ? 6 : 18;
        const entryFeeTokenUnits = ethers.parseUnits(
          entryFee,
          entryFeeDecimals
        );

        // Check if we need to approve tokens (for ERC20 tokens)
        if (game.currency !== Currency.MNT) {
          const addresses = getContractAddresses();
          const tokenAddress =
            game.currency === Currency.USDT0 ? addresses.USDT0 : addresses.METH;

          const tokenContract = new ethers.Contract(
            tokenAddress,
            IERC20_ABI,
            signer
          );

          // Check current allowance
          const userAddress = await signer.getAddress();
          const currentAllowance = await tokenContract.allowance(
            userAddress,
            gameManagerConfig.address
          );

          if (BigInt(currentAllowance) < BigInt(entryFeeTokenUnits)) {
            // Need to approve
            console.log(`Approving ${entryFee} ${currencyInfo.symbol}...`);
            const approveTx = await tokenContract.approve(
              gameManagerConfig.address,
              ethers.MaxUint256 // Approve max for convenience
            );
            await approveTx.wait();
            console.log("Token approval confirmed");
          }
        }

        // Call joinGame
        let tx: ethers.ContractTransactionResponse;
        if (game.currency === Currency.MNT) {
          // Native MNT - send with value
          tx = await gameManager.joinGame(gameId, {
            value: entryFeeTokenUnits,
          });
        } else {
          // ERC20 token - no value needed (tokens transferred via safeTransferFrom)
          tx = await gameManager.joinGame(gameId);
        }

        console.log("Join transaction submitted:", tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error("Transaction receipt not found");
        }

        console.log("Join transaction confirmed:", receipt);

        // Refresh games to update player count
        await fetchGames();

        return true;
      } catch (err) {
        console.error("Error joining game:", err);
        const errorMessage =
          (err instanceof Error && (err as { reason?: string }).reason) ||
          (err instanceof Error ? err.message : null) ||
          "Failed to join game";
        setError(errorMessage);
        return false;
      }
    },
    [games, getSigner, fetchGames]
  );

  // Refresh games
  const refreshGames = useCallback(async () => {
    await fetchGames();
  }, [fetchGames]);

  // Fetch games on mount and when wallet address changes
  useEffect(() => {
    fetchGames();

    // Set up polling to refresh games every 10 seconds
    const interval = setInterval(() => {
      fetchGames();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchGames]);

  // Filter games by status
  const featuredGames = games.filter(
    (game) =>
      game.status === GameStatus.InProgress ||
      (game.status === GameStatus.Countdown &&
        game.currentPlayerCount >= game.minPlayers)
  );

  const activeGames = games.filter(
    (game) =>
      game.status === GameStatus.Waiting ||
      game.status === GameStatus.Countdown ||
      game.status === GameStatus.InProgress
  );

  return {
    games,
    featuredGames,
    activeGames,
    isLoading,
    error,
    refreshGames,
    fetchGameById,
    joinGame,
  };
}
