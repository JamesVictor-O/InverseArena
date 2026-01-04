"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";

export default function ResultDefeatClient({ matchId }: { matchId: string }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md lg:max-w-lg rounded-[32px] border border-white/10 bg-surface/15 backdrop-blur-xl overflow-hidden shadow-2xl">
        <header className="flex items-center justify-between px-6 pt-6">
          <button
            className="text-white/60 hover:text-white"
            aria-label="Close"
            onClick={() => router.push("/dashboard")}
          >
            <Icon name="close" className="text-[22px]" />
          </button>
          <div className="text-xs text-white/50 font-black tracking-widest">
            MATCH #{matchId.toUpperCase()}
          </div>
          <div className="w-9" />
        </header>

        <main className="px-8 pb-8 pt-6 text-center">
          <div className="mx-auto size-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Icon name="skull" className="text-[40px] text-white/70" />
          </div>

          <div className="mt-6 text-4xl font-black tracking-tight">
            ELIMINATED
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
            You picked <span className="font-black">UP</span> (Majority Vote).
            <div className="mt-1 text-xs text-red-300 font-black tracking-widest uppercase">
              The minority won
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-black">3</div>
              <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary/80">
                Round reached
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-black">452</div>
              <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary/80">
                Eliminated
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-white/40 italic">
            “Better luck next time, outlier.”
          </div>

          <div className="mt-8 space-y-3">
            <button
              className="w-full h-14 rounded-2xl bg-primary text-background font-black tracking-wide shadow-[0_0_35px_rgba(0,238,255,0.28)] flex items-center justify-center gap-2"
              onClick={() => router.push("/dashboard")}
            >
              <Icon name="replay" className="text-[20px]" />
              PLAY AGAIN
            </button>

            <button
              className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black tracking-wide"
              onClick={() => router.push(`/arena/${matchId}`)}
            >
              Watch remaining rounds
            </button>

            <button
              className="w-full h-12 rounded-2xl text-white/40 hover:text-white/60 font-black tracking-wide"
              onClick={() => router.push("/dashboard")}
            >
              Return Home
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

