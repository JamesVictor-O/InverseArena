"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";
import { useGames, GameData } from "@/hooks/useGames";
import { GameStatus, Currency, CURRENCY_INFO } from "@/lib/contract-types";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { AlertCircle, Loader2 } from "lucide-react";

function getStatusTag(game: GameData): { label: string; color: string } {
  switch (game.status) {
    case GameStatus.InProgress:
      return {
        label: "LIVE",
        color: "bg-red-500/15 border-red-500/25 text-red-300",
      };
    case GameStatus.Countdown:
      return {
        label: "COUNTDOWN",
        color: "bg-orange-500/15 border-orange-500/25 text-orange-300",
      };
    case GameStatus.Waiting:
      const fillPct =
        game.maxPlayers > 0
          ? (game.currentPlayerCount / game.maxPlayers) * 100
          : 0;
      if (fillPct >= 80) {
        return {
          label: "FILLING FAST",
          color: "bg-orange-500/15 border-orange-500/25 text-orange-300",
        };
      }
      return {
        label: "OPEN",
        color: "bg-green-500/15 border-green-500/25 text-green-300",
      };
    case GameStatus.Completed:
      return {
        label: "COMPLETED",
        color: "bg-gray-500/15 border-gray-500/25 text-gray-300",
      };
    default:
      return {
        label: "UNKNOWN",
        color: "bg-gray-500/15 border-gray-500/25 text-gray-300",
      };
  }
}

