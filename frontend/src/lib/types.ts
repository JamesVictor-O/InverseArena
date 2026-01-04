export interface Lobby {
  id: string;
  name: string;
  tag: "FAST" | "POPULAR" | "FILLING";
  prizePool: string;
  currency: "SOL" | "USDT" | "USDC";
  players: number;
  maxPlayers: number;
  startTime: string;
  status: "waiting" | "starting" | "full";
}

export interface Winner {
  address: string;
  amount: string;
  currency: string;
}

export interface Stat {
  label: string;
  value: string;
  color: "primary" | "secondary" | "green";
}
