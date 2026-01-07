import React from "react";
import { LOBBIES } from "../constants";
import { LobbyCard } from "./LobbyCard";

export const LobbyGrid: React.FC = () => {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Choose your arena.
            </h2>
            <p className="text-gray-400 mt-3 max-w-2xl">
              Join a lobby, pick a side, and survive eliminations. The minority
              takes it all.
            </p>
          </div>

          <button className="hidden md:inline-flex items-center gap-2 px-5 h-12 rounded-xl border border-white/10 bg-surface/40 hover:bg-surface/60 transition-colors text-sm font-bold">
            View all
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9 18l6-6-6-6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LOBBIES.map((lobby) => (
            <LobbyCard key={lobby.id} lobby={lobby} />
          ))}
        </div>
      </div>
    </section>
  );
};
