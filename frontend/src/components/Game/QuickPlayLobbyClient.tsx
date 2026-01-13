"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";
import { useGames, GameData } from "@/hooks/useGames";
import { useGameManager } from "@/hooks/useGameManager";
import {
  GameStatus,
  Currency,
  CURRENCY_INFO,
  GameMode,
} from "@/lib/contract-types";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { Avatar } from "./Avatar";
import { Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/Shared/DashboardHeader";
import { StakeModal } from "@/components/Dashboard/StakeModal";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function QuickPlayLobbyClient() {
  const router = useRouter();
  const { walletAddress, connectWallet } = useConnectActions();
  const { games, isLoading, refreshGames, joinGame } = useGames(
    walletAddress || undefined
  );
  const {
    createGame,
    isLoading: isCreating,
    getCreatorStake,
    stakeAsCreator,
  } = useGameManager();

  const [isJoining, setIsJoining] = React.useState<string | null>(null);
  const [selectedGame, setSelectedGame] = React.useState<GameData | null>(null);
  const [stakeModalOpen, setStakeModalOpen] = React.useState(false);

  // Filter Quick Play games (mode = 0) that are waiting or in countdown
  const quickPlayGames = React.useMemo(() => {
    return games.filter(
      (game) =>
        game.mode === GameMode.QuickPlay &&
        (game.status === GameStatus.Waiting ||
          game.status === GameStatus.Countdown)
    );
  }, [games]);

  // Sort by: games with slots available first, then by player count (more players = more likely to fill)
  const sortedGames = React.useMemo(() => {
    return [...quickPlayGames].sort((a, b) => {
      // Prioritize games that are not full
      const aHasSlots = a.currentPlayerCount < a.maxPlayers;
      const bHasSlots = b.currentPlayerCount < b.maxPlayers;

      if (aHasSlots && !bHasSlots) return -1;
      if (!aHasSlots && bHasSlots) return 1;

      // If both have slots or both are full, sort by player count (descending)
      return b.currentPlayerCount - a.currentPlayerCount;
    });
  }, [quickPlayGames]);

  // Auto-refresh games
  React.useEffect(() => {
    const interval = setInterval(() => {
      refreshGames();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [refreshGames]);

  const handleJoinGame = React.useCallback(
    async (game: GameData) => {
      if (!walletAddress) {
        const connected = await connectWallet();
        if (!connected) return;
      }

      setIsJoining(game.gameId);
      try {
        const success = await joinGame(game.gameId, game.entryFee);
        if (success) {
          // Navigate to the game waiting room
          router.push(`/dashboard/games/${game.gameId}`);
        }
      } catch (err) {
        console.error("Failed to join game:", err);
      } finally {
        setIsJoining(null);
      }
    },
    [walletAddress, connectWallet, joinGame, router]
  );

  const handleCreateGame = React.useCallback(async () => {
    if (!walletAddress) {
      const connected = await connectWallet();
      if (!connected) return;
      // Wait a bit for wallet to connect
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      // Check if user has staked
      const stakeInfo = await getCreatorStake();
      const hasStake = stakeInfo?.hasStaked ?? false;

      if (!hasStake) {
        // User hasn't staked - show StakeModal
        setStakeModalOpen(true);
        return;
      }

      // User has staked - create game
      const gameId = await createGame({
        currency: Currency.USDT0,
        entryFee: 10,
        maxPlayers: 10,
        name: "Quick Play",
      });

      if (gameId && gameId !== "pending") {
        // Navigate to the game waiting room
        router.push(`/dashboard/games/${gameId}`);
      }
    } catch (err) {
      console.error("Failed to create game:", err);
    }
  }, [walletAddress, connectWallet, getCreatorStake, createGame, router]);

  const handleStake = React.useCallback(
    async (amount: number) => {
      const success = await stakeAsCreator(amount);
      if (success) {
        setStakeModalOpen(false);
        // After successful stake, create the game
        const gameId = await createGame({
          currency: Currency.USDT0,
          entryFee: 10,
          maxPlayers: 10,
          name: "Quick Play",
        });

        if (gameId && gameId !== "pending") {
          router.push(`/dashboard/games/${gameId}`);
        }
      }
    },
    [stakeAsCreator, createGame, router]
  );

  // Find the most popular game (most players)
  const popularGame = sortedGames[0];
  const totalPlayersWaiting = quickPlayGames.reduce(
    (sum, game) => sum + game.currentPlayerCount,
    0
  );

  if (isLoading && games.length === 0) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400 font-bold">Loading Quick Play games...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StakeModal
        open={stakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onStake={handleStake}
        minStake={30} // MIN_CREATOR_STAKE = 30 USDT0
      />
      <div className="min-h-screen bg-background text-white flex flex-col">
        <div className="flex-1 mx-auto w-full max-w-7xl px-4 lg:px-8 py-6 lg:py-10">
          <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-8">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Header */}
              <div>
                <button
                  className="text-white/70 hover:text-white transition-colors flex items-center gap-2 mb-4"
                  onClick={() => router.push("/dashboard")}
                >
                  <Icon name="arrow_back" className="text-[24px]" />
                  <span className="text-sm font-black tracking-wide uppercase">
                    Back to Dashboard
                  </span>
                </button>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-2">
                  Quick Play Lobby
                </h1>
                <p className="text-gray-400">
                  Jump into a game instantly or create your own
                </p>
              </div>

              {/* Quick Join Section */}
              {popularGame && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-xl p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Icon name="bolt" className="text-primary text-2xl" />
                    <div>
                      <h2 className="text-xl font-black text-primary">
                        Quick Join
                      </h2>
                      <p className="text-sm text-gray-300">
                        Join the most active game
                      </p>
                    </div>
                  </div>

                  <div className="bg-background/50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-black text-lg">
                          {popularGame.name || `Game #${popularGame.gameId}`}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          Entry: {popularGame.entryFee}{" "}
                          {CURRENCY_INFO[popularGame.currency].symbol}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-primary">
                          {popularGame.currentPlayerCount}/
                          {popularGame.maxPlayers}
                        </div>
                        <div className="text-xs text-gray-400">Players</div>
                      </div>
                    </div>

                    <ProgressBar
                      value={popularGame.currentPlayerCount}
                      max={popularGame.maxPlayers}
                    />
                  </div>

                  <button
                    onClick={() => handleJoinGame(popularGame)}
                    disabled={
                      isJoining === popularGame.gameId ||
                      isCreating ||
                      popularGame.isPlayer ||
                      !popularGame.canJoin
                    }
                    className="w-full h-14 rounded-xl bg-primary text-background font-black tracking-wide shadow-[0_0_25px_rgba(0,238,255,0.3)] hover:shadow-[0_0_35px_rgba(0,238,255,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isJoining === popularGame.gameId ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Joining...
                      </>
                    ) : popularGame.isPlayer ? (
                      <>
                        <Icon name="check_circle" />
                        Already Joined
                      </>
                    ) : (
                      <>
                        Join Now
                        <Icon name="arrow_forward" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Available Games List */}
              <div className="rounded-2xl border border-white/10 bg-surface/30 backdrop-blur-xl p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black">Available Games</h2>
                  <button
                    onClick={refreshGames}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon name="refresh" />
                    )}
                    Refresh
                  </button>
                </div>

                {sortedGames.length > 0 ? (
                  <div className="space-y-4">
                    {sortedGames.map((game) => {
                      const currencyInfo = CURRENCY_INFO[game.currency];
                      const fillPct =
                        game.maxPlayers > 0
                          ? Math.min(
                              100,
                              (game.currentPlayerCount / game.maxPlayers) * 100
                            )
                          : 0;
                      const isJoiningThis = isJoining === game.gameId;

                      return (
                        <div
                          key={game.gameId}
                          className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-black text-lg mb-1">
                                {game.name || `Game #${game.gameId}`}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span>
                                  Entry:{" "}
                                  <span className="text-primary font-bold">
                                    {game.entryFee} {currencyInfo.symbol}
                                  </span>
                                </span>
                                <span className="text-white/30">•</span>
                                <span className="font-mono">
                                  ID: {game.gameId}
                                </span>
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
                            <div className="text-right">
                              <div className="font-black text-xl">
                                {game.currentPlayerCount}/{game.maxPlayers}
                              </div>
                              <div className="text-xs text-gray-400">
                                Players
                              </div>
                            </div>
                          </div>

                          <ProgressBar
                            value={game.currentPlayerCount}
                            max={game.maxPlayers}
                          />

                          <div className="mt-4 flex items-center gap-3">
                            {game.isPlayer ? (
                              <button
                                onClick={() =>
                                  router.push(`/dashboard/games/${game.gameId}`)
                                }
                                className="flex-1 h-10 rounded-xl bg-primary/20 border border-primary/30 text-primary font-black text-sm hover:bg-primary/30 transition-colors flex items-center justify-center gap-2"
                              >
                                <Icon name="check_circle" />
                                View Waiting Room
                              </button>
                            ) : game.canJoin ? (
                              <button
                                onClick={() => handleJoinGame(game)}
                                disabled={isJoiningThis || isCreating}
                                className="flex-1 h-10 rounded-xl bg-primary text-background font-black text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {isJoiningThis ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Joining...
                                  </>
                                ) : (
                                  <>
                                    Join
                                    <Icon
                                      name="arrow_forward"
                                      className="text-sm"
                                    />
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-white/30 font-black text-sm cursor-not-allowed"
                              >
                                Cannot Join
                              </button>
                            )}

                            <button
                              onClick={() =>
                                router.push(`/dashboard/games/${game.gameId}`)
                              }
                              className="px-4 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Icon
                      name="games"
                      className="w-16 h-16 mx-auto mb-4 opacity-50"
                    />
                    <p className="font-bold text-lg mb-2">
                      No Quick Play games available
                    </p>
                    <p className="text-sm mb-6">
                      Be the first to create a Quick Play game!
                    </p>
                    <button
                      onClick={handleCreateGame}
                      disabled={isCreating || !walletAddress}
                      className="px-6 py-3 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Quick Play Game
                          <Icon name="add" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block space-y-6">
              {/* Create Game Card */}
              <div className="rounded-2xl border border-white/10 bg-surface/30 backdrop-blur-xl p-6 sticky top-20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                    <Icon name="bolt" className="text-[20px]" />
                  </div>
                  <div>
                    <div className="text-sm font-black">Quick Play</div>
                    <div className="text-xs text-white/60">10 USDT0 entry</div>
                  </div>
                </div>

                <p className="text-sm text-white/70 leading-relaxed mb-6">
                  Create your own Quick Play game and start matchmaking
                  instantly. Players will join automatically.
                </p>

                <button
                  onClick={handleCreateGame}
                  disabled={isCreating || !walletAddress}
                  className="w-full h-12 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors shadow-[0_0_20px_rgba(0,238,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : !walletAddress ? (
                    <>
                      Connect Wallet
                      <Icon name="account_balance_wallet" />
                    </>
                  ) : (
                    <>
                      Create Game
                      <Icon name="add" />
                    </>
                  )}
                </button>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-xs text-gray-400 space-y-2">
                    <div className="flex justify-between">
                      <span>Active Games:</span>
                      <span className="text-white font-bold">
                        {quickPlayGames.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Players Waiting:</span>
                      <span className="text-white font-bold">
                        {totalPlayersWaiting}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="info" className="text-primary" />
                  <h3 className="text-sm font-black text-primary">
                    How It Works
                  </h3>
                </div>
                <ul className="text-xs text-white/70 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Join an existing game or create your own</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Games start when minimum players join</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Stakes generate real yield during gameplay</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Winners get principal + accumulated yield</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
