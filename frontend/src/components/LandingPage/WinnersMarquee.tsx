import React from "react";
import { WINNERS } from "../constants";

export const WinnersMarquee: React.FC = () => {
  return (
    <div className="w-full bg-black py-10 border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
            Recent Winners
          </span>
        </div>
      </div>

      <div className="relative flex">
        <div className="animate-marquee whitespace-nowrap flex gap-6 items-center">
          {[...WINNERS, ...WINNERS].map((winner, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-surface px-6 py-3 rounded-lg border border-white/5"
            >
              <svg
                className="w-4 h-4 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
              <span className="text-gray-500 font-mono text-xs">
                {winner.address}
              </span>
              <span className="text-primary font-bold font-mono text-sm">
                +{winner.amount} {winner.currency}
              </span>
            </div>
          ))}
        </div>

        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
};
