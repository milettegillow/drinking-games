"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import SpiceToggle from "@/components/SpiceToggle";
import ScoreTracker from "@/components/ScoreTracker";
import EndScreen from "@/components/EndScreen";
import LoadingState from "@/components/LoadingState";
import { SpiceLevel } from "@/lib/types";
import { vibrate } from "@/lib/haptics";
import posthog from "posthog-js";

type Phase = "intro" | "loading" | "statement" | "end";

const TOTAL_ROUNDS = 10;
const MAX_SCORE = 20;

const TIERS = [
  { minScore: 16, message: "Wild Ones", emoji: "😈" },
  { minScore: 11, message: "Thrill Seekers", emoji: "🔥" },
  { minScore: 6, message: "A Little Adventurous", emoji: "😏" },
  { minScore: 0, message: "Innocent Angels", emoji: "😇" },
];

const POINT_OPTIONS = [
  { label: "Neither of us 😇", points: 0 },
  { label: "One of us 😏", points: 1 },
  { label: "Both of us 😈", points: 2 },
];

export default function NeverHaveIEverPage() {
  const { globalExcludeList, addToExcludeList } = useGame();
  const [phase, setPhase] = useState<Phase>("intro");
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>("mild");
  const [statements, setStatements] = useState<string[]>([]);
  const [usedStatements, setUsedStatements] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [pointsAdded, setPointsAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef(Date.now());
  const hasEnded = useRef(false);
  const clickCount = useRef(0);
  const roundRef = useRef(1);

  useEffect(() => {
    return () => {
      if (hasEnded.current) return;
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const props = { game: 'never-have-i-ever', duration_seconds: duration, rounds_played: roundRef.current, total_clicks: clickCount.current, completed: false };
      console.log('[Analytics]', 'game_session_end', props);
      posthog.capture('game_session_end', props);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const startGame = useCallback(async () => {
    console.log('[Analytics]', 'nhie_game_start', { spiceLevel });
    posthog.capture("nhie_game_start", { spiceLevel });
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchStatements(spiceLevel, globalExcludeList);
      setStatements(items);
      setPhase("statement");
    } catch (err) {
      console.log('[Analytics]', 'api_error', { game: "never-have-i-ever", error: String(err) });
      posthog.capture("api_error", { game: "never-have-i-ever", error: String(err) });
      setError("Shuffling the deck... try again!");
    }
  }, [fetchStatements, spiceLevel, globalExcludeList]);

  const handleAnswer = (points: number) => {
    clickCount.current += 1;
    vibrate(30);
    setScore((s) => s + points);
    setPointsAdded(points);
    console.log('[Analytics]', 'nhie_round_complete', { round, totalRounds: TOTAL_ROUNDS, answer: points, spiceLevel });
    posthog.capture("nhie_round_complete", { round, totalRounds: TOTAL_ROUNDS, answer: points, spiceLevel });

    // Show points briefly, then advance
    setTimeout(() => {
      setPointsAdded(null);

      const remaining = statements.slice(1);
      setUsedStatements((prev) => [...prev, currentStatement]);
      addToExcludeList([currentStatement]);
      setStatements(remaining);

      if (round >= TOTAL_ROUNDS) {
        console.log('[Analytics]', 'nhie_game_complete', { score: score + points, spiceLevel });
        posthog.capture("nhie_game_complete", { score: score + points, spiceLevel });
        const duration = Math.round((Date.now() - startTime.current) / 1000);
        const sessionProps = { game: 'never-have-i-ever', duration_seconds: duration, rounds_played: round, total_clicks: clickCount.current, completed: true };
        console.log('[Analytics]', 'game_session_end', sessionProps);
        posthog.capture('game_session_end', sessionProps);
        hasEnded.current = true;
        setPhase("end");
        return;
      }

      setRound((r) => r + 1);
      roundRef.current = round + 1;

      // Refetch if running low
      if (remaining.length < 3) {
        fetchStatements(spiceLevel, [...globalExcludeList, ...usedStatements, currentStatement]).then(
          (items) => {
            setStatements((prev) => [...prev, ...items]);
          }
        );
      }
    }, 600);
  };

  const handlePlayAgain = () => {
    setRound(1);
    setScore(0);
    setUsedStatements([]);
    setPointsAdded(null);
    startTime.current = Date.now();
    hasEnded.current = false;
    clickCount.current = 0;
    roundRef.current = 1;
    setPhase("intro");
  };

  if (phase === "intro") {
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
          style={{ fontSize: 'clamp(1.6rem, 7.5vw, 2.25rem)' }}
        >
          Never Have I Ever
        </motion.h1>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-start pt-2 w-full max-w-sm overflow-y-auto">
          <p className="font-body text-cream/50 text-xs text-center mb-6 max-w-xs">
            How adventurous are you as a couple? Score points for every experience
            you&apos;ve shared (or not!)
          </p>

          <div className="w-full mb-6">
            <p className="font-body text-cream/40 text-xs text-center mb-3">
              Choose your spice level
            </p>
            <SpiceToggle value={spiceLevel} onChange={setSpiceLevel} />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startGame}
            className="px-8 py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide min-h-[48px]"
          >
            Start Game
          </motion.button>
        </div>
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
      {/* Header */}
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
        style={{ fontSize: 'clamp(1.6rem, 7.5vw, 2.25rem)' }}
      >
        Never Have I Ever
      </motion.h1>

      {phase !== "end" && phase !== "loading" && (
        <ScoreTracker
          round={round}
          totalRounds={TOTAL_ROUNDS}
          score={score}
          maxScore={MAX_SCORE}
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
                    onClick={startGame}
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

                {/* Points animation */}
                <AnimatePresence>
                  {pointsAdded !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: 1, y: -30 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-2 right-4 font-display text-gold text-xl font-bold"
                    >
                      +{pointsAdded}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-3">
                {POINT_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.points}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAnswer(opt.points)}
                    disabled={pointsAdded !== null}
                    className="py-4 rounded-lg bg-felt-light/50 border border-gold/15 text-cream font-body text-sm font-medium min-h-[52px] disabled:opacity-50 transition-opacity"
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "end" && (
            <EndScreen
              key="end"
              score={score}
              maxScore={MAX_SCORE}
              tiers={TIERS}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
