import type { LobbyPlayer, WinningsLine } from "./types";

export const QUICK_PLAY_PLAYERS: LobbyPlayer[] = [
  { id: "you", name: "You", status: "ready" },
  { id: "neonfox", name: "NeonFox", status: "ready" },
  { id: "bitblade", name: "BitBlade", status: "ready" },
  { id: "oxsato", name: "0xSato", status: "ready" },
  { id: "cryptok", name: "CryptoK", status: "ready" },
  { id: "hodlg", name: "HodlG", status: "ready" },
  { id: "viper", name: "Viper", status: "ready" },
  { id: "slot1", name: "Waiting…", status: "waiting" },
  { id: "slot2", name: "Waiting…", status: "waiting" },
  { id: "slot3", name: "Waiting…", status: "waiting" },
];

export const VICTORY_WINNINGS: WinningsLine[] = [
  {
    label: "MNT Rewards",
    value: "+ 450.00 MNT",
    icon: "paid",
    accent: "green",
    rightNote: "+12%",
  },
  {
    label: "Yield Boost",
    value: "+ 12.5% APY",
    icon: "trending_up",
    accent: "primary",
  },
  {
    label: "Inverse Tokens",
    value: "+ 1,000 INV",
    icon: "diamond",
    accent: "purple",
  },
];
