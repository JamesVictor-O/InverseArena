"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";
import { VICTORY_WINNINGS } from "./mock";

function accentClasses(accent?: string) {
  switch (accent) {
    case "green":
      return "bg-green-500/12 border-green-500/20 text-green-200";
    case "purple":
      return "bg-secondary/12 border-secondary/20 text-secondary";
    default:
      return "bg-primary/12 border-primary/20 text-primary";
  }
}

export default function ResultVictoryClient({ matchId }: { matchId: string }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md lg:max-w-xl rounded-[32px] border border-white/10 bg-surface/15 backdrop-blur-xl overflow-hidden shadow-2xl">
        <header className="flex items-center justify-between px-6 pt-6">
          <button
            className="text-white/60 hover:text-white"
            aria-label="Close"
            onClick={() => router.push("/dashboard")}
          >
            <Icon name="close" className="text-[22px]" />
          </button>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-black tracking-widest">
            <span className="text-green-300">●</span> LIVE
          </div>
          <button className="text-white/60 hover:text-white" aria-label="Share">
            <Icon name="share" className="text-[22px]" />
          </button>
        </header>

        <main className="px-8 pb-8 pt-6 text-center">
          <div className="mx-auto size-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_40px_rgba(0,238,255,0.18)]">
            <Icon name="trophy" className="text-[44px] text-primary" />
          </div>

          <div className="mt-6 text-5xl font-black tracking-tight italic">
            VICTORY!
          </div>
          <div className="mt-3 inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-[0.25em] uppercase">
            You are the one percent
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 overflow-hidden text-left">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black">
                <span className="size-6 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                  <Icon name="paid" className="text-[16px]" />
                </span>
                Your Winnings
              </div>
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-widest">
                MATCH ID: #{matchId.toUpperCase()}
              </div>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {VICTORY_WINNINGS.map((line) => (
                <div
                  key={line.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-10 rounded-2xl border flex items-center justify-center ${accentClasses(
                        line.accent
                      )}`}
                    >
                      <Icon name={line.icon} className="text-[18px]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-white/50 font-black tracking-widest uppercase">
                        {line.label}
                      </div>
                      <div className="text-lg font-black">{line.value}</div>
                    </div>
                  </div>
                  {line.rightNote ? (
                    <div className="text-green-300 text-xs font-black">
                      {line.rightNote}
                    </div>
                  ) : (
                    <div className="text-white/20"> </div>
                  )}
                </div>
              ))}

              <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl border border-white/10 bg-white/5" />
                  <div>
                    <div className="text-[11px] text-primary/80 font-black tracking-widest uppercase">
                      NFT Drop
                    </div>
                    <div className="text-sm font-black">
                      Rare Obsidian Keycard
                    </div>
                  </div>
                </div>
                <Icon
                  name="open_in_new"
                  className="text-[18px] text-white/40"
                />
              </div>
            </div>
          </div>

          <button
            className="mt-7 w-full h-14 rounded-2xl bg-primary text-background font-black tracking-wide shadow-[0_0_35px_rgba(0,238,255,0.28)] flex items-center justify-center gap-3"
            onClick={() => router.push("/dashboard")}
          >
            <Icon name="download" className="text-[20px]" />
            CLAIM WINNINGS
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              className="h-12 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-black tracking-wide"
              onClick={() => router.push("/dashboard")}
            >
              PLAY AGAIN
            </button>
            <button className="h-12 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-black tracking-wide">
              SHARE
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
