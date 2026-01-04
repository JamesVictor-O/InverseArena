export interface LobbyPlayer {
  id: string;
  name: string;
  status: "ready" | "waiting";
}

export interface WinningsLine {
  label: string;
  value: string;
  icon: string;
  accent?: "primary" | "green" | "purple";
  rightNote?: string;
}

