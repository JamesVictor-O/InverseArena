"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { LOBBY_MODES, LIVE_GAMES, ONBOARDING_STEPS } from "./constants";
import { OnboardingOverlay } from "./OnboardingOverlay";
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
      className={`relative overflow-hidden rounded-3xl border bg-surface/25 backdrop-blur-xl ${primaryGlow}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-70" />
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
                ? "bg-primary text-background hover:bg-[#33f2ff] shadow-[0_0_25px_rgba(0,238,255,0.25)]"
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

function LiveGameRow({ game }: { game: LiveMatch }) {
  const tone =
    game.status.tone === "red"
      ? "bg-red-500/15 border border-red-500/25 text-red-300"
      : game.status.tone === "green"
      ? "bg-green-500/15 border border-green-500/25 text-green-300"
      : "bg-white/5 border border-white/10 text-white/60";

  return (
    <div className="rounded-2xl border border-white/10 bg-surface/20 backdrop-blur-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
          <Icon name="stadia_controller" className="text-[20px]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-black text-sm truncate">{game.title}</div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tone}`}
            >
              {game.roundLabel}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tone}`}
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
          className={`h-10 px-4 rounded-2xl font-black text-xs tracking-wide ${
            game.action.tone === "primary"
              ? "bg-primary text-background shadow-[0_0_15px_rgba(0,238,255,0.2)]"
              : "bg-white/5 border border-white/10 text-white/70"
          }`}
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

export default function DashboardClient() {
  const [tutorialStep, setTutorialStep] = React.useState<number | null>(0);
  const isDesktop = useIsDesktop();
  const router = useRouter();

  const handleNext = () => {
    if (tutorialStep === null) return;
    if (tutorialStep < ONBOARDING_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setTutorialStep(null);
    }
  };

  const handleSkip = () => setTutorialStep(null);

  const handleModeAction = (mode: LobbyMode) => {
    if (mode.id === "quick") {
      router.push("/quick-play/lobby");
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      {/* DESKTOP APP SHELL */}
      {isDesktop ? (
        <div className="min-h-screen flex">
          <aside className="w-72 shrink-0 border-r border-white/5 bg-surface/20 backdrop-blur-xl">
            <div className="h-16 px-6 flex items-center gap-3 border-b border-white/5">
              <div className="size-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,238,255,0.18)]">
                <span className="font-black">N</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-black tracking-tight">
                  INVERSE{" "}
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-accent to-secondary text-glow">
                    ARENA
                  </span>
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                  dashboard
                </div>
              </div>
            </div>

            <nav className="px-3 py-4 space-y-1">
              {[
                { icon: "home", label: "Lobby", active: true },
                { icon: "stadia_controller", label: "Games" },
                { icon: "leaderboard", label: "Rank" },
                { icon: "person", label: "Profile" },
                { icon: "settings", label: "Settings" },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-colors ${
                    item.active
                      ? "bg-white/5 text-primary border border-primary/20"
                      : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Icon
                      name={item.icon}
                      fill={item.active}
                      className="text-[20px]"
                    />
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col">
            {/* Desktop header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-background/60 backdrop-blur-xl sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-black tracking-tight">Dashboard</h1>
                <span className="text-xs text-white/50">
                  Live Round #8492 • Ends in 00:45
                </span>
              </div>

              {/* Wallet Pill - Step 1 Target */}
              <div
                id="wallet-pill"
                className="flex items-center gap-2 bg-surface border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg"
              >
                <div className="flex items-center justify-center size-7 rounded-full bg-primary/20 text-primary">
                  <Icon name="account_balance_wallet" className="text-[18px]" />
                </div>
                <span className="text-sm font-bold tracking-wide text-white">
                  $2,450.00
                </span>
              </div>
            </header>

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
                  <button
                    className="text-xs text-white/60 hover:text-white"
                    onClick={() => setTutorialStep(0)}
                  >
                    Restart onboarding
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  <section className="col-span-7 space-y-4">
                    <ModeCard
                      mode={LOBBY_MODES[0]}
                      isPrimary
                      onAction={handleModeAction}
                    />
                    <ModeCard
                      mode={LOBBY_MODES[1]}
                      onAction={handleModeAction}
                    />
                    <ModeCard
                      mode={LOBBY_MODES[2]}
                      onAction={handleModeAction}
                    />
                  </section>

                  <aside className="col-span-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                        <h3 className="text-lg font-black tracking-tight">
                          Live Games
                        </h3>
                      </div>
                      <button className="text-xs font-black text-primary hover:text-[#33f2ff]">
                        View all
                      </button>
                    </div>

                    <div id="live-games" className="space-y-3">
                      {LIVE_GAMES.map((g) => (
                        <LiveGameRow key={g.id} game={g} />
                      ))}
                    </div>
                  </aside>
                </div>
              </div>
            </main>
          </div>
        </div>
      ) : null}

      {/* MOBILE LAYOUT */}
      {!isDesktop ? (
        <div className="relative h-svh w-full overflow-hidden shadow-2xl font-display">
          {/* HEADER */}
          <header className="flex items-center justify-between px-5 pt-10 pb-4 z-10 relative">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,238,255,0.18)]">
                <Icon name="stadia_controller" className="text-[20px]" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-black tracking-tight">
                  INVERSE{" "}
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-accent to-secondary text-glow">
                    ARENA
                  </span>
                </div>
                <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                  Lobby
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Wallet Pill - Step 1 Target */}
              <div
                id="wallet-pill"
                className="flex items-center gap-2 bg-surface border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg"
              >
                <div className="flex items-center justify-center size-6 rounded-full bg-primary/20 text-primary">
                  <Icon name="account_balance_wallet" className="text-[16px]" />
                </div>
                <span className="text-sm font-bold tracking-wide text-white">
                  1,250 MNT
                </span>
              </div>

              <button className="text-white/70 hover:text-white transition-colors">
                <Icon name="menu" className="text-[26px]" />
              </button>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main
            id="dashboard-scroll"
            className={`${styles.scrollContainer} flex-1 overflow-y-auto px-5 pb-28`}
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
                <button className="text-xs font-black text-primary hover:text-[#33f2ff]">
                  VIEW ALL
                </button>
              </div>

              <div id="live-games" className="space-y-3">
                {LIVE_GAMES.map((g) => (
                  <LiveGameRow key={g.id} game={g} />
                ))}
              </div>
            </div>
          </main>

          {/* BOTTOM NAV */}
          <nav className="absolute bottom-0 w-full bg-[#0a1516]/90 backdrop-blur-xl border-t border-white/5 px-6 py-3 flex justify-between items-end z-10 pb-6">
            <button className="flex flex-col items-center gap-1 text-primary">
              <Icon name="home" fill />
              <span className="text-[10px] font-black tracking-wide uppercase">
                Lobby
              </span>
            </button>

            <button className="flex flex-col items-center gap-1 text-white/45 hover:text-white/70 transition-colors">
              <Icon name="leaderboard" />
              <span className="text-[10px] font-black tracking-wide uppercase">
                Rank
              </span>
            </button>

            <button className="relative -mt-4">
              <div className="size-14 rounded-full bg-primary text-background shadow-[0_0_30px_rgba(0,238,255,0.35)] flex items-center justify-center border border-primary/30">
                <Icon name="play_arrow" fill className="text-[28px]" />
              </div>
            </button>

            <button className="flex flex-col items-center gap-1 text-white/45 hover:text-white/70 transition-colors">
              <Icon name="account_balance_wallet" />
              <span className="text-[10px] font-black tracking-wide uppercase">
                Wallet
              </span>
            </button>

            <button className="flex flex-col items-center gap-1 text-white/45 hover:text-white/70 transition-colors">
              <Icon name="person" />
              <span className="text-[10px] font-black tracking-wide uppercase">
                Profile
              </span>
            </button>
          </nav>
        </div>
      ) : null}

      {/* ONBOARDING OVERLAY (shared) */}
      {tutorialStep !== null && (
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
