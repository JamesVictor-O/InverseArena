"use client";

import React from "react";
import { Mail, Wallet, Ticket, Download, Trophy, Diamond } from "lucide-react";

export interface WelcomeModalProps {
  onContinueEmail: () => void;
  onConnectWallet: () => void;
  onGuest: () => void;
  notice?: string | null;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  onContinueEmail,
  onConnectWallet,
  onGuest,
  notice,
}) => {
  return (
    <div className="w-full max-w-[480px] bg-[#162a2c]/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
      <div
        className="h-32 w-full bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCFG7eNMBfhyj9OnpsG7X2oqh3gdPIGJ-LBLT2VQ0Sc_ViMlFPADVqfTWu-BIlkCZo8_XIQUJXD3A4DKq69sFxMohh8lXToPNRuH9VONj86pO9C5jKWbEvj4jL_P2lxNCQuZk6IVcnxloGkgfqiIRhkAGQfRvAzdzIoox_rvlfexJHM1lZizvx_FgyNDC-39IfIS-TAUN0QdqSRqOUNmsIxH_u1vxndYQn3B_2EXZ53WtpDiG_Cb4RfuNbQ9U3U5FmFa-XPCVWBzC4')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#162a2c] to-transparent" />
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#00eeff]/30 flex items-center gap-2">
          <Diamond className="w-4 h-4 text-primary" fill="currentColor" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-white uppercase font-display">
            Inverse Arena
          </span>
        </div>
      </div>

      <div className="px-8 pb-8 pt-2 flex flex-col">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight font-display">
            Welcome!
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Get started in less than 30 seconds.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          <button
            onClick={onContinueEmail}
            className="group relative flex items-center justify-center w-full h-12 bg-primary text-[#0f2223] font-bold text-base rounded-xl transition-all shadow-neon hover:brightness-110"
          >
            <Mail className="absolute left-4 w-5 h-5" />
            <span>Continue with Email</span>
          </button>

          <button
            onClick={onConnectWallet}
            className="group relative flex items-center justify-center w-full h-12 bg-[#27393a]/50 hover:bg-[#27393a] border border-white/10 hover:border-primary/50 text-white font-bold text-base rounded-xl transition-all"
          >
            <Wallet className="absolute left-4 w-5 h-5" />
            <span>Connect Wallet</span>
          </button>

          <button
            onClick={onGuest}
            className="flex items-center justify-center w-full h-10 mt-1 text-gray-400 hover:text-white text-sm font-bold tracking-wide transition-colors"
          >
            Play as Guest
          </button>
        </div>

        {notice ? (
          <div className="-mt-4 mb-6 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-gray-300">
            {notice}
          </div>
        ) : null}

        <div className="h-px w-full bg-white/5 mb-6" />

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
            <Ticket className="w-5 h-5 text-primary" />
            <span className="text-[9px] uppercase font-bold text-gray-300 leading-tight tracking-wider font-display">
              Free first game
            </span>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
            <Download className="w-5 h-5 text-primary" />
            <span className="text-[9px] uppercase font-bold text-gray-300 leading-tight tracking-wider font-display">
              No download
            </span>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-[9px] uppercase font-bold text-gray-300 leading-tight tracking-wider font-display">
              Win real prizes
            </span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            By continuing, you agree to our{" "}
            <a
              href="#"
              className="text-gray-400 hover:text-primary transition-colors underline decoration-dotted"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="text-gray-400 hover:text-primary transition-colors underline decoration-dotted"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

