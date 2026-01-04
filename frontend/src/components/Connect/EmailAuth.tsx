"use client";

import React, { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

export interface EmailAuthProps {
  onBack: () => void;
  onComplete: (email: string) => void;
}

export const EmailAuth: React.FC<EmailAuthProps> = ({ onBack, onComplete }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onComplete(email);
    }, 1500);
  };

  return (
    <div className="w-full max-w-[400px] bg-[#162a2c]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-8 animate-slide-up">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest font-display">
          Back
        </span>
      </button>

      <h2 className="text-2xl font-bold text-white mb-2 font-display">
        Enter your email
      </h2>
      <p className="text-gray-400 text-sm mb-8">
        We'll send you a magic link to sign in instantly.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1 font-display">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-600"
          />
        </div>

        <button
          disabled={isLoading || !email}
          className="w-full h-12 bg-primary disabled:bg-gray-700 disabled:text-gray-500 text-[#0f2223] font-bold text-base rounded-xl transition-all shadow-neon flex items-center justify-center gap-2 hover:brightness-110"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
        </button>
      </form>
    </div>
  );
};

