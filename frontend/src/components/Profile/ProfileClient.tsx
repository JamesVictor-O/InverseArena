"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Edit,
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
} from "lucide-react";
import {
  MOCK_PROFILE,
  MOCK_ACHIEVEMENTS,
  MOCK_RECENT_GAMES,
} from "./constants";
import type { Achievement, RecentGame } from "./types";

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
      {/* Header - Mobile optimized, desktop responsive */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base lg:text-lg font-black uppercase tracking-wider">
            PLAYER PROFILE
          </h1>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8 w-full">
        {/* Desktop: 2-column layout, Mobile: single column */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Profile Info + Stats */}
          <div className="lg:col-span-5 space-y-6 lg:space-y-8">
            {/* Profile Section */}
            <section>
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className="w-24 h-24 lg:w-36 lg:h-36 rounded-full border-2 border-primary shadow-neon overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl lg:text-5xl font-black">
                        {profile.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-primary border-2 border-background flex items-center justify-center text-background hover:bg-[#33f2ff] transition-colors shadow-neon">
                    <Edit className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>

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
    </div>
  );
}
