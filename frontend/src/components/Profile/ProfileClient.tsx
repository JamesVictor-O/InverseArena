"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Copy,
  Trophy,
  TrendingUp,
  BarChart3,
  Award,
  DollarSign,
  Heart,
  ClipboardList,
  Fish,
  Shield,
  Flame,
  Skull,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import {
  MOCK_PROFILE,
  MOCK_ACHIEVEMENTS,
  MOCK_RECENT_GAMES,
} from "./constants";
import type { Achievement, RecentGame } from "./types";
import { useGameManager } from "@/hooks/useGameManager";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { StakeModal } from "@/components/Dashboard/StakeModal";
import { Icon } from "@/components/Dashboard/Icon";

function AchievementIcon({ icon }: { icon: string }) {
  const className = "w-6 h-6 text-primary";
  switch (icon) {
    case "sword":
      return <Heart className={className} fill="currentColor" />;
    case "clipboard":
      return <ClipboardList className={className} />;
    case "whale":
      return <Fish className={className} />;
    case "shield":
      return <Shield className={className} />;
    case "flame":
      return <Flame className={className} />;
    default:
      return <Award className={className} />;
  }
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface/40 backdrop-blur-xl p-4 lg:p-6 hover:bg-surface/50 transition-colors">
      <div className="absolute top-3 right-3 lg:top-4 lg:right-4 text-white/10">
        {icon}
      </div>
      <div className="relative">
        <div className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-gray-400 mb-2 lg:mb-3">
          {label}
        </div>
        <div className="text-2xl lg:text-4xl font-black text-white mb-1 lg:mb-2">
          {value}
        </div>
        {subtitle && (
          <div className="text-xs lg:text-sm text-gray-500 font-medium">
            {subtitle}
          </div>
        )}
        {trend && (
          <div
            className={`mt-2 lg:mt-3 flex items-center gap-1 text-xs lg:text-sm font-bold ${
              trend.positive ? "text-primary" : "text-red-400"
            }`}
          >
            <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" />
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={`flex flex-col items-center gap-2 lg:gap-3 p-4 lg:p-5 rounded-xl border transition-all ${
        achievement.unlocked
          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30 cursor-pointer"
          : "bg-white/2 border-white/5 opacity-50"
      }`}
    >
      <AchievementIcon icon={achievement.icon} />
      <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-gray-300 text-center leading-tight">
        {achievement.title}
      </span>
    </div>
  );
}

function GameHistoryCard({ game }: { game: RecentGame }) {
  const isVictory = game.result === "victory";
  return (
    <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 rounded-xl border border-white/10 bg-surface/30 hover:bg-surface/50 transition-colors cursor-pointer">
      {isVictory ? (
        <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-primary shrink-0" />
      ) : (
        <Skull className="w-5 h-5 lg:w-6 lg:h-6 text-red-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 lg:gap-3 mb-1">
          <span className="text-sm lg:text-base font-bold text-white">
            Game #{game.gameNumber}
          </span>
          <span
            className={`text-xs lg:text-sm font-black uppercase tracking-wider ${
              isVictory ? "text-primary" : "text-red-400"
            }`}
          >
            {isVictory ? "VICTORY" : "ELIMINATED"}
          </span>
        </div>
        <div className="text-xs lg:text-sm text-gray-400">{game.timeAgo}</div>
      </div>
      <div
        className={`text-sm lg:text-base font-black shrink-0 ${
          isVictory ? "text-primary" : "text-red-400"
        }`}
      >
        {isVictory ? "+" : "-"}
        {game.amount} {game.currency}
      </div>
    </div>
  );
}

export function ProfileClient() {
  const router = useRouter();
  const pathname = usePathname();
  const profile = MOCK_PROFILE;
  const achievements = MOCK_ACHIEVEMENTS;
  const recentGames = MOCK_RECENT_GAMES;

  const { walletAddress, connectWallet } = useConnectActions();
  const { getCreatorStake, stakeAsCreator, unstakeCreator, isLoading, error } =
    useGameManager();

  const [stakeInfo, setStakeInfo] = React.useState<{
    stakedAmount: string;
    yieldAccumulated: string;
    timestamp: number;
    activeGamesCount: number;
    hasStaked: boolean;
  } | null>(null);
  const [stakeModalOpen, setStakeModalOpen] = React.useState(false);
  const [isUnstaking, setIsUnstaking] = React.useState(false);
  const [stakeError, setStakeError] = React.useState<string | null>(null);

  const loadStakeInfo = React.useCallback(async () => {
    try {
      const info = await getCreatorStake();
      setStakeInfo(info);
    } catch (err) {
      console.error("Error loading stake info:", err);
      setStakeInfo(null);
    }
  }, [getCreatorStake]);

  // Load stake info when component mounts and wallet is connected
  React.useEffect(() => {
    if (walletAddress) {
      loadStakeInfo();
    } else {
      setStakeInfo(null);
    }
  }, [walletAddress, loadStakeInfo]);

  const handleStake = async (amount: number) => {
    setStakeError(null);
    const success = await stakeAsCreator(amount);
    if (success) {
      setStakeModalOpen(false);
      await loadStakeInfo();
    } else {
      setStakeError(error || "Failed to stake");
    }
  };

  const handleUnstake = async () => {
    if (!walletAddress) {
      setStakeError("Please connect your wallet first");
      const connected = await connectWallet();
      if (!connected) return;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    if (!stakeInfo?.hasStaked) {
      setStakeError("No active stake found");
      return;
    }

    setIsUnstaking(true);
    setStakeError(null);

    try {
      const success = await unstakeCreator();
      if (success) {
        await loadStakeInfo();
      } else {
        setStakeError(error || "Failed to unstake");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unstake";
      setStakeError(message);
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${profile.username}`);
  };

  const handleNavClick = (label: string) => {
    switch (label) {
      case "Lobby":
        router.push("/dashboard");
        break;
      case "Arena":
        router.push("/arena");
        break;
      case "Profile":
        router.push("/dashboard/profile");
        break;
      case "Wallet":
        router.push("/wallet");
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8 w-full">
        {/* Desktop: 2-column layout, Mobile: single column */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Profile Info + Stats */}
          <div className="lg:col-span-5 space-y-6 lg:space-y-8">
            {/* Profile Section */}
            <section>
              <div className="flex flex-col items-center text-center">
               

                {/* Name & Username */}
                <h2 className="text-2xl lg:text-4xl font-black mb-2">
                  {profile.name}
                </h2>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm lg:text-lg text-primary font-medium">
                    @{profile.username}
                  </span>
                  <button
                    onClick={handleCopyUsername}
                    className="p-1 text-gray-400 hover:text-primary transition-colors"
                  >
                    <Copy className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>

                {/* Level Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 lg:px-5 lg:py-2 rounded-full bg-primary/10 border border-primary/30 text-primary">
                  <Trophy className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="text-xs lg:text-sm font-black uppercase tracking-wider">
                    LEVEL {profile.level} - {profile.rank}
                  </span>
                </div>
              </div>
            </section>

            {/* Statistics Grid */}
            <section>
              <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
                <StatCard
                  label="WIN RATE"
                  value={`${profile.winRate}%`}
                  subtitle={`+${profile.winRateChange}% this week`}
                  icon={<BarChart3 className="w-5 h-5 lg:w-6 lg:h-6" />}
                  trend={{
                    value: `+${profile.winRateChange}% this week`,
                    positive: true,
                  }}
                />
                <StatCard
                  label="TOTAL WINS"
                  value={profile.totalWins.toString()}
                  subtitle={`Out of ${profile.totalGames} games`}
                  icon={<Award className="w-5 h-5 lg:w-6 lg:h-6" />}
                />
              </div>
              <StatCard
                label="TOTAL EARNED"
                value={`${profile.totalEarned.toLocaleString()} ${
                  profile.currency
                }`}
                icon={<DollarSign className="w-5 h-5 lg:w-6 lg:h-6" />}
              />
            </section>

            {/* Creator Stake Section */}
            {walletAddress && (
              <section>
                <div className="rounded-2xl border border-white/10 bg-surface/40 backdrop-blur-xl p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                      <h3 className="text-sm lg:text-base font-black uppercase tracking-wider text-white">
                        Creator Stake
                      </h3>
                    </div>
                  </div>

                  {stakeInfo?.hasStaked ? (
                    <div className="space-y-4">
                      {/* Yield Growth Graph */}
                      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-4 lg:p-5 overflow-hidden">
                        {/* Graph Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                          <svg
                            className="w-full h-full"
                            viewBox="0 0 200 100"
                            preserveAspectRatio="none"
                          >
                            {/* Grid lines */}
                            <defs>
                              <linearGradient
                                id="yieldGradient"
                                x1="0%"
                                y1="0%"
                                x2="0%"
                                y2="100%"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#00eeff"
                                  stopOpacity="0.3"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#00eeff"
                                  stopOpacity="0"
                                />
                              </linearGradient>
                            </defs>
                            {/* Simulated yield growth curve */}
                            <path
                              d="M 0 90 Q 50 80 100 70 T 200 50"
                              fill="url(#yieldGradient)"
                              stroke="none"
                            />
                            <path
                              d="M 0 90 Q 50 80 100 70 T 200 50"
                              fill="none"
                              stroke="#00eeff"
                              strokeWidth="2"
                              opacity="0.6"
                            />
                          </svg>
                        </div>

                        <div className="relative space-y-4">
                          {/* Total Value */}
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">
                              Total Value
                            </div>
                            <div className="text-2xl lg:text-3xl font-black text-white">
                              {(
                                parseFloat(stakeInfo.stakedAmount) +
                                parseFloat(stakeInfo.yieldAccumulated)
                              ).toFixed(2)}{" "}
                              USDT0
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-white/5">
                              <div className="text-[9px] uppercase tracking-wider text-gray-400 font-black mb-0.5">
                                Staked
                              </div>
                              <div className="text-sm font-black text-white">
                                {parseFloat(stakeInfo.stakedAmount).toFixed(0)}
                              </div>
                            </div>
                            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-white/5">
                              <div className="text-[9px] uppercase tracking-wider text-gray-400 font-black mb-0.5">
                                Yield
                              </div>
                              <div className="text-sm font-black text-primary">
                                +
                                {parseFloat(stakeInfo.yieldAccumulated).toFixed(
                                  2
                                )}
                              </div>
                            </div>
                            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-white/5">
                              <div className="text-[9px] uppercase tracking-wider text-gray-400 font-black mb-0.5">
                                APY
                              </div>
                              <div className="text-sm font-black text-primary">
                                5.0%
                              </div>
                            </div>
                          </div>

                          {/* Time Elapsed */}
                          {stakeInfo.timestamp > 0 && (
                            <div className="flex items-center gap-2 text-xs text-white/60">
                              <TrendingUp className="w-3 h-3" />
                              <span>
                                Staked{" "}
                                {(() => {
                                  const secondsElapsed =
                                    Math.floor(Date.now() / 1000) -
                                    stakeInfo.timestamp;
                                  const days = Math.floor(
                                    secondsElapsed / 86400
                                  );
                                  const hours = Math.floor(
                                    (secondsElapsed % 86400) / 3600
                                  );
                                  if (days > 0) {
                                    return `${days}d ${hours}h ago`;
                                  } else if (hours > 0) {
                                    return `${hours}h ago`;
                                  } else {
                                    const minutes = Math.floor(
                                      (secondsElapsed % 3600) / 60
                                    );
                                    return `${minutes}m ago`;
                                  }
                                })()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Active Games Warning */}
                      {stakeInfo.activeGamesCount > 0 && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-300/80">
                              <p className="font-bold mb-1">
                                Active Games: {stakeInfo.activeGamesCount}
                              </p>
                              <p>
                                Unstaking now will incur a 10% penalty on earned
                                yield. Consider unstaking after all games
                                complete.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {stakeError && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-xs font-bold">
                          {stakeError}
                        </div>
                      )}

                      {/* Unstake Button */}
                      <button
                        onClick={handleUnstake}
                        disabled={
                          isLoading ||
                          isUnstaking ||
                          stakeInfo.activeGamesCount > 0
                        }
                        className="w-full h-12 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                      >
                        {isUnstaking ? (
                          <>
                            <Icon
                              name="progress_activity"
                              className="animate-spin w-5 h-5"
                            />
                            Unstaking...
                          </>
                        ) : (
                          <>
                            <Unlock className="w-5 h-5" />
                            Unstake
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm text-white/70">
                        <p className="mb-2">
                          Become a game creator by staking at least 30 USDT0.
                          This allows you to:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs text-white/60">
                          <li>Create unlimited games</li>
                          <li>Earn 10% creator fees from each game</li>
                          <li>Earn 5% APY on your stake</li>
                        </ul>
                      </div>
                      {stakeError && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-xs font-bold">
                          {stakeError}
                        </div>
                      )}
                      <button
                        onClick={() => setStakeModalOpen(true)}
                        disabled={isLoading}
                        className="w-full h-10 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors shadow-[0_0_20px_rgba(0,238,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Stake as Creator
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Achievements + Recent Games */}
          <div className="lg:col-span-7 space-y-6 lg:space-y-8 mt-8 lg:mt-0">
            {/* Achievements */}
            <section>
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="text-sm lg:text-base font-black uppercase tracking-wider">
                  ACHIEVEMENTS
                </h3>
                <button className="text-xs lg:text-sm text-primary font-bold hover:text-[#33f2ff] transition-colors">
                  VIEW ALL
                </button>
              </div>
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                {achievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                  />
                ))}
              </div>
            </section>

            {/* Recent Games */}
            <section>
              <h3 className="text-sm lg:text-base font-black uppercase tracking-wider mb-4 lg:mb-6">
                RECENT GAMES
              </h3>
              <div className="space-y-3 lg:space-y-4">
                {recentGames.map((game) => (
                  <GameHistoryCard key={game.id} game={game} />
                ))}
              </div>
              <button className="w-full mt-6 lg:mt-8 py-3 lg:py-4 rounded-xl border border-white/10 bg-surface/30 hover:bg-surface/50 text-white font-black uppercase tracking-wider text-sm lg:text-base transition-colors">
                VIEW FULL HISTORY
              </button>
            </section>
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 bg-background/80 backdrop-blur-md">
        <div className="grid grid-cols-4 h-16">
          {[
            { icon: "🏠", label: "Lobby", path: "/dashboard" },
            { icon: "⚔️", label: "Arena", path: "/arena" },
            { icon: "👤", label: "Profile", path: "/dashboard/profile" },
            { icon: "💼", label: "Wallet", path: "/wallet" },
          ].map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path === "/dashboard" && pathname === "/");
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.label)}
                className={`flex flex-col items-center justify-center gap-1 text-xs font-bold transition-colors ${
                  isActive ? "text-primary" : "text-gray-400 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {walletAddress && (
        <StakeModal
          open={stakeModalOpen}
          onClose={() => {
            setStakeModalOpen(false);
            setStakeError(null);
          }}
          onStake={handleStake}
          minStake={30}
        />
      )}
    </div>
  );
}
