"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";
import { useGames, GameData } from "@/hooks/useGames";
import { GameStatus, Currency, CURRENCY_INFO } from "@/lib/contract-types";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { useGameManager } from "@/hooks/useGameManager";
import { Avatar } from "./Avatar";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

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
        label: "WAITING",
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

function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function GameWaitingRoomClient({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { walletAddress } = useConnectActions();
  const { games, isLoading, error, refreshGames, fetchGameById, joinGame } =
    useGames(walletAddress || undefined);
  const { startGameAfterCountdown, isLoading: isStartingGame } =
    useGameManager();

  const [isJoining, setIsJoining] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState<number | null>(null);
  const [gameStarting, setGameStarting] = React.useState(false);
  const [gameStarted, setGameStarted] = React.useState(false);

  const normalizedGameId = React.useMemo(() => {
    if (!gameId || gameId === "undefined" || gameId === "null") {
      return null;
    }
    return String(gameId);
  }, [gameId]);
  const game = React.useMemo(() => {
    if (!normalizedGameId || !games || games.length === 0) return undefined;
    return games.find(
      (g) =>
        g.gameId === normalizedGameId ||
        String(g.gameId) === normalizedGameId ||
        Number(g.gameId) === Number(normalizedGameId)
    );
  }, [games, normalizedGameId]);

  // Fetch game directly if not found in list
  const [directGame, setDirectGame] = React.useState<GameData | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = React.useState(false);

  // Format time remaining as MM:SS
  const formatTime = React.useCallback((seconds: number): string => {
    if (seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  React.useEffect(() => {
    // Only try to fetch directly if we have a valid gameId, games are loaded, and game is not found
    if (
      normalizedGameId &&
      !isLoading &&
      !game &&
      !directGame &&
      !isFetchingDirect
    ) {
      setIsFetchingDirect(true);
      // Fetch the specific game by ID
      fetchGameById(normalizedGameId)
        .then((fetchedGame) => {
          if (fetchedGame) {
            setDirectGame(fetchedGame);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch game directly:", err);
        })
        .finally(() => {
          setIsFetchingDirect(false);
        });
    }
  }, [
    normalizedGameId,
    isLoading,
    game,
    directGame,
    isFetchingDirect,
    fetchGameById,
  ]);

  // Use directGame if game is not found in list
  const currentGame = game || directGame;

  // Calculate and update countdown timer
  React.useEffect(() => {
    if (
      !currentGame ||
      currentGame.status !== GameStatus.Countdown ||
      !currentGame.countdownDeadline
    ) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, currentGame.countdownDeadline! - now);
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [currentGame?.status, currentGame?.countdownDeadline]);

  // Auto-start game when countdown hits 0
  React.useEffect(() => {
    if (
      currentGame &&
      currentGame.status === GameStatus.Countdown &&
      timeRemaining === 0 &&
      !gameStarting &&
      !gameStarted
    ) {
      const startGame = async () => {
        console.log(
          `[GameWaitingRoom] Countdown ended for game ${currentGame.gameId}, starting game...`
        );
        setGameStarting(true);

        try {
          const success = await startGameAfterCountdown(currentGame.gameId);

          if (success) {
            setGameStarted(true);
            // Wait a moment for blockchain to process, then refresh
            setTimeout(async () => {
              await refreshGames();
              await fetchGameById(currentGame.gameId);
              setGameStarting(false);
            }, 3000); // Wait 3 seconds for blockchain to process
          } else {
            // If it failed, just refresh to check status
            setGameStarting(false);
            setTimeout(async () => {
              await refreshGames();
              await fetchGameById(currentGame.gameId);
            }, 2000);
          }
        } catch (err) {
          console.error("Failed to start game:", err);
          setGameStarting(false);
          // Still refresh to check if someone else started it
          setTimeout(async () => {
            await refreshGames();
            await fetchGameById(currentGame.gameId);
          }, 2000);
        }
      };

      startGame();
    }
  }, [
    timeRemaining,
    currentGame?.status,
    currentGame?.gameId,
    gameStarting,
    gameStarted,
    refreshGames,
    fetchGameById,
    startGameAfterCountdown,
  ]);

  // Auto-refresh game data
  React.useEffect(() => {
    if (!currentGame) return;

    const interval = setInterval(() => {
      refreshGames();
      // Also refresh the specific game if we're viewing it
      if (currentGame?.gameId) {
        fetchGameById(currentGame.gameId);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [currentGame, refreshGames, fetchGameById]);

  const handleJoin = React.useCallback(async () => {
    if (!currentGame) return;

    setIsJoining(true);
    try {
      const success = await joinGame(currentGame.gameId, currentGame.entryFee);
      if (success) {
        await refreshGames();
      }
    } catch (err) {
      console.error("Failed to join game:", err);
    } finally {
      setIsJoining(false);
    }
  }, [currentGame, joinGame, refreshGames]);

  // Handle invalid gameId
  if (!normalizedGameId) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Icon name="games" className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-black mb-2">Invalid Game ID</h3>
          <p className="text-gray-400 mb-6">
            The game ID provided is invalid. Please check the URL and try again.
          </p>
          <button
            onClick={() => router.push("/dashboard/games")}
            className="px-6 py-3 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  if ((isLoading || isFetchingDirect) && !currentGame) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400 font-bold">
            Loading game #{normalizedGameId}...
          </p>
        </div>
      </div>
    );
  }

  if (error && !currentGame) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 font-bold mb-2">Error loading game</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard/games")}
            className="px-6 py-2 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }
  if (!isLoading && !isFetchingDirect && games.length > 0 && !currentGame) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Icon name="games" className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-black mb-2">Game not found</h3>
          <p className="text-gray-400 mb-4">Game ID: {normalizedGameId}</p>
          <p className="text-gray-400 mb-6">
            This game may have been cancelled, completed, or doesn&apos;t exist.
          </p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={refreshGames}
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-black hover:bg-white/20 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => router.push("/dashboard/games")}
              className="px-6 py-3 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-colors"
            >
              Back to Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentGame) {
    // Still loading or waiting for game to be fetched
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400 font-bold">
            Loading game #{normalizedGameId}...
          </p>
        </div>
      </div>
    );
  }

  const currencyInfo = CURRENCY_INFO[currentGame.currency];
  const statusTag = getStatusTag(currentGame);
  const fillPct =
    currentGame.maxPlayers > 0
      ? Math.min(
          100,
          (currentGame.currentPlayerCount / currentGame.maxPlayers) * 100
        )
      : 0;
  const canJoin = currentGame.canJoin && !currentGame.isPlayer && !isJoining;
  const isCreator = currentGame.isCreator;

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 lg:mb-8">
          <button
            className="text-white/70 hover:text-white transition-colors flex items-center gap-2"
            onClick={() => router.push("/dashboard/games")}
          >
            <Icon name="arrow_back" className="text-[24px]" />
            <span className="text-sm font-black tracking-wide uppercase">
              Back to Games
            </span>
          </button>

          <span
            className={`px-3 py-1.5 rounded-full text-xs font-black tracking-widest border ${statusTag.color}`}
          >
            {statusTag.label}
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Game Info Card */}
            <div className="rounded-2xl border border-white/10 bg-surface/30 backdrop-blur-xl p-6 lg:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
                      {currentGame.name || `Game #${currentGame.gameId}`}
                    </h1>
                    {currentGame.isPlayer && (
                      <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black">
                        YOU JOINED
                      </span>
                    )}
                    {isCreator && (
                      <span className="px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-black">
                        CREATOR
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="font-mono">ID: {currentGame.gameId}</span>
                    {currentGame.creator &&
                      currentGame.creator.trim() !== "" && (
                        <>
                          <span className="text-white/30">•</span>
                          <span>
                            Created by:{" "}
                            <span className="text-primary font-bold">
                              {formatAddress(currentGame.creator)}
                            </span>
                          </span>
                        </>
                      )}
                  </div>
                </div>
              </div>

              {/* Game Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-gray-400 font-bold mb-1">
                    Entry Fee
                  </div>
                  <div className="text-lg font-black text-primary">
                    {currentGame.entryFee} {currencyInfo.symbol}
                  </div>
                  {currentGame.currency !== Currency.MNT && (
                    <div className="text-xs text-primary mt-1">
                      💰 {currencyInfo.apy}% APY
                    </div>
                  )}
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-gray-400 font-bold mb-1">
                    Players
                  </div>
                  <div className="text-lg font-black">
                    {currentGame.currentPlayerCount}/{currentGame.maxPlayers}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Min: {currentGame.minPlayers}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-gray-400 font-bold mb-1">
                    Prize Pool
                  </div>
                  <div className="text-lg font-black text-primary">
                    {parseFloat(currentGame.totalPrizePool).toFixed(4)}{" "}
                    {currencyInfo.symbol}
                  </div>
                  {parseFloat(currentGame.yieldAccumulated) > 0 && (
                    <div className="text-xs text-green-400 mt-1">
                      +{parseFloat(currentGame.yieldAccumulated).toFixed(4)}{" "}
                      yield
                    </div>
                  )}
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-gray-400 font-bold mb-1">
                    Status
                  </div>
                  <div className="text-lg font-black">
                    {currentGame.status === GameStatus.InProgress
                      ? `Round ${currentGame.currentRound}`
                      : currentGame.status === GameStatus.Countdown
                      ? "Starting Soon"
                      : "Waiting"}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2">
                  <span>Lobby Progress</span>
                  <span className="text-primary font-mono">
                    {fillPct.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar
                  value={currentGame.currentPlayerCount}
                  max={currentGame.maxPlayers}
                />
              </div>

              {/* Countdown Timer - Prominent Display */}
              {currentGame.status === GameStatus.Countdown &&
                timeRemaining !== null && (
                  <div className="mb-6 space-y-4">
                    {/* Warning Banner */}
                    <div className="rounded-xl bg-orange-500/20 border-2 border-orange-500/50 p-4 animate-pulse">
                      <div className="flex items-center justify-center gap-3">
                        <Icon
                          name="warning"
                          className="text-orange-400 text-2xl"
                        />
                        <span className="text-orange-300 font-black text-lg tracking-wide uppercase">
                          ⚠️ Game Starting Soon!
                        </span>
                      </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="rounded-2xl border-2 border-primary/50 bg-primary/10 backdrop-blur-xl p-8 text-center">
                      <div className="mb-4">
                        <div className="text-6xl lg:text-7xl font-black text-primary mb-2 font-mono tracking-wider drop-shadow-[0_0_20px_rgba(0,238,255,0.5)]">
                          {formatTime(timeRemaining)}
                        </div>
                        <p className="text-gray-300 font-bold text-sm uppercase tracking-widest">
                          Game starts in
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Icon name="group" className="text-primary" />
                          <span className="font-black">
                            {currentGame.currentPlayerCount}/
                            {currentGame.maxPlayers} Players
                          </span>
                        </div>
                        <span className="text-white/30">•</span>
                        <div className="flex items-center gap-2">
                          <Icon name="schedule" className="text-primary" />
                          <span className="font-black">
                            {currentGame.maxPlayers -
                              currentGame.currentPlayerCount}{" "}
                            slots remaining
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Join Button - Enhanced for Countdown */}
              {!currentGame.isPlayer && canJoin && (
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className={`w-full h-14 lg:h-16 rounded-xl font-black text-base tracking-wide transition-all shadow-[0_0_30px_rgba(0,238,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
                    currentGame.status === GameStatus.Countdown
                      ? "bg-orange-500 text-white hover:bg-orange-600 animate-pulse border-2 border-orange-400"
                      : "bg-primary text-background hover:bg-primary-hover"
                  }`}
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Joining...
                    </>
                  ) : currentGame.status === GameStatus.Countdown ? (
                    <>
                      ⚡ Join Now!
                      <Icon name="bolt" className="text-xl" />
                    </>
                  ) : (
                    <>
                      Join Game
                      <Icon name="arrow_forward" />
                    </>
                  )}
                </button>
              )}

              {currentGame.isPlayer && (
                <div className="w-full h-12 lg:h-14 rounded-xl bg-white/10 border border-white/20 text-white/70 font-black text-sm tracking-wide flex items-center justify-center gap-2">
                  <Icon name="check_circle" />
                  You&apos;re in this game
                </div>
              )}
            </div>

            {/* Players List - With Pulse Animation During Countdown */}
            <div className="rounded-2xl border border-white/10 bg-surface/30 backdrop-blur-xl p-6 lg:p-8">
              <h2 className="text-xl font-black mb-6">
                Players ({currentGame.currentPlayerCount})
              </h2>
              {currentGame.playerList &&
              Array.isArray(currentGame.playerList) &&
              currentGame.playerList.length > 0 ? (
                <div
                  className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${
                    currentGame.status === GameStatus.Countdown
                      ? "animate-pulse"
                      : ""
                  }`}
                >
                  {currentGame.playerList
                    .filter((address) => address && address.trim() !== "")
                    .map((address, index) => {
                      const isYou =
                        walletAddress?.toLowerCase() === address.toLowerCase();
                      const isGameCreator =
                        currentGame.creator &&
                        address.toLowerCase() ===
                          currentGame.creator.toLowerCase();
                      return (
                        <div
                          key={`${address}-${index}`}
                          className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                            isYou
                              ? "bg-primary/10 border-primary/30"
                              : currentGame.status === GameStatus.Countdown
                              ? "bg-orange-500/10 border-orange-500/30"
                              : "bg-white/5 border-white/10"
                          }`}
                        >
                          <Avatar
                            name={isYou ? "You" : formatAddress(address)}
                            status="ready"
                            size={48}
                            highlight={isYou}
                          />
                          <div className="mt-2 text-xs font-bold text-center">
                            <div className="text-white truncate w-full">
                              {isYou ? "You" : formatAddress(address)}
                            </div>
                            {isGameCreator && (
                              <div className="text-yellow-400 text-[10px] mt-1">
                                CREATOR
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {/* Empty slots for remaining players */}
                  {Array.from({
                    length:
                      currentGame.maxPlayers - currentGame.currentPlayerCount,
                  }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed min-h-[100px] ${
                        currentGame.status === GameStatus.Countdown
                          ? "border-orange-500/30 bg-orange-500/5 animate-pulse"
                          : "border-white/20 bg-white/5"
                      }`}
                    >
                      <Icon
                        name="person_add"
                        className={`text-2xl mb-2 ${
                          currentGame.status === GameStatus.Countdown
                            ? "text-orange-400"
                            : "text-white/30"
                        }`}
                      />
                      <div className="text-xs text-gray-500 font-bold">
                        Empty Slot
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Icon
                    name="group"
                    className="w-12 h-12 mx-auto mb-3 opacity-50"
                  />
                  <p className="font-bold">No players yet</p>
                  <p className="text-sm mt-1">Be the first to join!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Details Card */}
            <div className="rounded-2xl border border-white/10 bg-surface/30 backdrop-blur-xl p-6">
              <h3 className="text-lg font-black mb-4">Game Details</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className="font-bold text-white">
                    {currentGame.mode === 0
                      ? "Quick Play"
                      : currentGame.mode === 1
                      ? "Scheduled"
                      : "Private"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Currency:</span>
                  <span className="font-bold text-white">
                    {currencyInfo.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Min Players:</span>
                  <span className="font-bold text-white">
                    {currentGame.minPlayers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Players:</span>
                  <span className="font-bold text-white">
                    {currentGame.maxPlayers}
                  </span>
                </div>
                {currentGame.winner && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Winner:</span>
                    <span className="font-bold text-primary">
                      {formatAddress(currentGame.winner)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Yield Info */}
            {currentGame.currency !== Currency.MNT && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="trending_up" className="text-primary text-xl" />
                  <h3 className="text-lg font-black text-primary">
                    Yield Generation
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">APY:</span>
                    <span className="font-black text-primary">
                      {currencyInfo.apy}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Protocol:</span>
                    <span className="font-bold text-white">
                      {currencyInfo.protocolName}
                    </span>
                  </div>
                  {parseFloat(currentGame.yieldAccumulated) > 0 && (
                    <div className="mt-3 pt-3 border-t border-primary/20">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Accumulated:</span>
                        <span className="font-black text-green-400">
                          +{parseFloat(currentGame.yieldAccumulated).toFixed(4)}{" "}
                          {currencyInfo.symbol}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
