"use client";

import * as React from "react";
import { X, TrendingUp, Shield, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { Icon } from "./Icon";
import { useConnectActions } from "@/components/Connect/ConnectActions";

interface StakeModalProps {
  open: boolean;
  onClose: () => void;
  onStake: (amount: number) => Promise<void>;
  minStake: number; // Minimum stake amount in USDT0
}

export function StakeModal({
  open,
  onClose,
  onStake,
  minStake,
}: StakeModalProps) {
  const [amount, setAmount] = React.useState(minStake);
  const [isStaking, setIsStaking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { walletAddress, connectWallet } = useConnectActions();

  const handleStake = async () => {
    setError(null);

    if (!walletAddress) {
      setError("Please connect your wallet first");
      const connected = await connectWallet();
      if (!connected) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    if (amount < minStake) {
      setError(`Minimum stake is ${minStake} USDT0`);
      return;
    }

    setIsStaking(true);

    try {
      await onStake(amount);
      // Modal will be closed by parent on success
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to stake";
      setError(message);
      setIsStaking(false);
    }
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
      <div className="relative w-full max-w-[540px] bg-[#0a1516] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Become a Game Creator
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white transition-colors"
            disabled={isStaking}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
          {/* Benefits Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-base font-black text-white">
                Benefits & Rewards
              </h3>
            </div>
            <div className="space-y-3 pl-7">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Create Unlimited Games
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Once staked, you can create as many games as you want
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Earn Creator Fees
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    10% of each game&apos;s prize pool goes to you as the creator
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Earn Yield on Your Stake
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Your stake earns 5% APY while it&apos;s locked in the vault
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Build Your Creator Reputation
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Showcase your games and grow your following
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-black text-amber-400">
                  Important: Unstaking Consequences
                </p>
                <div className="text-xs text-amber-300/80 space-y-1">
                  <p>
                    • You can unstake at any time, but be aware of the following:
                  </p>
                  <p>
                    • <span className="font-bold">10% Penalty</span> on earned yield
                    if you unstake while you have active games (games that haven&apos;t
                    been completed yet)
                  </p>
                  <p>
                    • <span className="font-bold">No Penalty</span> if you unstake
                    when all your games are completed
                  </p>
                  <p>
                    • Your principal stake amount is always returned in full
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stake Amount Input */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-white/70">
              Stake Amount (USDT0)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="number"
                min={minStake}
                step="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder={`Minimum: ${minStake} USDT0`}
                className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors"
                disabled={isStaking}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Minimum: {minStake} USDT0</span>
              <span className="font-bold">
                5% APY on your stake
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isStaking}
              className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleStake}
              disabled={isStaking || amount < minStake}
              className="flex-1 h-12 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors shadow-[0_0_25px_rgba(0,238,255,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStaking ? (
                <>
                  <Icon name="progress_activity" className="animate-spin" />
                  Staking...
                </>
              ) : (
                <>
                  Stake {amount} USDT0
                  <Icon name="arrow_forward" className="text-background" />
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/50 text-center font-bold">
            ⚡ You can add more to your stake anytime
          </p>
        </div>
      </div>
    </div>
  );
}
