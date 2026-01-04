import type { Achievement, PlayerProfile, RecentGame } from "./types";

export const MOCK_PROFILE: PlayerProfile = {
  name: "CryptoKing",
  username: "cryptoking_01",
  level: 12,
  rank: "HIGH ROLLER",
  winRate: 68,
  winRateChange: 5,
  totalWins: 42,
  totalGames: 62,
  totalEarned: 1240,
  currency: "MNT",
};

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-blood",
    title: "FIRST BLOOD",
    icon: "sword",
    unlocked: true,
  },
  {
    id: "minority-master",
    title: "MINORITY MASTER",
    icon: "clipboard",
    unlocked: true,
  },
  {
    id: "whale",
    title: "WHALE",
    icon: "whale",
    unlocked: true,
  },
  {
    id: "undefeated",
    title: "UNDEFEATED",
    icon: "shield",
    unlocked: false,
  },
  {
    id: "streak",
    title: "STREAK MASTER",
    icon: "flame",
    unlocked: false,
  },
];

export const MOCK_RECENT_GAMES: RecentGame[] = [
  {
    id: "882",
    gameNumber: 882,
    result: "victory",
    amount: 50,
    currency: "MNT",
    timeAgo: "2h ago",
  },
  {
    id: "880",
    gameNumber: 880,
    result: "eliminated",
    amount: 10,
    currency: "MNT",
    timeAgo: "5h ago",
  },
  {
    id: "875",
    gameNumber: 875,
    result: "victory",
    amount: 120,
    currency: "MNT",
    timeAgo: "1d ago",
  },
  {
    id: "871",
    gameNumber: 871,
    result: "victory",
    amount: 35,
    currency: "MNT",
    timeAgo: "2d ago",
  },
  {
    id: "865",
    gameNumber: 865,
    result: "eliminated",
    amount: 15,
    currency: "MNT",
    timeAgo: "3d ago",
  },
];
