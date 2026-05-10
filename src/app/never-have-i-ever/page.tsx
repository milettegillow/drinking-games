"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import PlayerSetup from "@/components/PlayerSetup";
import SpiceToggle from "@/components/SpiceToggle";
import ScoreTracker from "@/components/ScoreTracker";
import EndScreen from "@/components/EndScreen";
import LoadingState from "@/components/LoadingState";
import { SpiceLevel } from "@/lib/types";
import { vibrate } from "@/lib/haptics";
import posthog from "posthog-js";

type Phase = "setup" | "loading" | "statement" | "end";

const TOTAL_ROUNDS = 10;

const TIERS = [
  { minScore: 81, message: "The depravity is off the charts.", emoji: "😈" },
  { minScore: 61, message: "Genuinely concerning.", emoji: "🔥" },
  { minScore: 41, message: "A healthy amount of chaos.", emoji: "😏" },
  { minScore: 21, message: "Mostly behaved.", emoji: "🙂" },
  { minScore: 0, message: "Saints. Suspiciously clean.", emoji: "😇" },
];

export default function NeverHaveIEverPage() {
  const { globalExcludeList, addToExcludeList, initPlayerNames } = useGame();
  const [phase, setPhase] = useState<Phase>("setup");
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>("mild");
  const [playerCount, setPlayerCount] = useState(6);
  const [statements, setStatements] = useState<string[]>([]);
  const [usedStatements, setUsedStatements] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [yesCount, setYesCount] = useState(0);
  const [totalYeses, setTotalYeses] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef<number | null>(null);
  const hasEnded = useRef(false);
  const clickCount = useRef(0);
  const roundRef = useRef(1);

  useEffect(() => {
    startTime.current = Date.now();
    return () => {
      if (hasEnded.current || startTime.current === null) return;
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const props = {
        game: "never-have-i-ever",
        duration_seconds: duration,
        rounds_played: roundRef.current,
        total_clicks: clickCount.current,
        completed: false,
      };
      console.log("[Analytics]", "game_session_end", props);
      posthog.capture("game_session_end", props);
    };
  }, []);

  const currentStatement = statements[0];

  const fetchStatements = useCallback(
    async (level: SpiceLevel, exclude: string[]) => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "never-have-i-ever",
          spiceLevel: level,
          count: 10,
          exclude,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.items as string[];
    },
    []
  );

  const handleSetupStart = useCallback(
    async (count: number) => {
      setPlayerCount(count);
      initPlayerNames(count);
      console.log("[Analytics]", "nhie_game_start", { spiceLevel, playerCount: count });
      posthog.capture("nhie_game_start", { spiceLevel, playerCount: count });
      setPhase("loading");
      setError(null);
      try {
        const items = await fetchStatements(spiceLevel, globalExcludeList);
        setStatements(items);
        setPhase("statement");
      } catch (err) {
        console.log("[Analytics]", "api_error", { game: "never-have-i-ever", error: String(err) });
        posthog.capture("api_error", { game: "never-have-i-ever", error: String(err) });
        setError("Shuffling the deck, try again.");
      }
    },
    [fetchStatements, spiceLevel, globalExcludeList, initPlayerNames]
  );

  const retryFetch = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchStatements(spiceLevel, globalExcludeList);
      setStatements(items);
      setPhase("statement");
    } catch (err) {
      console.log("[Analytics]", "api_error", { game: "never-have-i-ever", error: String(err) });
      posthog.capture("api_error", { game: "never-have-i-ever", error: String(err) });
      setError("Shuffling the deck, try again.");
    }
  }, [fetchStatements, spiceLevel, globalExcludeList]);

  const submitYesCount = () => {
    clickCount.current += 1;
    vibrate(30);
    const newTotal = totalYeses + yesCount;
    setTotalYeses(newTotal);

    console.log("[Analytics]", "nhie_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      yesCount,
      playerCount,
      spiceLevel,
    });
    posthog.capture("nhie_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      yesCount,
      playerCount,
      spiceLevel,
    });

    const remaining = statements.slice(1);
    setUsedStatements((prev) => [...prev, currentStatement]);
    addToExcludeList([currentStatement]);
    setStatements(remaining);
    setYesCount(0);

    if (round >= TOTAL_ROUNDS) {
      const maxPossible = TOTAL_ROUNDS * playerCount;
      const depravity = Math.round((newTotal / maxPossible) * 100);
      console.log("[Analytics]", "nhie_game_complete", { depravity, spiceLevel, playerCount });
      posthog.capture("nhie_game_complete", { depravity, spiceLevel, playerCount });
      const duration = Math.round((Date.now() - (startTime.current ?? Date.now())) / 1000);
      const sessionProps = {
        game: "never-have-i-ever",
        duration_seconds: duration,
        rounds_played: round,
        total_clicks: clickCount.current,
        completed: true,
      };
      console.log("[Analytics]", "game_session_end", sessionProps);
      posthog.capture("game_session_end", sessionProps);
      hasEnded.current = true;
      setPhase("end");
      return;
    }

    setRound((r) => r + 1);
    roundRef.current = round + 1;

    if (remaining.length < 3) {
      fetchStatements(spiceLevel, [
        ...globalExcludeList,
        ...usedStatements,
        currentStatement,
      ]).then((items) => {
        setStatements((prev) => [...prev, ...items]);
      });
    }
  };

  const handlePlayAgain = () => {
    setRound(1);
    setTotalYeses(0);
    setYesCount(0);
    setUsedStatements([]);
    initPlayerNames(playerCount);
    startTime.current = Date.now();
    hasEnded.current = false;
    clickCount.current = 0;
    roundRef.current = 1;
    setPhase("setup");
  };

  const decrementYes = () => {
    if (yesCount <= 0) return;
    vibrate(15);
    setYesCount((y) => y - 1);
  };
  const incrementYes = () => {
    if (yesCount >= playerCount) return;
    vibrate(15);
    setYesCount((y) => y + 1);
  };

  const depravityPct =
    Math.round((totalYeses / (TOTAL_ROUNDS * playerCount || 1)) * 100);

  if (phase === "setup") {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center px-5 pb-6 safe-bottom"
        style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="w-full max-w-sm mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream/10 border border-gold/20 font-body text-cream/70 text-sm hover:bg-cream/15 hover:text-cream transition-colors"
          >
            ← Back
          </Link>
        </div>

        <div className="w-full max-w-sm mb-4">
          <p className="font-body text-cream/40 text-xs text-center mb-3">
            Choose your spice level
          </p>
          <SpiceToggle value={spiceLevel} onChange={setSpiceLevel} />
        </div>

        <PlayerSetup
          gameTitle="Never Have I Ever"
          minPlayers={3}
          maxPlayers={16}
          defaultPlayers={6}
          onStart={handleSetupStart}
        />
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] flex flex-col items-center px-5 overflow-hidden"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="w-full max-w-sm mb-2 shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream/10 border border-gold/20 font-body text-cream/70 text-sm hover:bg-cream/15 hover:text-cream transition-colors"
        >
          ← Back
        </Link>
      </div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display font-bold text-gold leading-tight mb-2 shrink-0"
        style={{ fontSize: "clamp(1.6rem, 7.5vw, 2.25rem)" }}
      >
        Never Have I Ever
      </motion.h1>

      {phase !== "end" && phase !== "loading" && (
        <ScoreTracker
          round={round}
          totalRounds={TOTAL_ROUNDS}
          score={totalYeses}
          label="Yeses"
        />
      )}

      <div className="flex-1 min-h-0 flex items-center justify-center w-full mt-2 overflow-y-auto">
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {error ? (
                <div className="text-center">
                  <p className="font-body text-cream/60 text-sm mb-3">{error}</p>
                  <button
                    onClick={retryFetch}
                    className="font-body text-gold text-sm underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <LoadingState />
              )}
            </motion.div>
          )}

          {phase === "statement" && currentStatement && (
            <motion.div
              key={`stmt-${round}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-full max-w-sm"
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-6 mb-5 relative overflow-visible">
                <p className="font-body text-cream/50 text-sm text-center mb-2">
                  Never have I ever...
                </p>
                <p className="font-display text-cream text-lg leading-relaxed text-center">
                  {currentStatement}
                </p>
              </div>

              <div className="bg-felt-dark/40 border border-gold/15 rounded-xl p-4">
                <p className="font-body text-cream/60 text-sm text-center mb-3">
                  How many of you have done this?
                </p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={decrementYes}
                    disabled={yesCount <= 0}
                    className="w-12 h-12 rounded-full bg-felt-dark/60 border border-gold/30 text-gold font-display text-2xl leading-none flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Decrease"
                  >
                    −
                  </motion.button>
                  <motion.span
                    key={yesCount}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="font-display text-cream text-4xl font-bold w-16 text-center tabular-nums"
                  >
                    {yesCount}
                  </motion.span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={incrementYes}
                    disabled={yesCount >= playerCount}
                    className="w-12 h-12 rounded-full bg-felt-dark/60 border border-gold/30 text-gold font-display text-2xl leading-none flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Increase"
                  >
                    +
                  </motion.button>
                </div>
                <p className="font-body text-cream/30 text-xs text-center mb-4">
                  out of {playerCount}
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={submitYesCount}
                  className="w-full py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide min-h-[48px]"
                >
                  {round >= TOTAL_ROUNDS ? "See Results" : "Next"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "end" && (
            <EndScreen
              key="end"
              score={depravityPct}
              maxScore={100}
              tiers={TIERS}
              scoreSuffix="%"
              scoreLabel="Depravity"
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
