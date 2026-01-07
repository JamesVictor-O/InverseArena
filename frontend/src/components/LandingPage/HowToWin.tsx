import React from "react";

const STEPS = [
  {
    title: "Join a lobby",
    body: "Pick an arena that matches your risk appetite—fast, popular, or filling.",
  },
  {
    title: "Choose a side",
    body: "Make a prediction. You don’t want to be the majority—minority survives.",
  },
  {
    title: "Survive eliminations",
    body: "Each round eliminates the majority. Stay in the minority to win the pot.",
  },
];

export const HowToWin: React.FC = () => {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                How it works
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
              The minority{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary text-glow">
                survives
              </span>
              .
            </h2>
            <p className="text-gray-400 mt-5 max-w-xl leading-relaxed">
              Inverse Arena is elimination gameplay where being “right” is not
              enough—you have to be right with fewer people.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full border border-white/10 bg-surface/30 text-gray-300 text-xs font-bold">
                Quick rounds
              </span>
              <span className="px-3 py-1 rounded-full border border-white/10 bg-surface/30 text-gray-300 text-xs font-bold">
                Provably fair
              </span>
              <span className="px-3 py-1 rounded-full border border-white/10 bg-surface/30 text-gray-300 text-xs font-bold">
                Instant payouts
              </span>
            </div>
          </div>

          <div className="grid gap-5">
            {STEPS.map((step, idx) => (
              <div
                key={step.title}
                className="bg-surface/35 border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center font-black text-sm">
                    <span className="text-primary text-glow">
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{step.title}</h3>
                    <p className="text-gray-400 mt-2 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 p-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Tip
              </div>
              <div className="mt-2 text-gray-200 font-bold">
                Watch the crowd—then do the opposite.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
