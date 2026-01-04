import React from "react";
import { STATS } from "../constants";

export const StatsTicker: React.FC = () => {
  return (
    <div className="w-full border-y border-white/5 bg-surface/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <div
              key={i}
              className={`flex flex-col border-l-2 pl-6 py-1 ${
                stat.color === "primary"
                  ? "border-primary/50"
                  : stat.color === "secondary"
                  ? "border-secondary/50"
                  : "border-green-500/50"
              }`}
            >
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                {stat.label}
              </span>
              <span
                className={`text-3xl font-bold font-mono tracking-tighter ${
                  stat.color === "secondary"
                    ? "text-secondary text-glow-secondary"
                    : "text-white"
                }`}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
