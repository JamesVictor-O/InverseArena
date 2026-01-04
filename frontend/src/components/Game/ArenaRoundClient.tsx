"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";

function RingTimer({ seconds }: { seconds: number }) {
  const pct = Math.max(0, Math.min(1, seconds / 15));
  const dash = 2 * Math.PI * 44;
  const offset = dash * (1 - pct);
  return (
    <div className="relative size-28">
      <svg className="absolute inset-0" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(255,0,255,0.9)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] font-black tracking-[0.25em] text-white/50 uppercase">
          Time left
        </div>
        <div className="text-3xl font-black tabular-nums">
          00:{String(seconds).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}

export default function ArenaRoundClient({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = React.useState(15);
  const [choice, setChoice] = React.useState<"head" | "tail" | null>(null);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const choose = (c: "head" | "tail") => {
    if (choice) return;
    setChoice(c);
    // Demo navigation: HEAD -> victory, TAIL -> defeat.
    setTimeout(() => {
      router.push(`/arena/${matchId}/${c === "head" ? "victory" : "defeat"}`);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="mx-auto w-full max-w-md lg:max-w-5xl lg:px-10 lg:py-10">
        <div className="relative overflow-hidden lg:rounded-[32px] lg:border lg:border-white/10 lg:bg-surface/10">
          {/* Top bar */}
          <header className="flex items-center justify-between px-5 pt-10 pb-4 lg:pt-6 lg:pb-6">
            <button
              className="text-white/70 hover:text-white transition-colors"
              onClick={() => router.push("/dashboard")}
              aria-label="Close"
            >
              <Icon name="close" className="text-[24px]" />
            </button>

            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="size-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-xs font-black tracking-widest">ROUND 3 / 10</span>
              <span className="text-xs text-white/60">LIVE</span>
            </div>

            <div className="flex items-center gap-2 bg-surface border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg">
              <div className="flex items-center justify-center size-6 rounded-full bg-primary/20 text-primary">
                <Icon name="account_balance_wallet" className="text-[16px]" />
              </div>
              <span className="text-sm font-bold tracking-wide text-white">0.42 ETH</span>
            </div>
          </header>

          <main className="px-5 pb-10 lg:px-10">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-white/10 bg-surface/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-black">
                  Prize pool
                </div>
                <div className="text-3xl font-black mt-1">15.5 ETH</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-surface/20 p-4 text-right">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-black">
                  Current yield
                </div>
                <div className="text-2xl font-black mt-1 text-primary">+12% APY</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <RingTimer seconds={seconds} />
              <div className="mt-3 text-xs text-white/45">
                Make your choice to survive
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-surface/15 overflow-hidden relative">
                <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-black">
                  42%
                </div>
                <div className="absolute top-4 right-4 size-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                  <Icon name="toggle_on" className="text-[20px]" />
                </div>
                <div className="h-56 lg:h-64 bg-linear-to-b from-white/5 to-transparent" />
                <div className="p-5">
                  <div className="text-2xl font-black tracking-tight">HEAD</div>
                  <button
                    onClick={() => choose("head")}
                    disabled={Boolean(choice)}
                    className={`mt-4 w-full h-12 rounded-2xl font-black tracking-wide ${
                      choice
                        ? "bg-white/5 border border-white/10 text-white/40"
                        : "bg-primary text-background shadow-[0_0_25px_rgba(0,238,255,0.25)]"
                    }`}
                  >
                    CHOOSE
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-surface/15 overflow-hidden relative">
                <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-secondary/15 border border-secondary/25 text-secondary text-xs font-black">
                  58%
                </div>
                <div className="absolute top-4 right-4 size-8 rounded-full bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary">
                  <Icon name="paid" className="text-[18px]" />
                </div>
                <div className="h-56 lg:h-64 bg-linear-to-b from-white/5 to-transparent" />
                <div className="p-5">
                  <div className="text-2xl font-black tracking-tight">TAIL</div>
                  <button
                    onClick={() => choose("tail")}
                    disabled={Boolean(choice)}
                    className={`mt-4 w-full h-12 rounded-2xl font-black tracking-wide ${
                      choice
                        ? "bg-white/5 border border-white/10 text-white/40"
                        : "bg-transparent border border-secondary text-secondary shadow-[0_0_25px_rgba(255,0,255,0.18)]"
                    }`}
                  >
                    CHOOSE
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-surface/20 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black tracking-[0.25em] uppercase text-white/50">
                  Live players (124/500)
                </div>
                <button className="text-xs text-primary font-black">+118</button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className="size-9 rounded-2xl bg-white/5 border border-white/10"
                  />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

