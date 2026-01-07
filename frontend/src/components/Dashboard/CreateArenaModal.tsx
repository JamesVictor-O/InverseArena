"use client";

import * as React from "react";
import { X, Pencil, Wallet, Users, Lock, FileText, Fuel } from "lucide-react";
import { Icon } from "./Icon";

interface CreateArenaModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name?: string;
    entryFee: number;
    maxPlayers: number;
    isPrivate: boolean;
    additionalRules?: string;
  }) => void;
}

export function CreateArenaModal({
  open,
  onClose,
  onCreate,
}: CreateArenaModalProps) {
  const [arenaName, setArenaName] = React.useState("");
  const [entryFee, setEntryFee] = React.useState(250);
  const [maxPlayers, setMaxPlayers] = React.useState(8);
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [additionalRules, setAdditionalRules] = React.useState("");

  const handleCreate = () => {
    onCreate({
      name: arenaName || undefined,
      entryFee,
      maxPlayers,
      isPrivate,
      additionalRules: additionalRules || undefined,
    });
    // Reset form
    setArenaName("");
    setEntryFee(250);
    setMaxPlayers(8);
    setIsPrivate(false);
    setAdditionalRules("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[480px] bg-[#0a1516] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Icon name="stadia_controller" className="text-primary text-[20px]" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Create Arena
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          {/* Arena Name */}
          <div>
            <label className="block text-sm font-bold text-white/70 mb-2">
              Arena Name (Optional)
            </label>
            <div className="relative">
              <Pencil className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={arenaName}
                onChange={(e) => setArenaName(e.target.value)}
                placeholder="e.g. Neon Nights Royale"
                className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Entry Fee */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <label className="text-sm font-bold text-white/70">
                  Entry Fee
                </label>
              </div>
              <span className="text-lg font-black text-primary">
                {entryFee} MNT
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00eeff 0%, #00eeff ${
                    ((entryFee - 10) / (1000 - 10)) * 100
                  }%, rgba(255,255,255,0.1) ${
                    ((entryFee - 10) / (1000 - 10)) * 100
                  }%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
              <div className="flex items-center justify-between text-xs text-white/50 font-bold">
                <span>10 MNT</span>
                <span>1000 MNT</span>
              </div>
            </div>
          </div>

          {/* Max Players */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <label className="text-sm font-bold text-white/70">
                Max Players
              </label>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[4, 8, 12, 20].map((count) => (
                <button
                  key={count}
                  onClick={() => setMaxPlayers(count)}
                  className={`h-12 rounded-xl font-black text-sm transition-all ${
                    maxPlayers === count
                      ? "bg-primary/20 border-2 border-primary text-primary shadow-[0_0_20px_rgba(0,238,255,0.3)]"
                      : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Private Lobby */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <label className="text-sm font-bold text-white/70">
                  Private Lobby
                </label>
              </div>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isPrivate ? "bg-primary" : "bg-white/10"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    isPrivate ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-white/50">Invite code required to join</p>
          </div>

          {/* Additional Rules */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <label className="text-sm font-bold text-white/70">
                Additional Rules
              </label>
            </div>
            <textarea
              value={additionalRules}
              onChange={(e) => setAdditionalRules(e.target.value)}
              placeholder="Winner takes all. No teaming allowed..."
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/5 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="px-6 h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-8 h-12 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors shadow-[0_0_25px_rgba(0,238,255,0.3)] flex items-center gap-2"
            >
              Create Game
              <Icon name="arrow_forward" className="text-background" />
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs text-white/50">
            <Fuel className="w-3 h-3" />
            <span className="font-bold">Est. Gas: 0.002 MNT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
