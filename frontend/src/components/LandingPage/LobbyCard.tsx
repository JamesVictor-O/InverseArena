import React from "react";
import type { Lobby } from "@/lib/types";

export const LobbyCard: React.FC<{ lobby: Lobby }> = ({ lobby }) => {
  const fillPct =
    lobby.maxPlayers > 0
      ? Math.min(100, (lobby.players / lobby.maxPlayers) * 100)
      : 0;

  const status =
    lobby.status === "starting"
      ? {
          label: "Starting",
          cls: "bg-secondary/15 text-secondary border-secondary/40",
        }
      : lobby.status === "full"
      ? { label: "Full", cls: "bg-white/5 text-gray-300 border-white/10" }
      : {
          label: "Waiting",
          cls: "bg-primary/10 text-primary border-primary/40",
        };

  const tag =
    lobby.tag === "FAST"
      ? { cls: "bg-primary/10 text-primary border-primary/40" }
      : lobby.tag === "POPULAR"
      ? { cls: "bg-secondary/10 text-secondary border-secondary/40" }
      : { cls: "bg-green-500/10 text-green-400 border-green-500/40" };

  return (
    <div className="group bg-surface/35 border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-surface/45 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black tracking-widest ${tag.cls}`}
            >
              {lobby.tag}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black tracking-widest ${status.cls}`}
            >
              {status.label}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight">{lobby.name}</h3>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Lobby #{lobby.id}
          </p>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Prize pool
          </div>
          <div className="mt-1 text-2xl font-black font-mono tracking-tight">
            <span className="text-primary text-glow">{lobby.prizePool}</span>{" "}
            <span className="text-gray-400 text-base font-bold">
              {lobby.currency}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">
          <span>Players</span>
          <span className="font-mono text-gray-400 normal-case tracking-normal">
            {lobby.players}/{lobby.maxPlayers}
          </span>
        </div>
        <div className="h-2 rounded-full bg-black/30 border border-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-secondary"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="mt-3 text-xs text-gray-400">{lobby.startTime}</div>
      </div>

      <button
        className="w-full h-12 rounded-xl bg-primary text-background font-black tracking-wide hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(0,238,255,0.25)] disabled:opacity-60 disabled:hover:scale-100"
        disabled={lobby.status === "full"}
      >
        {lobby.status === "full" ? "Lobby Full" : "Join Lobby"}
      </button>
    </div>
  );
};
