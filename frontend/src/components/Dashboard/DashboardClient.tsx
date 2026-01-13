"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { LOBBY_MODES, ONBOARDING_STEPS } from "./constants";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { useGames } from "@/hooks/useGames";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { GameStatus, CURRENCY_INFO } from "@/lib/contract-types";
import { Loader2 } from "lucide-react";
import styles from "./dashboard.module.css";
import type { LiveMatch, LobbyMode } from "./types";

function badgeTone(tone: string) {
  switch (tone) {
    case "primary":
      return "bg-primary/15 border border-primary/30 text-primary";
    case "green":
      return "bg-green-500/15 border border-green-500/25 text-green-300";
    case "red":
      return "bg-red-500/15 border border-red-500/25 text-red-300";
    case "secondary":
      return "bg-secondary/15 border border-secondary/30 text-secondary";
    default:
      return "bg-white/5 border border-white/10 text-white/70";
  }
}

function ModeCard({
  mode,
  isPrimary,
  onAction,
}: {
  mode: LobbyMode;
  isPrimary?: boolean;
  onAction?: (mode: LobbyMode) => void;
}) {
  const primaryGlow = isPrimary
    ? "shadow-[0_0_40px_rgba(0,238,255,0.18)] border-primary/30"
    : "border-white/10";

  return (
    <div
      id={mode.id === "quick" ? "mode-quick" : undefined}
      className={`relative overflow-hidden rounded-3xl border bg-surface/25 backdrop-blur-xl`}
    >
     
      <div className="relative p-5 lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {mode.badge ? (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest ${badgeTone(
                    mode.badge.tone
                  )}`}
                >
                  {mode.badge.text}
                </span>
              ) : null}
              <span className="text-[11px] font-black tracking-widest text-primary/90 uppercase">
                {mode.subtitle}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Icon name={mode.icon} className="text-[22px] text-primary" />
              <div className="text-xl lg:text-2xl font-black tracking-tight italic">
                {mode.label}
              </div>
            </div>
          </div>

          <button
            disabled={mode.disabled}
            onClick={() => onAction?.(mode)}
            className={`shrink-0 h-12 px-6 rounded-2xl font-black tracking-wide text-sm transition-all ${
              mode.actionTone === "primary"
                ? "bg-primary text-background hover:bg-[#33f2ff] "
                : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
            } ${mode.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {mode.actionLabel}
          </button>
        </div>

        {mode.meta?.length ? (
          <div className="mt-4 space-y-2 text-sm text-white/70">
            {mode.meta.map((m) => (
              <div key={m.text} className="flex items-center gap-2">
                <Icon name={m.icon} className="text-[18px] text-primary/80" />
                <span className="text-[12px]">{m.text}</span>
              </div>
            ))}
          </div>
        ) : null}

        {mode.id === "private" ? (
          <div className="mt-3 text-[12px] text-white/50">{mode.subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}

function LiveGameRow({ 
  game, 
  onJoin,
  onView 
}: { 
  game: LiveMatch;
  onJoin?: (gameId: string) => void;
  onView?: (gameId: string) => void;
}) {
  const router = useRouter();
  const tone =
    game.status.tone === "red"
      ? "bg-red-500/15 border border-red-500/25 text-red-300"
      : game.status.tone === "green"
      ? "bg-green-500/15 border border-green-500/25 text-green-300"
      : "bg-white/5 border border-white/10 text-white/60";

  const handleClick = () => {
    if (game.action?.tone === "primary" && onJoin) {
      onJoin(game.id);
    } else if (onView) {
      onView(game.id);
    } else {
      router.push(`/dashboard/games/${game.id}`);
    }
  };

  return (
    <div 
      className="rounded-2xl border border-white/10 bg-surface/20 backdrop-blur-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-all cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="size-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
          <Icon name="stadia_controller" className="text-[20px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-black text-sm truncate">{game.title}</div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${tone}`}
            >
              {game.roundLabel}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${tone}`}
            >
              {game.status.text}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-white/55">
            <span className="flex items-center gap-1">
              <Icon name="group" className="text-[16px]" />
              {game.players.current}/{game.players.max}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="paid" className="text-[16px]" />
              {game.stake} {game.currency}
            </span>
          </div>
        </div>
      </div>

      {game.action ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className={`h-10 px-4 rounded-2xl font-black text-xs tracking-wide shrink-0 ${
            game.action.tone === "primary"
              ? "bg-primary text-background shadow-[0_0_15px_rgba(0,238,255,0.2)] hover:bg-primary-hover"
              : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
          } transition-colors`}
        >
          {game.action.label}
        </button>
      ) : null}
    </div>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

const ONBOARDING_STORAGE_KEY = "inverse-arena-onboarding-completed";

export default function DashboardClient() {
  const [tutorialStep, setTutorialStep] = React.useState<number | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = React.useState(true);
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { walletAddress } = useConnectActions();
  const { games, activeGames, isLoading: isLoadingGames, joinGame, refreshGames } = useGames(
    walletAddress || undefined
  );
  const [isJoining, setIsJoining] = React.useState<string | null>(null);

  // Filter and transform games to LiveMatch format
  // Show all active games (InProgress, Countdown, Waiting)
  // Use activeGames from hook which already filters properly
  const liveGames: LiveMatch[] = React.useMemo(() => {
    // Use activeGames from hook which includes all active games
    // Filter out completed/cancelled games (should already be filtered, but double-check)
    const filteredGames = activeGames.filter(
      (game) =>
        game.status !== GameStatus.Completed &&
        game.status !== GameStatus.Cancelled
    );

    // Sort by: InProgress first, then Countdown, then by player count (descending)
    const sorted = filteredGames.sort((a, b) => {
      // InProgress games first
      if (a.status === GameStatus.InProgress && b.status !== GameStatus.InProgress) {
        return -1;
      }
      if (b.status === GameStatus.InProgress && a.status !== GameStatus.InProgress) {
        return 1;
      }
      // Countdown games second
      if (a.status === GameStatus.Countdown && b.status !== GameStatus.Countdown) {
        return -1;
      }
      if (b.status === GameStatus.Countdown && a.status !== GameStatus.Countdown) {
        return 1;
      }
      // Then by player count (descending)
      if (a.status === GameStatus.InProgress && b.status !== GameStatus.InProgress) {
        return -1;
      }
      if (b.status === GameStatus.InProgress && a.status !== GameStatus.InProgress) {
        return 1;
      }
      return b.currentPlayerCount - a.currentPlayerCount;
    });

    // Take top 5 games for the dashboard
    return sorted.slice(0, 5).map((game) => {
      const currencyInfo = CURRENCY_INFO[game.currency];
      
      // Determine status display
      let roundLabel = "";
      let statusText = "";
      let statusTone: "red" | "green" | "gray" = "gray";
      let actionLabel = "👁";
      let actionTone: "primary" | "muted" = "muted";

      if (game.status === GameStatus.InProgress) {
        roundLabel = `ROUND ${game.currentRound}`;
        statusText = "LIVE";
        statusTone = "red";
        actionLabel = "👁";
        actionTone = "muted";
      } else if (game.status === GameStatus.Countdown) {
        roundLabel = "STARTING";
        statusText = "STARTING";
        statusTone = "green";
        if (game.canJoin && !game.isPlayer) {
          actionLabel = "JOIN";
          actionTone = "primary";
        }
      } else if (game.status === GameStatus.Waiting) {
        const fillPct = (game.currentPlayerCount / game.maxPlayers) * 100;
        if (fillPct >= 80) {
          roundLabel = "FILLING";
          statusText = "FILLING FAST";
          statusTone = "green";
          if (game.canJoin && !game.isPlayer) {
            actionLabel = "JOIN";
            actionTone = "primary";
          }
        } else {
          roundLabel = `ROUND 0`;
          statusText = "WAITING";
          statusTone = "gray";
          if (game.canJoin && !game.isPlayer) {
            actionLabel = "JOIN";
            actionTone = "primary";
          }
        }
      }

      return {
        id: game.gameId,
        title: game.name || `Match #${game.gameId}`,
        roundLabel,
        status: { text: statusText, tone: statusTone },
        players: {
          current: game.currentPlayerCount,
          max: game.maxPlayers,
        },
        stake: parseFloat(game.entryFee).toFixed(2),
        currency: currencyInfo.symbol,
        action: {
          label: actionLabel,
          tone: actionTone,
        },
      } as LiveMatch;
    });
  }, [activeGames]);

  // Auto-refresh games every 10 seconds
  React.useEffect(() => {
    if (!walletAddress) return;
    
    const interval = setInterval(() => {
      refreshGames();
    }, 10000);

    return () => clearInterval(interval);
  }, [walletAddress, refreshGames]);

  const handleJoinGame = React.useCallback(
    async (gameId: string) => {
      if (!walletAddress) {
        router.push("/dashboard/games");
        return;
      }

      const game = games.find((g) => g.gameId === gameId);
      if (!game || !game.canJoin || game.isPlayer) {
        router.push(`/dashboard/games/${gameId}`);
        return;
      }

      setIsJoining(gameId);
      try {
        const success = await joinGame(gameId, game.entryFee);
        if (success) {
          router.push(`/dashboard/games/${gameId}`);
        }
      } catch (err) {
        console.error("Failed to join game:", err);
      } finally {
        setIsJoining(null);
      }
    },
    [walletAddress, games, joinGame, router]
  );

  const handleViewGame = React.useCallback(
    (gameId: string) => {
      // Find the game to check its status
      const game = games.find((g) => g.gameId === gameId);
      // For InProgress games where user is a player, route to arena
      if (game?.status === GameStatus.InProgress && game.isPlayer) {
        router.push(`/arena/${gameId}`);
      } else {
        router.push(`/dashboard/games/${gameId}`);
      }
    },
    [router, games]
  );

  // Check if onboarding has been completed on mount
  React.useEffect(() => {
    if (typeof window === "undefined") {
      setIsCheckingOnboarding(false);
      return;
    }

    // Check localStorage to see if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    
    if (!hasCompletedOnboarding) {
      // Small delay to ensure DOM elements are rendered before showing onboarding
      // This ensures the target elements (wallet-pill, mode-quick, live-games) exist
      const timer = setTimeout(() => {
        // Show onboarding for first-time users (Step 1 of 3)
        setTutorialStep(0);
        setIsCheckingOnboarding(false);
      }, 500); // 500ms delay to ensure elements are rendered
      
      return () => clearTimeout(timer);
    } else {
      // User has already completed onboarding, don't show it
      setTutorialStep(null);
      setIsCheckingOnboarding(false);
    }
  }, []);

  const handleNext = () => {
    if (tutorialStep === null) return;
    if (tutorialStep < ONBOARDING_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      // Mark onboarding as completed
      if (typeof window !== "undefined") {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      }
      setTutorialStep(null);
    }
  };

  const handleSkip = () => {
    // Mark onboarding as completed even when skipped
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    }
    setTutorialStep(null);
  };

  const handleModeAction = (mode: LobbyMode) => {
    if (mode.id === "quick") {
      router.push("/dashboard/quick-play/lobby");
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      {isDesktop ? (
        <div className="min-h-screen flex flex-col">
          {/* Desktop content */}
          <main
            id="dashboard-scroll"
            className={`${styles.scrollContainer} flex-1 overflow-y-auto px-8 py-8`}
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="text-xs font-black tracking-[0.25em] text-primary/80 uppercase">
                    Lobby
                  </div>
                  <h2 className="text-3xl font-black tracking-tight mt-2">
                    Choose Your Mode
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6">
                <section className="col-span-7 space-y-4">
                  <ModeCard
                    mode={LOBBY_MODES[0]}
                    isPrimary
                    onAction={handleModeAction}
                  />
                  <ModeCard mode={LOBBY_MODES[1]} onAction={handleModeAction} />
                  <ModeCard mode={LOBBY_MODES[2]} onAction={handleModeAction} />
                </section>

                <aside className="col-span-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                      <h3 className="text-lg font-black tracking-tight">
                        Live Games
                      </h3>
                    </div>
                    <button
                      onClick={() => router.push("/dashboard/games")}
                      className="text-xs font-black text-primary hover:text-[#33f2ff] transition-colors"
                    >
                      View all
                    </button>
                  </div>

                  <div id="live-games" className="space-y-3">
                    {isLoadingGames ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : liveGames.length > 0 ? (
                      liveGames.map((g) => (
                        <LiveGameRow
                          key={g.id}
                          game={g}
                          onJoin={handleJoinGame}
                          onView={handleViewGame}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        <Icon name="games" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No active games</p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </main>
        </div>
      ) : null}
      {!isDesktop ? (
        <div className="relative min-h-screen w-full overflow-hidden shadow-2xl font-display">
          <main
            id="dashboard-scroll"
            className={`${styles.scrollContainer} flex-1 overflow-y-auto px-5 pb-20`}
          >
            <div className="mt-2">
              <div className="text-xs font-black tracking-[0.25em] text-primary/80 uppercase">
                Choose your mode
              </div>
              <div className="mt-4 space-y-4">
                <ModeCard
                  mode={LOBBY_MODES[0]}
                  isPrimary
                  onAction={handleModeAction}
                />
                <ModeCard mode={LOBBY_MODES[1]} onAction={handleModeAction} />
                <ModeCard mode={LOBBY_MODES[2]} onAction={handleModeAction} />
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                  <div className="text-sm font-black tracking-tight">
                    LIVE GAMES
                  </div>
                </div>
                <button
                  onClick={() => router.push("/dashboard/games")}
                  className="text-xs font-black text-primary hover:text-[#33f2ff] transition-colors"
                >
                  VIEW ALL
                </button>
              </div>

              <div id="live-games" className="space-y-3">
                {isLoadingGames ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : liveGames.length > 0 ? (
                  liveGames.map((g) => (
                    <LiveGameRow
                      key={g.id}
                      game={g}
                      onJoin={handleJoinGame}
                      onView={handleViewGame}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <Icon name="games" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No active games</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      ) : null}
      {!isCheckingOnboarding && tutorialStep !== null && (
        <OnboardingOverlay
          step={ONBOARDING_STEPS[tutorialStep]}
          currentStepIndex={tutorialStep}
          totalSteps={ONBOARDING_STEPS.length}
          onNext={handleNext}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
