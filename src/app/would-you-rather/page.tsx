"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import NameEntry from "@/components/NameEntry";
import PassPhone from "@/components/PassPhone";
import RevealResult from "@/components/RevealResult";
import ScoreTracker from "@/components/ScoreTracker";
import EndScreen from "@/components/EndScreen";
import LoadingState from "@/components/LoadingState";
import { WouldYouRatherDilemma, WyrCategory, WYR_CATEGORIES } from "@/lib/types";
import { vibrate } from "@/lib/haptics";
import posthog from "posthog-js";

type Phase =
  | "names"
  | "loading"
  | "pass-to-p1"
  | "p1-answer"
  | "pass-to-p2"
  | "p2-answer"
  | "reveal"
  | "end";

const TOTAL_ROUNDS = 10;

const TIERS = [
  { minScore: 9, message: "Scarily compatible!", emoji: "💕" },
  { minScore: 7, message: "Cut from the same cloth!", emoji: "😍" },
  { minScore: 5, message: "Some common ground!", emoji: "💛" },
  { minScore: 0, message: "Opposites attract!", emoji: "🌱" },
];

export default function WouldYouRatherPage() {
  const { playerNames, globalExcludeList, addToExcludeList } = useGame();
  const [phase, setPhase] = useState<Phase>("names");
  const [category, setCategory] = useState<WyrCategory>("shuffle");
  const [dilemmas, setDilemmas] = useState<WouldYouRatherDilemma[]>([]);
  const [usedDilemmas, setUsedDilemmas] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [p1Answer, setP1Answer] = useState<string | null>(null);
  const [p2Answer, setP2Answer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recentCategories = useRef<string[]>([]);
  const startTime = useRef(Date.now());
  const hasEnded = useRef(false);
  const clickCount = useRef(0);
  const roundRef = useRef(1);

  useEffect(() => {
    return () => {
      if (hasEnded.current) return;
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const props = { game: 'would-you-rather', duration_seconds: duration, rounds_played: roundRef.current, total_clicks: clickCount.current, completed: false };
      console.log('[Analytics]', 'game_session_end', props);
      posthog.capture('game_session_end', props);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentDilemma = dilemmas[0];

  const fetchDilemmas = useCallback(
    async (cat: WyrCategory, exclude: string[]) => {
      const requestBody = {
        game: "would-you-rather",
        category: cat,
        count: 10,
        exclude,
      };
      console.log("[WYR] Fetching dilemmas:", requestBody);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      console.log("[WYR] Received dilemmas:", data.items?.map((d: WouldYouRatherDilemma) => d.category));
      return data.items as WouldYouRatherDilemma[];
    },
    []
  );

  // For shuffle mode: reorder so no more than 2 from same category in a row
  const enforceShuffleOrder = (items: WouldYouRatherDilemma[]): WouldYouRatherDilemma[] => {
    if (items.length <= 1) return items;
    const result: WouldYouRatherDilemma[] = [];
    const remaining = [...items];

    for (let i = 0; i < items.length; i++) {
      const recentTwo = [
        ...(i === 0 ? recentCategories.current.slice(-2) : []),
        ...result.slice(-2).map((d) => d.category),
      ].slice(-2);

      const allSame = recentTwo.length === 2 && recentTwo[0] === recentTwo[1];

      let picked = -1;
      if (allSame) {
        picked = remaining.findIndex((d) => d.category !== recentTwo[0]);
      }
      if (picked === -1) picked = 0;

      result.push(remaining[picked]);
      remaining.splice(picked, 1);
    }

    return result;
  };

  const loadDilemmas = useCallback(
    async (cat?: WyrCategory) => {
      const targetCat = cat || category;
      setPhase("loading");
      setError(null);
      try {
        let items = await fetchDilemmas(targetCat, [...globalExcludeList, ...usedDilemmas]);
        if (targetCat === "shuffle") {
          items = enforceShuffleOrder(items);
        }
        setDilemmas(items);
        setPhase("pass-to-p1");
      } catch (err) {
        console.log('[Analytics]', 'api_error', { game: "would-you-rather", error: String(err) });
        posthog.capture("api_error", { game: "would-you-rather", error: String(err) });
        setError("Shuffling the deck... try again!");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchDilemmas, usedDilemmas, category, globalExcludeList]
  );

  const handleStart = () => {
    console.log('[Analytics]', 'wyr_game_start', { category });
    posthog.capture("wyr_game_start", { category });
    loadDilemmas();
  };

  const handleCategoryChange = (newCat: WyrCategory) => {
    vibrate(20);
    console.log('[Analytics]', 'wyr_category_switch', { from: category, to: newCat });
    posthog.capture("wyr_category_switch", { from: category, to: newCat });
    setCategory(newCat);
    console.log("[WYR] Category changed to:", newCat);
    // Don't touch the current dilemmas list — the category change
    // takes effect on the NEXT question (handled in handleNext).
    // Background-fetch for the new category so items are ready.
    if (newCat !== "shuffle") {
      const hasEnough = dilemmas.filter((d) => d.category === newCat).length >= 3;
      if (!hasEnough) {
        fetchDilemmas(newCat, [...globalExcludeList, ...usedDilemmas]).then((items) => {
          setDilemmas((prev) => [...prev, ...items]);
        });
      }
    }
  };

  const handleP1Answer = (answer: string) => {
    clickCount.current += 1;
    vibrate(30);
    setP1Answer(answer);
    setPhase("pass-to-p2");
  };

  const handleP2Answer = (answer: string) => {
    clickCount.current += 1;
    vibrate(30);
    setP2Answer(answer);
    console.log('[Debug WYR]', `Category: ${category}`, currentDilemma ? `| Question category: ${currentDilemma.category}` : '');
    const matched = answer === p1Answer;
    if (matched) setScore((s) => s + 1);
    console.log('[Analytics]', 'wyr_round_complete', { round, totalRounds: TOTAL_ROUNDS, matched, category: currentDilemma?.category ?? category });
    posthog.capture("wyr_round_complete", { round, totalRounds: TOTAL_ROUNDS, matched, category: currentDilemma?.category ?? category });
    setPhase("reveal");
  };

  const getNextDilemma = (remaining: WouldYouRatherDilemma[]): WouldYouRatherDilemma[] => {
    if (category !== "shuffle" || remaining.length <= 1) return remaining;

    const recentTwo = recentCategories.current.slice(-2);
    const allSame = recentTwo.length === 2 && recentTwo[0] === recentTwo[1];

    if (allSame && remaining[0]?.category === recentTwo[0]) {
      const swapIdx = remaining.findIndex((d) => d.category !== recentTwo[0]);
      if (swapIdx > 0) {
        const reordered = [...remaining];
        const [swapped] = reordered.splice(swapIdx, 1);
        reordered.unshift(swapped);
        return reordered;
      }
    }
    return remaining;
  };

  const handleNext = () => {
    clickCount.current += 1;
    setP1Answer(null);
    setP2Answer(null);

    const dilemmaStr = currentDilemma
      ? `${currentDilemma.optionA} or ${currentDilemma.optionB}`
      : "";

    if (currentDilemma) {
      recentCategories.current = [
        ...recentCategories.current.slice(-3),
        currentDilemma.category,
      ];
    }

    let remaining = dilemmas.slice(1);
    // For non-shuffle, filter to current category
    if (category !== "shuffle") {
      remaining = remaining.filter((d) => d.category === category);
    }
    remaining = getNextDilemma(remaining);

    const newUsed = [...usedDilemmas, dilemmaStr];
    setUsedDilemmas(newUsed);
    addToExcludeList([dilemmaStr]);

    if (round >= TOTAL_ROUNDS) {
      console.log('[Analytics]', 'wyr_game_complete', { score, category });
      posthog.capture("wyr_game_complete", { score, category });
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const sessionProps = { game: 'would-you-rather', duration_seconds: duration, rounds_played: round, total_clicks: clickCount.current, completed: true };
      console.log('[Analytics]', 'game_session_end', sessionProps);
      posthog.capture('game_session_end', sessionProps);
      hasEnded.current = true;
      setDilemmas(remaining);
      setPhase("end");
      return;
    }

    setRound((r) => r + 1);
    roundRef.current = round + 1;

    // If no items left for the selected category, fetch immediately
    if (remaining.length === 0) {
      setDilemmas([]);
      setPhase("loading");
      setError(null);
      fetchDilemmas(category, [...globalExcludeList, ...newUsed])
        .then((items) => {
          if (category === "shuffle") {
            items = enforceShuffleOrder(items);
          }
          setDilemmas(items);
          setPhase("pass-to-p1");
        })
        .catch((err) => {
          console.log('[Analytics]', 'api_error', { game: "would-you-rather", error: String(err) });
          posthog.capture("api_error", { game: "would-you-rather", error: String(err) });
          setError("Shuffling the deck... try again!");
        });
      return;
    }

    setDilemmas(remaining);

    // Background refetch if running low
    if (remaining.length < 3) {
      fetchDilemmas(category, [...globalExcludeList, ...newUsed]).then((items) => {
        setDilemmas((prev) => [...prev, ...items]);
      });
    }

    setPhase("pass-to-p1");
  };

  const handlePlayAgain = () => {
    setRound(1);
    setScore(0);
    setP1Answer(null);
    setP2Answer(null);
    setUsedDilemmas([]);
    recentCategories.current = [];
    startTime.current = Date.now();
    hasEnded.current = false;
    clickCount.current = 0;
    roundRef.current = 1;
    loadDilemmas();
  };

  if (phase === "names") {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center px-5 pb-6 safe-bottom"
        style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="w-full max-w-sm mb-4">
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
          className="font-display font-bold text-gold leading-tight mb-4"
          style={{ fontSize: 'clamp(1.75rem, 8vw, 2.5rem)' }}
        >
          Would You Rather
        </motion.h1>

        <div className="flex-1 flex flex-col items-center justify-start pt-4 w-full max-w-sm">
          <p className="font-body text-cream/50 text-xs text-center mb-4 max-w-xs">
            Do you think alike? Pick the same answer to score!
          </p>

          {/* Category tabs on intro screen */}
          <div className="flex gap-1.5 mb-6 w-full">
            {WYR_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { vibrate(20); setCategory(cat.value); }}
                className={`relative flex-1 py-2 rounded-lg font-body text-xs font-medium transition-colors min-h-[36px] ${
                  category === cat.value
                    ? "bg-gold/20 border border-gold/30 text-gold"
                    : "bg-felt-dark/50 border border-gold/10 text-cream/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <NameEntry onStart={handleStart} />
        </div>
      </div>
    );
  }

  const showCategoryTabs =
    phase === "pass-to-p1" ||
    phase === "p1-answer" ||
    phase === "pass-to-p2" ||
    phase === "p2-answer" ||
    phase === "reveal";

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
        style={{ fontSize: 'clamp(1.75rem, 8vw, 2.5rem)' }}
      >
        Would You Rather
      </motion.h1>

      {/* Category tabs */}
      {showCategoryTabs && (
        <div className="flex gap-1.5 mb-2 w-full max-w-sm shrink-0">
          {WYR_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              className={`relative flex-1 py-2 rounded-lg font-body text-xs font-medium transition-colors min-h-[36px] ${
                category === cat.value
                  ? "bg-gold/20 border border-gold/30 text-gold"
                  : "bg-felt-dark/50 border border-gold/10 text-cream/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {phase !== "end" && phase !== "loading" && (
        <ScoreTracker
          round={round}
          totalRounds={TOTAL_ROUNDS}
          score={score}
          maxScore={TOTAL_ROUNDS}
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
                    onClick={() => loadDilemmas()}
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

          {phase === "pass-to-p1" && playerNames && (
            <PassPhone
              key="pass-p1"
              playerName={playerNames.player1}
              onReady={() => { clickCount.current += 1; setPhase("p1-answer"); }}
            />
          )}

          {phase === "p1-answer" && currentDilemma && playerNames && (
            <motion.div
              key={`p1-${round}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-sm"
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 mb-4">
                <p className="font-body text-cream/50 text-xs mb-1">
                  {playerNames.player1}, would you rather...
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleP1Answer("A")}
                  className="py-4 px-5 rounded-lg bg-gold/20 border border-gold/30 text-cream font-body text-sm font-medium text-left min-h-[56px] leading-relaxed"
                >
                  {currentDilemma.optionA}
                </motion.button>
                <p className="font-display text-gold/40 text-xs text-center">
                  or
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleP1Answer("B")}
                  className="py-4 px-5 rounded-lg bg-silver/20 border border-silver/30 text-cream font-body text-sm font-medium text-left min-h-[56px] leading-relaxed"
                >
                  {currentDilemma.optionB}
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "pass-to-p2" && playerNames && (
            <PassPhone
              key="pass"
              playerName={playerNames.player2}
              onReady={() => { clickCount.current += 1; setPhase("p2-answer"); }}
            />
          )}

          {phase === "p2-answer" && currentDilemma && playerNames && (
            <motion.div
              key={`p2-${round}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-sm"
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 mb-4">
                <p className="font-body text-cream/50 text-xs mb-1">
                  {playerNames.player2}, would you rather...
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleP2Answer("A")}
                  className="py-4 px-5 rounded-lg bg-gold/20 border border-gold/30 text-cream font-body text-sm font-medium text-left min-h-[56px] leading-relaxed"
                >
                  {currentDilemma.optionA}
                </motion.button>
                <p className="font-display text-gold/40 text-xs text-center">
                  or
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleP2Answer("B")}
                  className="py-4 px-5 rounded-lg bg-silver/20 border border-silver/30 text-cream font-body text-sm font-medium text-left min-h-[56px] leading-relaxed"
                >
                  {currentDilemma.optionB}
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "reveal" && currentDilemma && playerNames && p1Answer && p2Answer && (
            <RevealResult
              key={`reveal-${round}`}
              question={`Would you rather ${currentDilemma.optionA} or ${currentDilemma.optionB}?`}
              player1Name={playerNames.player1}
              player2Name={playerNames.player2}
              player1Answer={
                p1Answer === "A"
                  ? currentDilemma.optionA
                  : currentDilemma.optionB
              }
              player2Answer={
                p2Answer === "A"
                  ? currentDilemma.optionA
                  : currentDilemma.optionB
              }
              matched={p1Answer === p2Answer}
              onNext={handleNext}
              matchMessage="Great minds think alike!"
              mismatchMessage="Opposites attract!"
            />
          )}

          {phase === "end" && (
            <EndScreen
              key="end"
              score={score}
              maxScore={TOTAL_ROUNDS}
              tiers={TIERS}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
