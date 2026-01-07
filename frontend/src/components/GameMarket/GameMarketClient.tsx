"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { Icon } from "@/components/Dashboard/Icon";
import type { Game, FilterType } from "./types";

// Mock data - replace with real data later
const MOCK_GAMES: Game[] = [
  {
    id: "402",
    title: "Inverse Arena #402",
    entryFee: "0.1",
    pool: "50",
    currency: "ETH",
    playerCount: { current: 88, max: 100 },
    status: "live",
    startTime: "20m",
    featured: true,
    tags: ["LIVE", "#FEATURED"],
  },
  {
    id: "8829",
    title: "Neon Nights #001",
    entryFee: "0.1",
    pool: "10",
    currency: "ETH",
    playerCount: { current: 88, max: 100 },
    status: "filling",
    image: "https://picsum.photos/seed/neon/200/200",
    tags: ["FILLING FAST"],
  },
  {
    id: "1042",
    title: "Free Entry Alpha",
    entryFee: "FREE",
    pool: "0",
    currency: "ETH",
    playerCount: { current: 205, max: 500 },
    status: "open",
    image: "https://picsum.photos/seed/alpha/200/200",
    tags: ["OPEN"],
  },
  {
    id: "0003",
    title: "Whale Wars",
    entryFee: "5.0",
    pool: "500",
    currency: "ETH",
    playerCount: { current: 12, max: 50 },
    status: "high-stakes",
    image: "https://picsum.photos/seed/whale/200/200",
    tags: ["HIGH STAKES"],
  },
  {
    id: "9210",
    title: "Night City Run",
    entryFee: "0.05",
    pool: "5",
    currency: "ETH",
    playerCount: { current: 12, max: 100 },
    status: "upcoming",
    image: "https://picsum.photos/seed/city/200/200",
    tags: ["UPCOMING"],
  },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

function GameCard({ game }: { game: Game }) {
  const fillPct =
    game.playerCount.max > 0
      ? Math.min(100, (game.playerCount.current / game.playerCount.max) * 100)
      : 0;

  const statusColors = {
    live: "bg-red-500/15 border-red-500/25 text-red-300",
    filling: "bg-orange-500/15 border-orange-500/25 text-orange-300",
    open: "bg-green-500/15 border-green-500/25 text-green-300",
    "high-stakes": "bg-yellow-500/15 border-yellow-500/25 text-yellow-300",
    upcoming: "bg-gray-500/15 border-gray-500/25 text-gray-300",
  };

  return (
    <div className="group relative rounded-2xl border border-white/10 bg-surface/30 backdrop-blur-xl overflow-hidden hover:border-primary/30 transition-all">
      {game.image && (
        <div className="relative h-32 lg:h-40 overflow-hidden">
          <img
            src={game.image}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          {game.tags && game.tags.length > 0 && (
            <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
              {game.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                    tag === "LIVE"
                      ? "bg-red-500/15 border-red-500/25 text-red-300"
                      : tag === "#FEATURED"
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : tag === "FILLING FAST"
                      ? "bg-orange-500/15 border-orange-500/25 text-orange-300"
                      : tag === "OPEN"
                      ? "bg-green-500/15 border-green-500/25 text-green-300"
                      : tag === "HIGH STAKES"
                      ? "bg-yellow-500/15 border-yellow-500/25 text-yellow-300"
                      : "bg-gray-500/15 border-gray-500/25 text-gray-300"
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base lg:text-lg font-black tracking-tight truncate mb-1">
              {game.title}
            </h3>
            <div className="flex items-center gap-3 text-xs lg:text-sm text-gray-400">
              <span className="font-bold">
                Entry: <span className="text-primary">{game.entryFee}</span>{" "}
                {game.currency}
              </span>
              <span className="text-white/30">•</span>
              <span className="font-mono">ID: {game.id}</span>
            </div>
          </div>
        </div>

        {game.status === "high-stakes" ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 border-2 border-background"
                  />
                ))}
                <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-background flex items-center justify-center text-xs font-bold">
                  +2
                </div>
              </div>
            </div>
            <button className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-bold hover:bg-yellow-500/20 transition-colors">
              Verify Funds
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
                <span>
                  {game.playerCount.current}/{game.playerCount.max} Players
                </span>
                <span className="font-mono text-primary">{fillPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-500"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
            <button className="w-full h-10 lg:h-12 rounded-xl bg-primary text-background font-black text-sm tracking-wide hover:bg-primary-hover transition-colors shadow-[0_0_20px_rgba(0,238,255,0.2)]">
              Join Now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FeaturedGameCard({ game }: { game: Game }) {
  return (
    <div className="relative rounded-3xl border border-primary/30 bg-surface/40 backdrop-blur-xl overflow-hidden shadow-[0_0_40px_rgba(0,238,255,0.2)]">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-background/50" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0,238,255,0.3) 0%, transparent 70%)`,
        }}
      />

      <div className="relative p-6 lg:p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {game.tags?.map((tag, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${
                  tag === "LIVE"
                    ? "bg-red-500/15 border-red-500/25 text-red-300"
                    : "bg-primary/15 border-primary/30 text-primary"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <Bookmark className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-6">
          {game.title}
        </h2>

        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6 mb-6">
          <div className="flex items-center gap-2 text-sm lg:text-base text-gray-300">
            <Icon name="account_balance_wallet" className="text-primary" />
            <span className="font-bold">
              {game.pool} {game.currency} Pool
            </span>
          </div>
          {game.startTime && (
            <div className="flex items-center gap-2 text-sm lg:text-base text-gray-300">
              <Icon name="schedule" className="text-primary" />
              <span className="font-bold">Starts in {game.startTime}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button className="flex-1 lg:flex-none px-6 lg:px-8 h-12 lg:h-14 rounded-2xl bg-primary text-background font-black text-base lg:text-lg tracking-wide hover:bg-primary-hover transition-colors shadow-[0_0_30px_rgba(0,238,255,0.3)] flex items-center justify-center gap-2">
            Join Now
            <Icon name="arrow_forward" className="text-background text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GameMarketClient() {
  const isDesktop = useIsDesktop();
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");

  const featuredGame = MOCK_GAMES.find((g) => g.featured);
  const trendingGames = MOCK_GAMES.filter((g) => !g.featured);

  const filteredGames =
    activeFilter === "all"
      ? trendingGames
      : activeFilter === "live"
      ? trendingGames.filter((g) => g.status === "live")
      : trendingGames.filter((g) => g.status === "high-stakes");

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 lg:mb-8 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { id: "all" as FilterType, label: "All", icon: "apps" },
            { id: "live" as FilterType, label: "Live Now", icon: "bolt" },
            {
              id: "high-stakes" as FilterType,
              label: "High Stakes",
              icon: "workspace_premium",
            },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`shrink-0 flex items-center gap-2 px-4 lg:px-6 h-10 lg:h-12 rounded-xl font-black text-sm lg:text-base transition-all ${
                activeFilter === filter.id
                  ? "bg-primary text-background shadow-[0_0_20px_rgba(0,238,255,0.3)]"
                  : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon name={filter.icon} className="text-[18px] lg:text-[20px]" />
              {filter.label}
            </button>
          ))}
        </div>

        {/* Featured Game */}
        {featuredGame && (
          <div className="mb-8 lg:mb-12">
            <FeaturedGameCard game={featuredGame} />
          </div>
        )}

        {/* Trending Now */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className="text-xl lg:text-2xl font-black tracking-tight">
              Trending Now
            </h2>
            <button className="text-sm lg:text-base font-black text-primary hover:text-primary-hover transition-colors">
              VIEW ALL
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
