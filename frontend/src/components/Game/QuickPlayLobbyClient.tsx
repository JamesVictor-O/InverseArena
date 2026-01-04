"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";
import { Sidebar } from "@/components/Shared/Sidebar";
import { Avatar } from "./Avatar";
import { QUICK_PLAY_PLAYERS } from "./mock";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
      <div
        className="h-full bg-primary shadow-neon"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function QuickPlayLobbyClient() {
  const router = useRouter();
  const maxPlayers = 10;
  const readyPlayers = QUICK_PLAY_PLAYERS.filter((p) => p.status === "ready").length;

  return (
    <Sidebar>
      <div className="min-h-screen bg-background text-white flex flex-col">
        <div className="flex-1 mx-auto w-full max-w-md lg:max-w-5xl lg:px-10 lg:py-10">
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">
          <div className="relative overflow-hidden lg:rounded-[32px] lg:border lg:border-white/10 lg:bg-surface/10">
            {/* Top bar */}
            <header className="flex items-center justify-between px-5 pt-10 pb-4 lg:pt-6 lg:pb-6">
              <button
                className="text-white/70 hover:text-white transition-colors flex items-center gap-2"
                onClick={() => router.push("/dashboard")}
              >
                <Icon name="arrow_back" className="text-[24px]" />
                <span className="text-sm font-black tracking-wide uppercase">
                  Quick Play Lobby
                </span>
              </button>

              <div className="flex items-center gap-2 bg-surface border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg">
                <div className="flex items-center justify-center size-6 rounded-full bg-primary/20 text-primary">
                  <Icon name="account_balance_wallet" className="text-[16px]" />
                </div>
                <span className="text-sm font-bold tracking-wide text-white">
                  240.50
                </span>
              </div>
            </header>

            <main className="px-5 pb-10 lg:px-10">
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                Waiting for opponents…
              </h1>

              <div className="mt-6 flex items-center justify-between text-xs font-black tracking-[0.25em] uppercase text-primary/80">
                <span>Matchmaking Live</span>
                <span className="text-white/70 tracking-normal">
                  {readyPlayers}/{maxPlayers}
                </span>
              </div>

              <div className="mt-3">
                <ProgressBar value={readyPlayers} max={maxPlayers} />
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
                  <span />
                  <span>Est. wait: 00:45</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-3">
                {QUICK_PLAY_PLAYERS.map((p) => (
                  <Avatar
                    key={p.id}
                    name={p.name}
                    status={p.status}
                    size={72}
                    highlight={p.id === "you"}
                  />
                ))}
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-surface/20 backdrop-blur-xl p-6 text-center">
                <div className="text-[11px] font-black tracking-[0.25em] uppercase text-primary/80">
                  Estimated Prize Pool
                </div>
                <div className="mt-3 text-4xl font-black tracking-tight">
                  1,250.45 <span className="text-white/60 text-lg">USDC</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                  <Icon name="water_drop" className="text-[16px]" />
                  Yield accumulating…
                </div>
              </div>

              <div className="mt-8 text-center text-[11px] font-black tracking-[0.25em] uppercase text-white/35">
                Auto-start when full
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-white/60">
                <div className="text-2xl font-black tabular-nums">02</div>
                <div className="text-white/30">:</div>
                <div className="text-2xl font-black tabular-nums">45</div>
              </div>

              <div className="mt-10 space-y-3">
                <button className="w-full h-14 rounded-2xl bg-primary text-background font-black tracking-wide shadow-[0_0_35px_rgba(0,238,255,0.28)] flex items-center justify-center gap-3">
                  <Icon name="share" className="text-[20px]" />
                  INVITE FRIENDS
                </button>
                <button
                  className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black tracking-wide"
                  onClick={() => router.push("/dashboard")}
                >
                  LEAVE LOBBY
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  className="text-xs text-white/40 hover:text-white/70"
                  onClick={() => router.push("/arena/demo")}
                >
                  (Dev) Jump to round screen →
                </button>
              </div>
            </main>
          </div>

          {/* Desktop side panel */}
          <aside className="hidden lg:block">
            <div className="rounded-3xl border border-white/10 bg-surface/20 backdrop-blur-xl p-6 sticky top-10">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <Icon name="bolt" className="text-[20px]" />
                </div>
                <div>
                  <div className="text-sm font-black">Quick Play</div>
                  <div className="text-xs text-white/60">10 MNT entry</div>
                </div>
              </div>

              <div className="mt-6 text-sm text-white/70 leading-relaxed">
                You’re in matchmaking. Invite friends to speed it up, or wait for
                the lobby to fill.
              </div>

              <button
                className="mt-6 w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-black"
                onClick={() => router.push("/dashboard")}
              >
                Back to Lobby
              </button>
            </div>
          </aside>
        </div>
        </div>
      </div>
    </Sidebar>
  );
}

