export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  targetId: string;
}

export type BadgeTone = "primary" | "secondary" | "green" | "red" | "gray";

export interface LobbyMode {
  id: "quick" | "scheduled" | "private";
  label: string;
  subtitle: string;
  description: string;
  icon: string;
  badge?: { text: string; tone: BadgeTone };
  actionLabel: string;
  actionTone?: "primary" | "muted";
  disabled?: boolean;
  meta?: Array<{ icon: string; text: string }>;
}

export interface LiveMatch {
  id: string;
  title: string;
  roundLabel: string;
  status: { text: string; tone: BadgeTone };
  players: { current: number; max: number };
  stake: string;
  currency: string;
  action?: { label: string; tone: "primary" | "muted" };
}
