"use client";

import React, { useState } from "react";
import { ConnectModal } from "@/components/Connect/ConnectModal";
import { useConnectActions } from "@/components/Connect/ConnectActions";

const NAV = [
  { label: "How it works", href: "#how" },
  { label: "Lobbies", href: "#lobbies" },
  { label: "Winners", href: "#winners" },
];

export const Navbar: React.FC = () => {
  const [connectOpen, setConnectOpen] = useState(false);
  const { connectWallet, isAuthenticated, walletAddress } = useConnectActions();

  const label = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : isAuthenticated
    ? "Connected"
    : "Connect";

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md border-b border-white/5" />
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,238,255,0.18)]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight">
              INVERSE{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-accent to-secondary text-glow">
                ARENA
              </span>
            </div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              minority survives
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-300">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="hidden sm:inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-white/10 bg-surface/30 hover:bg-surface/50 transition-colors text-sm font-black text-gray-200 disabled:opacity-60 disabled:hover:bg-surface/30"
            onClick={() => setConnectOpen(true)}
          >
            {label}
            <span
              className={`w-2 h-2 rounded-full ${
                isAuthenticated ? "bg-green-500 animate-pulse" : "bg-gray-500"
              }`}
            />
          </button>
        </div>
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
    </header>
  );
};
