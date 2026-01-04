"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectModal } from "@/components/Connect/ConnectModal";
import { useConnectActions } from "@/components/Connect/ConnectActions";

export const Hero: React.FC = () => {
  const router = useRouter();
  const [connectOpen, setConnectOpen] = useState(false);
  const { connectWallet, walletAddress } = useConnectActions();

  // If the user connects their wallet via the modal, take them straight to the dashboard.
  useEffect(() => {
    if (!connectOpen) return;
    if (!walletAddress) return;
    router.push("/dashboard");
  }, [connectOpen, router, walletAddress]);

  return (
    <section className="relative min-h-[700px] flex items-center justify-center pt-20">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40 grayscale"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80&w=2000")',
        }}
      >
        <div className="absolute inset-0 bg-linear-to-b from-background/90 via-background/60 to-background" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-5xl md:text-8xl font-black uppercase mb-4 tracking-tighter">
          Inverse{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-accent to-secondary text-glow">
            Arena
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed">
          Where the Minority Becomes the{" "}
          <span className="text-primary font-bold">ONE</span>. <br />
          Enter the arena, choose your side, survive the elimination.
        </p>

        <button
          className="group relative px-10 h-16 bg-primary text-background rounded-xl font-bold text-lg flex items-center gap-3 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,238,255,0.4)] animate-pulse-slow"
          onClick={() => {
            if (walletAddress) {
              router.push("/dashboard");
              return;
            }
            setConnectOpen(true);
          }}
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play Now
        </button>
      </div>

      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onContinueEmail={(email) => {
          console.log("[connect] continue with email:", email);
        }}
        onConnectWallet={() => connectWallet()}
        onGuest={() => {
          console.log("[connect] guest clicked");
        }}
      />
    </section>
  );
};
