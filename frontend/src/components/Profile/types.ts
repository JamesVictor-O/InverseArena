export interface PlayerProfile {
  name: string;
  username: string;
  level: number;
  rank: string;
  avatar?: string;
  winRate: number;
  winRateChange: number;
  totalWins: number;
  totalGames: number;
  totalEarned: number;
  currency: string;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
}

export interface RecentGame {
  id: string;
  gameNumber: number;
  result: "victory" | "eliminated";
  amount: number;
  currency: string;
  timeAgo: string;
}
