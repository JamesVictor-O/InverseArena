"use client";

import * as React from "react";
import { X, Pencil, Wallet, Users, Lock, FileText, Fuel } from "lucide-react";
import { Icon } from "./Icon";
import {
  Currency,
  CURRENCY_INFO,
  MIN_ENTRY_FEE,
  MAX_ENTRY_FEE,
} from "@/lib/contract-types";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { StakeModal } from "./StakeModal";
import { useGameManager } from "@/hooks/useGameManager";

interface CreateArenaModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name?: string;
    currency: Currency;
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
  const [currency, setCurrency] = React.useState<Currency>(Currency.USDT0);
  const [entryFee, setEntryFee] = React.useState(10);
  const [maxPlayers, setMaxPlayers] = React.useState(8);
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [additionalRules, setAdditionalRules] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stakeModalOpen, setStakeModalOpen] = React.useState(false);
  const [hasStake, setHasStake] = React.useState<boolean | null>(null);

  const { walletAddress, connectWallet } = useConnectActions();
  const { getCreatorStake, stakeAsCreator } = useGameManager();

  // Check if user has stake when modal opens
  React.useEffect(() => {
    if (open && walletAddress) {
      checkStake();
    } else if (!walletAddress) {
      setHasStake(null);
    }
  }, [open, walletAddress]);

  const checkStake = async () => {
    try {
      const stakeInfo = await getCreatorStake();
      setHasStake(stakeInfo?.hasStaked ?? false);
    } catch (err) {
      console.error("Error checking stake:", err);
      setHasStake(false);
    }
  };

  const handleStake = async (amount: number) => {
    const success = await stakeAsCreator(amount);
    if (success) {
      setStakeModalOpen(false);
      await checkStake(); // Refresh stake status
    }
  };

  const currencyInfo = CURRENCY_INFO[currency];
  const entryFeePercent =
    ((entryFee - MIN_ENTRY_FEE) / (MAX_ENTRY_FEE - MIN_ENTRY_FEE)) * 100;

  const handleCreate = async () => {
    setError(null);

    // Check if wallet is connected
    if (!walletAddress) {
      setError("Please connect your wallet first");
      const connected = await connectWallet();
      if (!connected) {
        return;
      }
      // Wait a bit for wallet to connect
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Check stake after wallet connects
      await checkStake();
      return;
    }

    // Check if user has stake
    if (hasStake === null) {
      await checkStake();
    }

    if (hasStake === false) {
      // Show stake modal instead of creating game
      setStakeModalOpen(true);
      return;
    }

    setIsCreating(true);

    try {
      await onCreate({
        name: arenaName || undefined,
        currency,
        entryFee,
        maxPlayers,
        isPrivate,
        additionalRules: additionalRules || undefined,
      });

      // Reset form on success
      setArenaName("");
      setCurrency(Currency.USDT0);
      setEntryFee(10);
      setMaxPlayers(8);
      setIsPrivate(false);
      setAdditionalRules("");
      setIsCreating(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create game";
      setError(message);
      setIsCreating(false);
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
      <div className="relative w-full max-w-[480px] bg-[#0a1516] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Icon
                name="stadia_controller"
                className="text-primary text-[20px]"
              />
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

          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-bold text-white/70 mb-2">
              Currency
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: Currency.USDT0, label: "USDT0", apy: "5% APY" },
                { value: Currency.METH, label: "mETH", apy: "4% APY" },
                { value: Currency.MNT, label: "MNT", apy: "No yield" },
              ].map((curr) => (
                <button
                  key={curr.value}
                  onClick={() => setCurrency(curr.value)}
                  className={`h-14 rounded-xl border-2 transition-all ${
                    currency === curr.value
                      ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(0,238,255,0.3)]"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="font-black text-sm">{curr.label}</div>
                  <div className="text-[10px] font-bold text-white/50 mt-0.5">
                    {curr.apy}
                  </div>
                </button>
              ))}
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
                {entryFee} {currencyInfo.symbol}
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min={MIN_ENTRY_FEE}
                max={MAX_ENTRY_FEE}
                step="0.1"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #00eeff 0%, #00eeff ${entryFeePercent}%, rgba(255,255,255,0.1) ${entryFeePercent}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
              <div className="flex items-center justify-between text-xs text-white/50 font-bold">
                <span>
                  {MIN_ENTRY_FEE} {currencyInfo.symbol}
                </span>
                <span>
                  {MAX_ENTRY_FEE} {currencyInfo.symbol}
                </span>
              </div>
            </div>
            {currencyInfo.apy > 0 && (
              <p className="mt-2 text-xs text-primary font-bold">
                💰 Yield: {currencyInfo.apy}% APY during gameplay
              </p>
            )}
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
            <p className="text-xs text-white/50">
              Invite code required to join
            </p>
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

        {/* Error Message */}
        {error && (
          <div className="px-6 pb-4">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-bold">
              {error}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/5 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-6 h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-8 h-12 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors shadow-[0_0_25px_rgba(0,238,255,0.3)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  Create Game
                  <Icon name="arrow_forward" className="text-background" />
                </>
              )}
            </button>
          </div>
       
          {currencyInfo.apy > 0 && (
            <div className="mt-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary font-bold text-center">
                ⚡ Stakes generate {currencyInfo.apy}% APY from{" "}
                {currencyInfo.protocolName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stake Modal */}
      <StakeModal
        open={stakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onStake={handleStake}
        minStake={30} // MIN_CREATOR_STAKE = 30 USDT0
      />
    </div>
  );
}
