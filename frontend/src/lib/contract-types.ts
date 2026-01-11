/**
 * Contract-aligned types and constants for Inverse Arena
 * Based on CONTRACT_ARCHITECTURE.md
 */

export enum Currency {
  MNT = 0, // Native Mantle token
  USDT0 = 1, // Mantle's yield-bearing stablecoin (5% APY)
  METH = 2, // Mantle Staked ETH (4% APY)
}

export enum GameMode {
  QuickPlay = 0,
  Scheduled = 1,
  Private = 2,
}

export enum GameStatus {
  Waiting = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
  Countdown = 4, // Countdown started, accepting more players
}

export enum Choice {
  Head = 0,
  Tail = 1,
}

export const CURRENCY_INFO = {
  [Currency.MNT]: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18,
    apy: 0, // Native token, no yield
    protocolName: "Native MNT",
  },
  [Currency.USDT0]: {
    name: "USDT0",
    symbol: "USDT0",
    decimals: 6, // USDT0 uses 6 decimals
    apy: 5, // 5% APY from USDT0 protocol
    protocolName: "USDT0 Protocol",
  },
  [Currency.METH]: {
    name: "mETH",
    symbol: "mETH",
    decimals: 18,
    apy: 4, // 4% APY from mETH protocol
    protocolName: "mETH Protocol",
  },
} as const;

// Contract constants
export const MIN_ENTRY_FEE = 0.001; // 0.001 tokens
export const MAX_ENTRY_FEE = 100; // 100 tokens
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 20;
export const PLATFORM_FEE_BPS = 500; // 5% (500 basis points)
export const MAX_PLATFORM_FEE_BPS = 1000; // 10% max

// Yield protocol IDs (from YieldVault)
export enum YieldProtocol {
  METH = 0, // 4% APY
  USDT0 = 1, // 5% APY
  AAVE = 2, // 6% APY
  ONDO_USDY = 3, // 4.5% APY
}

export interface GameData {
  gameId: string;
  mode: GameMode;
  status: GameStatus;
  currency: Currency;
  currencyAddress: string;
  entryFee: string;
  maxPlayers: number;
  minPlayers: number;
  startTime?: number;
  currentRound: number;
  creator: string;
  winner?: string;
  totalPrizePool: string;
  yieldAccumulated: string;
  yieldProtocol: YieldProtocol;
  yieldDistributed: boolean;
  playerList: string[];
}

export interface PlayerInfo {
  isPlaying: boolean;
  hasMadeChoice: boolean;
  choice?: Choice;
  eliminated: boolean;
  roundEliminated?: number;
  entryAmount: string;
}

export interface YieldBreakdown {
  principal: string;
  yieldGenerated: string;
  currentAPY: number;
  timeElapsed: number; // in seconds
  protocolName: string;
}