function GameCard({
  game,
  onJoin,
  isJoining,
}: {
  game: GameData;
  onJoin: (gameId: string, entryFee: string) => void;
  isJoining: string | null;
}) {
  const [currentTime, setCurrentTime] = React.useState(() =>
    Math.floor(Date.now() / 1000)
  );

  // Update current time every second when game is in countdown
  React.useEffect(() => {
    if (game.status !== GameStatus.Countdown || !game.countdownDeadline) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [game.status, game.countdownDeadline]);

  const fillPct =
    game.maxPlayers > 0
      ? Math.min(100, (game.currentPlayerCount / game.maxPlayers) * 100)
      : 0;

  const statusTag = getStatusTag(game);
  const currencyInfo = CURRENCY_INFO[game.currency];
  const isJoiningThis = isJoining === game.gameId;
  const canJoin = game.canJoin && !game.isPlayer && !isJoiningThis;

  const router = useRouter();

  const handleCardClick = () => {
    // For InProgress games, navigate to arena to make choice
    // For other games, navigate to waiting room
    if (game.status === GameStatus.InProgress) {
      router.push(`/arena/${game.gameId}`);
    } else {
      router.push(`/dashboard/games/${game.gameId}`);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl border border-white/10 bg-surface/30 backdrop-blur-xl overflow-hidden hover:border-primary/30 transition-all ${
        game.isPlayer ? "cursor-pointer" : ""
      }`}
      onClick={game.isPlayer ? handleCardClick : undefined}
    >
      <div className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base lg:text-lg font-black tracking-tight truncate">
                {game.name || `Game #${game.gameId}`}
              </h3>
              {game.isPlayer && (
                <span className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-black">
                  YOU
                </span>
              )}
              {game.isCreator && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-black">
                  CREATOR
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs lg:text-sm text-gray-400 flex-wrap">
              <span className="font-bold">
                Entry: <span className="text-primary">{game.entryFee}</span>{" "}
                {currencyInfo.symbol}
              </span>
              <span className="text-white/30">•</span>
              <span className="font-mono">ID: {game.gameId}</span>
              {game.currency !== Currency.MNT && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-primary font-bold">
                    💰 {currencyInfo.apy}% APY
                  </span>
                </>
              )}
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border shrink-0 ${statusTag.color}`}
          >
            {statusTag.label}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
            <span>
              {game.currentPlayerCount}/{game.maxPlayers} Players
            </span>
            <span className="font-mono text-primary">
              {fillPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-500"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {game.status === GameStatus.Countdown && game.countdownDeadline && (
          <div className="mb-3 text-xs text-gray-400">
            <Icon name="schedule" className="inline mr-1" />
            Starts in: {Math.max(0, game.countdownDeadline - currentTime)}s
          </div>
        )}

        {game.status === GameStatus.InProgress && (
          <div className="mb-3 text-xs text-gray-400">
            <Icon name="play_circle" className="inline mr-1" />
            Round {game.currentRound} in progress
          </div>
        )}

        {game.isPlayer ? (
          <button
            onClick={handleCardClick}
            className="w-full h-10 lg:h-12 rounded-xl bg-primary/20 border border-primary/30 text-primary font-black text-sm tracking-wide hover:bg-primary/30 transition-colors flex items-center justify-center gap-2"
          >
            {game.status === GameStatus.InProgress ? (
              <>
                <Icon name="play_circle" />
                Play
                <Icon name="arrow_forward" className="text-sm" />
              </>
            ) : (
              <>
                <Icon name="check_circle" />
                View Game
                <Icon name="arrow_forward" className="text-sm" />
              </>
            )}
          </button>
        ) : game.canJoin ? (
          <button
            onClick={() => onJoin(game.gameId, game.entryFee)}
            disabled={isJoiningThis}
            className="w-full h-10 lg:h-12 rounded-xl bg-primary text-background font-black text-sm tracking-wide hover:bg-primary-hover transition-colors shadow-[0_0_20px_rgba(0,238,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isJoiningThis ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Now
                <Icon name="arrow_forward" />
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            className="w-full h-10 lg:h-12 rounded-xl bg-white/5 border border-white/10 text-white/30 font-black text-sm tracking-wide cursor-not-allowed"
          >
            {game.status === GameStatus.Completed
              ? "Game Completed"
              : "Cannot Join"}
          </button>
        )}
      </div>
    </div>
  );
}

export function GameList() {
  const { walletAddress } = useConnectActions();
  const {
    games,
    featuredGames,
    activeGames,
    isLoading,
    error,
    refreshGames,
    joinGame,
  } = useGames(walletAddress || undefined);

  const [isJoining, setIsJoining] = React.useState<string | null>(null);

  const router = useRouter();

  const handleJoin = React.useCallback(
    async (gameId: string, entryFee: string) => {
      setIsJoining(gameId);
      try {
        const success = await joinGame(gameId, entryFee);
        if (success) {
          // Refresh games after successful join
          await refreshGames();
          // Navigate to game waiting room after successful join
          setTimeout(() => {
            router.push(`/dashboard/games/${gameId}`);
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to join game:", err);
      } finally {
        setIsJoining(null);
      }
    },
    [joinGame, refreshGames, router]
  );

  if (isLoading && games.length === 0) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400 font-bold">Loading games...</p>
        </div>
      </div>
    );
  }

  if (error && games.length === 0) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 font-bold mb-2">Error loading games</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={refreshGames}
            className="px-6 py-2 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mb-2">
              Active Games
            </h1>
            <p className="text-gray-400 text-sm">
              {activeGames.length > 0 ? (
                <>
                  {activeGames.length} active game
                  {activeGames.length !== 1 ? "s" : ""}
                  {games.length > activeGames.length && (
                    <> • {games.length} total</>
                  )}
                </>
              ) : (
                <>
                  {games.length} total game{games.length !== 1 ? "s" : ""} found
                </>
              )}
            </p>
          </div>
          <button
            onClick={refreshGames}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 lg:px-6 h-10 lg:h-12 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Icon name="refresh" />
            )}
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-bold mb-1">Error</p>
              <p className="text-red-300/80 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* All Active Games - Single Section */}
        {activeGames.length > 0 && (
          <div className="mb-8 lg:mb-12">
            <h2 className="text-xl lg:text-2xl font-black tracking-tight mb-4 lg:mb-6">
              Active Games
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Sort games: InProgress first, then Countdown, then Waiting, then by player count */}
              {activeGames
                .sort((a, b) => {
                  // InProgress games first
                  if (
                    a.status === GameStatus.InProgress &&
                    b.status !== GameStatus.InProgress
                  ) {
                    return -1;
                  }
                  if (
                    b.status === GameStatus.InProgress &&
                    a.status !== GameStatus.InProgress
                  ) {
                    return 1;
                  }
                  // Countdown games second
                  if (
                    a.status === GameStatus.Countdown &&
                    b.status !== GameStatus.Countdown
                  ) {
                    return -1;
                  }
                  if (
                    b.status === GameStatus.Countdown &&
                    a.status !== GameStatus.Countdown
                  ) {
                    return 1;
                  }
                  // Then sort by player count (descending)
                  return b.currentPlayerCount - a.currentPlayerCount;
                })
                .map((game) => (
                  <GameCard
                    key={game.gameId}
                    game={game}
                    onJoin={handleJoin}
                    isJoining={isJoining}
                  />
                ))}
            </div>
          </div>
        )}

        {activeGames.length === 0 && games.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <Icon
              name="games"
              className="w-16 h-16 text-gray-600 mx-auto mb-4"
            />
            <h3 className="text-xl font-black mb-2">No games found</h3>
            <p className="text-gray-400 mb-6">Be the first to create a game!</p>
            <button
              onClick={refreshGames}
              className="px-6 py-3 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
