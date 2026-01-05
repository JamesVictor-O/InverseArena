export type GameStatus = "live" | "upcoming" | "filling" | "open" | "high-stakes";

export interface Game {
  id: string;
  title: string;
  entryFee: string;
  pool: string;
  currency: string;
  playerCount: { current: number; max: number };
  status: GameStatus;
  startTime?: string;
  image?: string;
  featured?: boolean;
  tags?: string[];
}

export type FilterType = "all" | "live" | "high-stakes";
