import type { LiveMatch, LobbyMode, OnboardingStep } from "./types";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Your Stash",
    description:
      "This is your command center. Top up seamlessly via crypto or card. Your winnings are paid out instantly to this balance after every match.",
    icon: "account_balance_wallet",
    targetId: "wallet-pill",
  },
  {
    id: 2,
    title: "Choose Your Mode",
    description:
      "Jump in fast with Quick Play, schedule a big pool match, or create a private lobby for friends.",
    icon: "gamepad",
    targetId: "mode-quick",
  },
  {
    id: 3,
    title: "Live Games",
    description:
      "Browse active matches and jump into a round instantly when a seat opens up.",
    icon: "whatshot",
    targetId: "live-games",
  },
];

export const LOBBY_MODES: LobbyMode[] = [
  {
    id: "quick",
    label: "QUICK PLAY",
    subtitle: "10 MNT ENTRY",
    description: "Fast matchmaking. Jump in instantly.",
    icon: "bolt",
    badge: { text: "POPULAR", tone: "primary" },
    actionLabel: "PLAY NOW",
    actionTone: "primary",
    meta: [
      { icon: "schedule", text: "<30s wait time" },
      { icon: "group", text: "4–20 Players" },
    ],
  },
  {
    id: "scheduled",
    label: "SCHEDULED",
    subtitle: "25 MNT ENTRY",
    description: "Big pool lobby. Starts soon.",
    icon: "event",
    actionLabel: "REGISTER",
    actionTone: "muted",
    disabled: true,
    meta: [
      { icon: "timer", text: "04:12 until start" },
      { icon: "groups", text: "50+ Players • Big Pool" },
    ],
  },
  {
    id: "private",
    label: "PRIVATE",
    subtitle: "Friends Only • Custom Rules",
    description: "Create a private lobby.",
    icon: "lock",
    actionLabel: "CREATE →",
    actionTone: "muted",
  },
];

export const LIVE_GAMES: LiveMatch[] = [
  {
    id: "8492",
    title: "Match #8492",
    roundLabel: "ROUND 3",
    status: { text: "LIVE", tone: "red" },
    players: { current: 12, max: 20 },
    stake: "400",
    currency: "MNT",
    action: { label: "👁", tone: "muted" },
  },
  {
    id: "4925",
    title: "Match #4925",
    roundLabel: "STARTING",
    status: { text: "STARTING", tone: "green" },
    players: { current: 18, max: 20 },
    stake: "200",
    currency: "MNT",
    action: { label: "JOIN", tone: "primary" },
  },
  {
    id: "4918",
    title: "Match #4918",
    roundLabel: "ROUND 1",
    status: { text: "ROUND 1", tone: "gray" },
    players: { current: 8, max: 10 },
    stake: "100",
    currency: "MNT",
    action: { label: "👁", tone: "muted" },
  },
];
