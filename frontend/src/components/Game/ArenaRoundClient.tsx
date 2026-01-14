"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";
import { useGames, GameData } from "@/hooks/useGames";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { useGameManager } from "@/hooks/useGameManager";
import { Choice, GameStatus, CURRENCY_INFO } from "@/lib/contract-types";

function formatTime(seconds: number | null) {
  if (seconds === null) return "--:--";
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const s = (clamped % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function RingTimer({
  seconds,
  maxSeconds = 60,
}: {
  seconds: number | null;
  maxSeconds?: number;
}) {
  const pct =
    seconds === null || seconds <= 0
      ? 0
      : Math.max(0, Math.min(1, seconds / maxSeconds));
  const dash = 2 * Math.PI * 44;
  const offset = dash * (1 - pct);
  return (
    <div className="relative size-28">
      <svg className="absolute inset-0" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(0,238,255,0.9)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] font-black tracking-[0.25em] text-white/50 uppercase">
          Time left
        </div>
        <div className="text-3xl font-black tabular-nums">
          {formatTime(seconds)}
        </div>
      </div>
    </div>
  );
}

export default function ArenaRoundClient({ matchId }: { matchId: string }) {
  const router = useRouter();
  const { walletAddress } = useConnectActions();
  const { fetchGameById, refreshGames } = useGames(walletAddress || undefined);
  const {
    makeChoice,
    getPlayerInfo,
    getRoundInfo,
    isLoading: isGameManagerLoading,
    error: gameManagerError,
  } = useGameManager();

  const [game, setGame] = React.useState<GameData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playerInfo, setPlayerInfo] = React.useState<{
    hasMadeChoice: boolean;
    choice?: Choice;
    eliminated: boolean;
  } | null>(null);
  const [roundInfo, setRoundInfo] = React.useState<{
    deadline: number;
    processed: boolean;
    winningChoice?: Choice;
    roundNumber?: number;
    blockchainTimestamp?: number;
  } | null>(null);
  const [roundTimeRemaining, setRoundTimeRemaining] = React.useState<
    number | null
  >(null);
  const [countdownTimeRemaining, setCountdownTimeRemaining] = React.useState<
    number | null
  >(null);
  const [isMakingChoice, setIsMakingChoice] = React.useState(false);
  const [pollTick, setPollTick] = React.useState(0);

  // Poll game + round state
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!matchId) return;
      setError(null);
      try {
        const g = await fetchGameById(matchId);
        if (cancelled) return;
        setGame(g || null);
        if (!g) return;

        // Redirect if completed
        if (g.status === GameStatus.Completed) {
          if (
            walletAddress &&
            g.winner?.toLowerCase() === walletAddress.toLowerCase()
          ) {
            router.replace(`/arena/${matchId}/victory`);
          } else {
            router.replace(`/arena/${matchId}/defeat`);
          }
          return;
        }

        // Fetch player info for both Countdown and InProgress status
        // During countdown, show overlay with countdown timer
        // During InProgress, show round UI with choice buttons
        if (
          walletAddress &&
          (g.status === GameStatus.Countdown ||
            g.status === GameStatus.InProgress)
        ) {
          const pInfo = await getPlayerInfo(matchId);
          if (cancelled) return;

          // Check elimination FIRST - if eliminated, redirect immediately
          if (pInfo?.eliminated) {
            router.replace(`/arena/${matchId}/defeat`);
            return;
          }

          setPlayerInfo(
            pInfo
              ? {
                  hasMadeChoice: pInfo.hasMadeChoice,
                  choice: pInfo.choice,
                  eliminated: pInfo.eliminated,
                }
              : null
          );

          // Only fetch round info if game is InProgress and round exists
          if (g.status === GameStatus.InProgress && g.currentRound > 0) {
            const rInfo = await getRoundInfo(matchId, g.currentRound);
            if (cancelled) return;

            if (rInfo && rInfo.deadline && rInfo.deadline > 0) {
              setRoundInfo({ ...rInfo, roundNumber: rInfo.roundNumber });
              const blockchainTime = rInfo.blockchainTimestamp
                ? rInfo.blockchainTimestamp +
                  (Math.floor(Date.now() / 1000) - rInfo.blockchainTimestamp)
                : Math.floor(Date.now() / 1000);
              const remaining = Math.max(0, rInfo.deadline - blockchainTime);
              setRoundTimeRemaining(remaining);
            } else {
              // Round doesn't exist yet or deadline is invalid
              setRoundInfo(null);
              setRoundTimeRemaining(null);
            }
          } else {
            // Game is in Countdown - no round yet
            setRoundInfo(null);
            setRoundTimeRemaining(null);
          }

          // Calculate countdown timer if game is in Countdown status
          if (g.status === GameStatus.Countdown && g.countdownDeadline) {
            const now = Math.floor(Date.now() / 1000);
            const remaining = Math.max(0, g.countdownDeadline - now);
            setCountdownTimeRemaining(remaining);
          } else {
            setCountdownTimeRemaining(null);
          }
        } else {
          setPlayerInfo(null);
          setRoundInfo(null);
          setRoundTimeRemaining(null);
          setCountdownTimeRemaining(null);
        }
      } catch (err) {
        console.error("Failed to load round:", err);
        if (!cancelled) {
          setError("Unable to load game state. Please retry.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    fetchGameById,
    getPlayerInfo,
    getRoundInfo,
    matchId,
    router,
    walletAddress,
    pollTick,
  ]);

  // Store the blockchain timestamp offset for accurate time calculation
  const [blockchainTimeOffset, setBlockchainTimeOffset] = React.useState<
    number | null
  >(null);

  // Update countdown timer every second when game is in Countdown
  React.useEffect(() => {
    if (game?.status !== GameStatus.Countdown || !game.countdownDeadline) {
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, game.countdownDeadline! - now);
      setCountdownTimeRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [game?.status, game?.countdownDeadline]);

  // Sync timer with contract deadline - uses blockchain time for accuracy
  React.useEffect(() => {
    if (!roundInfo?.deadline || !game) {
      setRoundTimeRemaining(null);
      return;
    }

    // Calculate offset between blockchain time and local time when we fetched the data
    if (roundInfo.blockchainTimestamp) {
      const localTimeWhenFetched = Math.floor(Date.now() / 1000);
      const offset = roundInfo.blockchainTimestamp - localTimeWhenFetched;
      setBlockchainTimeOffset(offset);
    }

    const updateTimer = () => {
      // Use blockchain time if we have the offset, otherwise use local time
      // This ensures we're calculating based on blockchain time, not local machine time
      const blockchainTime =
        blockchainTimeOffset !== null
          ? Math.floor(Date.now() / 1000) + blockchainTimeOffset
          : Math.floor(Date.now() / 1000);

      const remaining = Math.max(0, roundInfo.deadline - blockchainTime);
      setRoundTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [
    roundInfo?.deadline,
    roundInfo?.blockchainTimestamp,
    game,
    blockchainTimeOffset,
  ]);

  // Poll every 5s to refresh state and re-sync with contract
  React.useEffect(() => {
    const t = setInterval(() => setPollTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // Re-sync round deadline from contract every poll tick to ensure exact sync with blockchain
  React.useEffect(() => {
    if (!game || game.status !== GameStatus.InProgress || !walletAddress)
      return;

    const syncWithContract = async () => {
      try {
        // Re-fetch round info from contract to get exact deadline and current blockchain time
        const rInfo = await getRoundInfo(game.gameId, game.currentRound);
        if (rInfo?.deadline) {
          // Update roundInfo state with fresh contract data including blockchain timestamp
          setRoundInfo({ ...rInfo, roundNumber: rInfo.roundNumber });

          // Update blockchain time offset for accurate calculation
          if (rInfo.blockchainTimestamp) {
            const localTimeNow = Math.floor(Date.now() / 1000);
            const offset = rInfo.blockchainTimestamp - localTimeNow;
            setBlockchainTimeOffset(offset);
          }

          // Calculate remaining time using blockchain time
          const blockchainTime =
            rInfo.blockchainTimestamp || Math.floor(Date.now() / 1000);
          const remaining = Math.max(0, rInfo.deadline - blockchainTime);
          setRoundTimeRemaining(remaining);
        }
      } catch (err) {
        console.error("Failed to sync timer with contract:", err);
      }
    };

    syncWithContract();
  }, [pollTick, game, walletAddress, getRoundInfo]);

  const handleMakeChoice = async (choice: Choice) => {
    if (!game || !walletAddress || isMakingChoice) return;

    // Check if round exists and has valid deadline
    if (!roundInfo || !roundInfo.deadline || roundInfo.deadline === 0) {
      setError("Round has not started yet. Please wait...");
      return;
    }

    // Use blockchain time for deadline check (not local time)
    // If we have blockchain timestamp offset, use it; otherwise use local time as fallback
    const blockchainTime =
      blockchainTimeOffset !== null
        ? Math.floor(Date.now() / 1000) + blockchainTimeOffset
        : roundInfo.blockchainTimestamp
        ? roundInfo.blockchainTimestamp +
          (Math.floor(Date.now() / 1000) - (roundInfo.blockchainTimestamp || 0))
        : Math.floor(Date.now() / 1000);

    if (blockchainTime >= roundInfo.deadline) {
      setError("Round time has expired. Please wait for the next round.");
      return;
    }

    // Check if player already made choice
    if (playerInfo?.hasMadeChoice) {
      setError("You have already made your choice for this round.");
      return;
    }

    // Check if round time remaining is valid
    if (roundTimeRemaining !== null && roundTimeRemaining <= 0) {
      setError("Round time has expired. Please wait for the next round.");
      return;
    }

    setIsMakingChoice(true);
    setError(null);

    try {
      console.log(
        `[ArenaRoundClient] Making choice: ${
          choice === Choice.Head ? "Head" : "Tail"
        } for game ${game.gameId}`
      );

      const ok = await makeChoice(game.gameId, choice);

      if (ok) {
        console.log("[ArenaRoundClient] Choice made successfully!");
        // Refresh game state immediately (silent - no loading state)
        await refreshGames(true);
        setPollTick((x) => x + 1);
        // Also fetch updated player info
        if (walletAddress) {
          const updatedPlayerInfo = await getPlayerInfo(game.gameId);
          if (updatedPlayerInfo) {
            setPlayerInfo({
              hasMadeChoice: updatedPlayerInfo.hasMadeChoice,
              choice: updatedPlayerInfo.choice,
              eliminated: updatedPlayerInfo.eliminated,
            });
          }
        }
      } else {
        setError("Failed to submit choice. Please try again.");
      }
    } catch (err) {
      console.error("[ArenaRoundClient] makeChoice failed:", err);

      // Parse error message
      let errorMessage = "Failed to submit choice. Please try again.";
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        if (
          errMsg.includes("round time expired") ||
          errMsg.includes("round expired")
        ) {
          errorMessage =
            "Round time has expired. Please wait for the next round.";
        } else if (errMsg.includes("choice already made")) {
          errorMessage = "You have already made your choice for this round.";
        } else if (
          errMsg.includes("user rejected") ||
          errMsg.includes("user denied")
        ) {
          errorMessage = "Transaction cancelled. Please try again.";
        } else if (errMsg.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction.";
        } else {
          errorMessage = err.message || errorMessage;
        }
      }

      setError(errorMessage);
    } finally {
      setIsMakingChoice(false);
    }
  };

  const currencyInfo = game ? CURRENCY_INFO[game.currency] : null;

  const showChoiceUI =
    game &&
    game.status === GameStatus.InProgress &&
    playerInfo &&
    !playerInfo.eliminated &&
    roundInfo &&
    roundInfo.deadline &&
    roundInfo.deadline > 0 &&
    roundTimeRemaining !== null &&
    roundTimeRemaining > 0;

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="mx-auto w-full max-w-md lg:max-w-5xl lg:px-10 lg:py-10">
        <div className="relative overflow-hidden lg:rounded-[32px] lg:border lg:border-white/10 lg:bg-surface/10">
          {/* Top bar */}
          <header className="flex items-center justify-between px-5 pt-10 pb-4 lg:pt-6 lg:pb-6">
            <button
              className="text-white/70 hover:text-white transition-colors"
              onClick={() => router.push("/dashboard")}
              aria-label="Close"
            >
              <Icon name="close" className="text-[24px]" />
            </button>

            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="size-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-xs font-black tracking-widest">
                {game ? `ROUND ${game.currentRound}` : "ROUND --"}
              </span>
              <span className="text-xs text-white/60">
                {game?.status === GameStatus.InProgress ? "LIVE" : "WAITING"}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-surface border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg">
              <div className="flex items-center justify-center size-6 rounded-full bg-primary/20 text-primary">
                <Icon name="account_balance_wallet" className="text-[16px]" />
              </div>
              <span className="text-sm font-bold tracking-wide text-white">
                {currencyInfo
                  ? `${currencyInfo.symbol} ${game?.entryFee}`
                  : "--"}
              </span>
            </div>
          </header>

          <main className="px-5 pb-10 lg:px-10">
            {error && (
              <div className="mb-4 rounded-2xl border border-red-400/40 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {isLoading || !game ? (
              <div className="py-12 text-center text-white/60">
                Loading game...
              </div>
            ) : game.status !== GameStatus.Countdown &&
              game.status !== GameStatus.InProgress ? (
              <div className="py-12 text-center text-white/70">
                Game is not live yet. Please return to the waiting room.
              </div>
            ) : !roundInfo || !roundInfo.deadline ? (
              <div className="py-12 text-center text-white/70">
                <div className="text-lg font-black mb-2">⏳ Round Starting</div>
                <div className="text-sm text-white/60">
                  Waiting for round to begin. Please wait...
                </div>
              </div>
            ) : !playerInfo ? (
              <div className="py-12 text-center text-white/70">
                Fetching your player status...
              </div>
            ) : playerInfo.eliminated ? (
              <div className="py-12 text-center text-white/70">
                You have been eliminated. Redirecting...
              </div>
            ) : (
              <>
                {/* Countdown Overlay - Show when game is in Countdown status */}
                {game.status === GameStatus.Countdown &&
                  countdownTimeRemaining !== null && (
                    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
                      <div className="text-center max-w-md px-6">
                        <RingTimer
                          seconds={countdownTimeRemaining}
                          maxSeconds={60}
                        />
                        <div className="mt-6 text-2xl font-black text-white mb-2">
                          ⏳ Waiting for Others to Join
                        </div>
                        <div className="text-white/70 text-sm mb-4">
                          Game will start in{" "}
                          {formatTime(countdownTimeRemaining)}
                        </div>
                        <div className="text-white/50 text-xs">
                          Minimum players have joined. The game will begin
                          automatically when the countdown ends.
                        </div>
                      </div>
                    </div>
                  )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-white/10 bg-surface/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-black">
                      Prize pool
                    </div>
                    <div className="text-3xl font-black mt-1">
                      {currencyInfo
                        ? `${currencyInfo.symbol} ${game.totalPrizePool}`
                        : "--"}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-surface/20 p-4 text-right">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-black">
                      Current yield
                    </div>
                    <div className="text-2xl font-black mt-1 text-primary">
                      {currencyInfo
                        ? `${currencyInfo.symbol} ${game.yieldAccumulated}`
                        : "--"}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center">
                  {game.status === GameStatus.InProgress &&
                  roundTimeRemaining !== null ? (
                    <>
                      <RingTimer seconds={roundTimeRemaining} />
                      <div className="mt-3 text-xs text-white/45">
                        Make your choice to survive
                      </div>
                    </>
                  ) : game.status === GameStatus.Countdown &&
                    countdownTimeRemaining !== null ? (
                    <>
                      <RingTimer seconds={countdownTimeRemaining} />
                      <div className="mt-3 text-xs text-white/45">
                        Game starting soon...
                      </div>
                    </>
                  ) : null}
                  {game.status === GameStatus.InProgress &&
                    roundInfo?.deadline && (
                      <div className="mt-2 text-white/60 text-xs">
                        Round deadline:{" "}
                        {new Date(
                          roundInfo.deadline * 1000
                        ).toLocaleTimeString()}
                      </div>
                    )}
                  {game.status === GameStatus.InProgress &&
                    roundTimeRemaining !== null && (
                      <div className="mt-1 text-white/50 text-xs">
                        Time remaining: {formatTime(roundTimeRemaining)}
                      </div>
                    )}
                  {game.status === GameStatus.Countdown &&
                    countdownTimeRemaining !== null && (
                      <div className="mt-1 text-white/50 text-xs">
                        Countdown: {formatTime(countdownTimeRemaining)}
                      </div>
                    )}
                </div>

                {/* Only show choice UI when game is InProgress and round is active */}
                {showChoiceUI && game.status === GameStatus.InProgress && (
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {/* HEAD Card */}
                    <button
                      onClick={() => {
                        if (
                          !playerInfo.hasMadeChoice &&
                          !isMakingChoice &&
                          roundTimeRemaining !== null &&
                          roundTimeRemaining > 0
                        ) {
                          handleMakeChoice(Choice.Head);
                        }
                      }}
                      disabled={
                        playerInfo.hasMadeChoice ||
                        isMakingChoice ||
                        isGameManagerLoading ||
                        roundTimeRemaining === null ||
                        roundTimeRemaining <= 0
                      }
                      className={`rounded-3xl border overflow-hidden relative transition-all ${
                        playerInfo.hasMadeChoice ||
                        isMakingChoice ||
                        isGameManagerLoading ||
                        roundTimeRemaining === null ||
                        roundTimeRemaining <= 0
                          ? "border-white/10 bg-surface/10 opacity-50 cursor-not-allowed"
                          : playerInfo.choice === Choice.Head
                          ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(0,238,255,0.4)] scale-105"
                          : "border-white/10 bg-surface/15 hover:border-primary/50 hover:scale-[1.02]"
                      }`}
                    >
                      <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-black z-10">
                        HEAD
                      </div>
                      <div className="h-56 lg:h-64 bg-linear-to-b from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                        <div className="text-8xl lg:text-9xl">👤</div>
                      </div>
                      <div className="p-5">
                        <div className="text-2xl font-black tracking-tight mb-4">
                          HEAD
                        </div>
                        <div
                          className={`w-full h-12 rounded-2xl font-black tracking-wide flex items-center justify-center ${
                            playerInfo.hasMadeChoice || isMakingChoice
                              ? "bg-white/5 border border-white/10 text-white/40"
                              : playerInfo.choice === Choice.Head
                              ? "bg-primary text-background shadow-[0_0_25px_rgba(0,238,255,0.5)]"
                              : "bg-primary/20 border border-primary/30 text-primary"
                          }`}
                        >
                          {isMakingChoice && playerInfo.choice === Choice.Head
                            ? "Submitting..."
                            : playerInfo.hasMadeChoice &&
                              playerInfo.choice === Choice.Head
                            ? "✓ Selected"
                            : "HEAD"}
                        </div>
                      </div>
                    </button>

                    {/* TAIL Card */}
                    <button
                      onClick={() => {
                        if (
                          !playerInfo.hasMadeChoice &&
                          !isMakingChoice &&
                          roundTimeRemaining !== null &&
                          roundTimeRemaining > 0
                        ) {
                          handleMakeChoice(Choice.Tail);
                        }
                      }}
                      disabled={
                        playerInfo.hasMadeChoice ||
                        isMakingChoice ||
                        isGameManagerLoading ||
                        roundTimeRemaining === null ||
                        roundTimeRemaining <= 0
                      }
                      className={`rounded-3xl border overflow-hidden relative transition-all ${
                        playerInfo.hasMadeChoice ||
                        isMakingChoice ||
                        isGameManagerLoading ||
                        roundTimeRemaining === null ||
                        roundTimeRemaining <= 0
                          ? "border-white/10 bg-surface/10 opacity-50 cursor-not-allowed"
                          : playerInfo.choice === Choice.Tail
                          ? "border-secondary bg-secondary/10 shadow-[0_0_30px_rgba(255,0,255,0.4)] scale-105"
                          : "border-white/10 bg-surface/15 hover:border-secondary/50 hover:scale-[1.02]"
                      }`}
                    >
                      <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-secondary/15 border border-secondary/25 text-secondary text-xs font-black z-10">
                        TAIL
                      </div>
                      <div className="h-56 lg:h-64 bg-linear-to-b from-secondary/10 via-secondary/5 to-transparent flex items-center justify-center">
                        <div className="text-8xl lg:text-9xl">🎯</div>
                      </div>
                      <div className="p-5">
                        <div className="text-2xl font-black tracking-tight mb-4">
                          TAIL
                        </div>
                        <div
                          className={`w-full h-12 rounded-2xl font-black tracking-wide flex items-center justify-center ${
                            playerInfo.hasMadeChoice || isMakingChoice
                              ? "bg-white/5 border border-white/10 text-white/40"
                              : playerInfo.choice === Choice.Tail
                              ? "bg-secondary text-background shadow-[0_0_25px_rgba(255,0,255,0.5)]"
                              : "bg-secondary/20 border border-secondary/30 text-secondary"
                          }`}
                        >
                          {isMakingChoice && playerInfo.choice === Choice.Tail
                            ? "Submitting..."
                            : playerInfo.hasMadeChoice &&
                              playerInfo.choice === Choice.Tail
                            ? "✓ Selected"
                            : "TAIL"}
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {playerInfo.hasMadeChoice && (
                  <div className="mt-4 rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-center">
                    <div className="text-green-200 font-black text-lg mb-1">
                      ✓ Choice Submitted Successfully!
                    </div>
                    <div className="text-green-300 text-sm">
                      You chose{" "}
                      {playerInfo.choice === Choice.Head ? "HEAD" : "TAIL"}.
                      Waiting for round result...
                    </div>
                  </div>
                )}

                {roundTimeRemaining !== null &&
                  roundTimeRemaining <= 0 &&
                  !playerInfo.hasMadeChoice &&
                  !playerInfo.eliminated && (
                    <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center">
                      <div className="text-red-200 font-black text-lg mb-1">
                        ⏱️ Round Time Expired
                      </div>
                      <div className="text-red-300 text-sm">
                        The round deadline has passed. Please wait for the next
                        round or round processing.
                      </div>
                    </div>
                  )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
