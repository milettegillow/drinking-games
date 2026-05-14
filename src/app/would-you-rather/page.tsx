"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import PlayerSetup from "@/components/PlayerSetup";
import Countdown from "@/components/Countdown";
import ScoreTracker from "@/components/ScoreTracker";
import EndScreen from "@/components/EndScreen";
import LoadingState from "@/components/LoadingState";
import { WouldYouRatherDilemma, WyrCategory, WYR_CATEGORIES } from "@/lib/types";
import { vibrate } from "@/lib/haptics";
import posthog from "posthog-js";

type Phase =
  | "setup"
  | "loading"
  | "prompt"
  | "countdown"
  | "record"
  | "reveal"
  | "end";

type Winner = "A" | "B" | "tie";

const TOTAL_ROUNDS = 10;

export default function WouldYouRatherPage() {
  const { globalExcludeList, addToExcludeList } = useGame();
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState<WyrCategory>("shuffle");
  const [playerCount, setPlayerCount] = useState(6);
  const [dilemmas, setDilemmas] = useState<WouldYouRatherDilemma[]>([]);
  const [usedDilemmas, setUsedDilemmas] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recentCategories = useRef<string[]>([]);
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
        game: "would-you-rather",
        duration_seconds: duration,
        rounds_played: roundRef.current,
        total_clicks: clickCount.current,
        completed: false,
      };
      console.log("[Analytics]", "game_session_end", props);
      posthog.capture("game_session_end", props);
    };
  }, []);

  const currentDilemma = dilemmas[0];
  const showTieOption = playerCount % 2 === 0;

  const fetchDilemmas = useCallback(
    async (cat: WyrCategory, exclude: string[]) => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "would-you-rather",
          category: cat,
          count: 10,
          exclude,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.items as WouldYouRatherDilemma[];
    },
    []
  );

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
    async (cat: WyrCategory) => {
      setPhase("loading");
      setError(null);
      try {
        let items = await fetchDilemmas(cat, [...globalExcludeList, ...usedDilemmas]);
        if (cat === "shuffle") {
          items = enforceShuffleOrder(items);
        }
        setDilemmas(items);
        setPhase("prompt");
      } catch (err) {
        console.log("[Analytics]", "api_error", { game: "would-you-rather", error: String(err) });
        posthog.capture("api_error", { game: "would-you-rather", error: String(err) });
        setError("Shuffling the deck, try again.");
      }
    },
    [fetchDilemmas, usedDilemmas, globalExcludeList]
  );

  const handleSetupStart = (count: number) => {
    setPlayerCount(count);
    console.log("[Analytics]", "would_you_rather_game_start", { category, playerCount: count });
    posthog.capture("would_you_rather_game_start", { category, playerCount: count });
    loadDilemmas(category);
  };

  const handleCategoryChange = (newCat: WyrCategory) => {
    if (newCat === category) return;
    vibrate(20);
    console.log("[Analytics]", "would_you_rather_category_switch", { from: category, to: newCat });
    posthog.capture("would_you_rather_category_switch", { from: category, to: newCat });
    setCategory(newCat);
    if (newCat !== "shuffle") {
      const hasEnough = dilemmas.filter((d) => d.category === newCat).length >= 3;
      if (!hasEnough) {
        fetchDilemmas(newCat, [...globalExcludeList, ...usedDilemmas]).then((items) => {
          setDilemmas((prev) => [...prev, ...items]);
        });
      }
    }
  };

  const handleReady = () => {
    clickCount.current += 1;
    vibrate(20);
    setPhase("countdown");
  };

  const handleRecord = (chosen: Winner) => {
    clickCount.current += 1;
    vibrate(30);
    setWinner(chosen);
    setPhase("reveal");
  };

  const handleNext = () => {
    clickCount.current += 1;

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
    if (category !== "shuffle") {
      remaining = remaining.filter((d) => d.category === category);
    }

    const newUsed = [...usedDilemmas, dilemmaStr];
    setUsedDilemmas(newUsed);
    addToExcludeList([dilemmaStr]);

    console.log("[Analytics]", "would_you_rather_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      winner,
      category: currentDilemma?.category ?? category,
    });
    posthog.capture("would_you_rather_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      winner,
      category: currentDilemma?.category ?? category,
    });

    setWinner(null);

    if (round >= TOTAL_ROUNDS) {
      console.log("[Analytics]", "would_you_rather_game_complete", { category, playerCount });
      posthog.capture("would_you_rather_game_complete", { category, playerCount });
      const duration = Math.round(
        (Date.now() - (startTime.current ?? Date.now())) / 1000,
      );
      const sessionProps = {
        game: "would-you-rather",
        duration_seconds: duration,
        rounds_played: round,
        total_clicks: clickCount.current,
        completed: true,
      };
      console.log("[Analytics]", "game_session_end", sessionProps);
      posthog.capture("game_session_end", sessionProps);
      hasEnded.current = true;
      setDilemmas(remaining);
      setPhase("end");
      return;
    }

    setRound((r) => r + 1);
    roundRef.current = round + 1;

    if (remaining.length === 0) {
      setDilemmas([]);
      setPhase("loading");
      setError(null);
      fetchDilemmas(category, [...globalExcludeList, ...newUsed])
        .then((items) => {
          if (category === "shuffle") items = enforceShuffleOrder(items);
          setDilemmas(items);
          setPhase("prompt");
        })
        .catch((err) => {
          console.log("[Analytics]", "api_error", { game: "would-you-rather", error: String(err) });
          posthog.capture("api_error", { game: "would-you-rather", error: String(err) });
          setError("Shuffling the deck, try again.");
        });
      return;
    }

    setDilemmas(remaining);
    if (remaining.length < 3) {
      fetchDilemmas(category, [...globalExcludeList, ...newUsed]).then((items) => {
        setDilemmas((prev) => [...prev, ...items]);
      });
    }

    setPhase("prompt");
  };

  const handlePlayAgain = () => {
    setRound(1);
    setWinner(null);
    setUsedDilemmas([]);
    recentCategories.current = [];
    startTime.current = Date.now();
    hasEnded.current = false;
    clickCount.current = 0;
    roundRef.current = 1;
    loadDilemmas(category);
  };

  const showCategoryTabs =
    phase === "prompt" ||
    phase === "countdown" ||
    phase === "record" ||
    phase === "reveal";

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
            Choose a category
          </p>
          <div className="flex gap-1.5">
            {WYR_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  vibrate(20);
                  setCategory(cat.value);
                }}
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
        </div>

        <PlayerSetup
          gameTitle="Would You Rather"
          minPlayers={3}
          maxPlayers={16}
          defaultPlayers={6}
          onStart={handleSetupStart}
        />
      </div>
    );
  }

  // Reusable header card showing both options with thumbs.
  const renderPromptCard = (highlight?: Winner | null) => {
    if (!currentDilemma) return null;
    const aLost = highlight === "B";
    const bLost = highlight === "A";
    return (
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 w-full max-w-sm">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-xl text-gold leading-tight shrink-0">👍</span>
          <p className="font-display text-cream text-base leading-snug flex-1">
            {currentDilemma.optionA}
            {aLost && <span className="ml-1">🍸</span>}
          </p>
        </div>
        <p className="font-display text-gold/40 text-xs text-center my-2">or</p>
        <div className="flex items-start gap-2">
          <span className="text-xl text-gold leading-tight shrink-0">👎</span>
          <p className="font-display text-cream text-base leading-snug flex-1">
            {currentDilemma.optionB}
            {bLost && <span className="ml-1">🍸</span>}
          </p>
        </div>
      </div>
    );
  };

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
        style={{ fontSize: "clamp(1.75rem, 8vw, 2.5rem)" }}
      >
        Would You Rather
      </motion.h1>

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
          score={round - 1}
          maxScore={TOTAL_ROUNDS}
          label="Done"
        />
      )}

      <div className="flex-1 min-h-0 flex flex-col items-center justify-start w-full mt-3 overflow-y-auto gap-4">
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              {error ? (
                <div className="text-center">
                  <p className="font-body text-cream/60 text-sm mb-3">{error}</p>
                  <button
                    onClick={() => loadDilemmas(category)}
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

          {phase === "prompt" && currentDilemma && (
            <motion.div
              key={`prompt-${round}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-full max-w-sm flex flex-col items-center gap-4"
            >
              {renderPromptCard()}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleReady}
                className="w-full py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide min-h-[48px]"
              >
                Ready
              </motion.button>
            </motion.div>
          )}

          {phase === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-6"
            >
              {renderPromptCard()}
              <Countdown onComplete={() => setPhase("record")} />
            </motion.div>
          )}

          {phase === "record" && currentDilemma && (
            <motion.div
              key={`record-${round}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-4"
            >
              {renderPromptCard()}
              <div className="flex flex-col gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleRecord("A")}
                  className="bg-felt-light/40 border border-cream/30 text-cream font-display text-base font-bold tracking-wide rounded-xl py-4 px-4 min-h-[64px] flex items-center justify-center gap-2"
                >
                  <span className="text-lg">👍</span>
                  <span>won</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleRecord("B")}
                  className="bg-felt-light/40 border border-cream/30 text-cream font-display text-base font-bold tracking-wide rounded-xl py-4 px-4 min-h-[64px] flex items-center justify-center gap-2"
                >
                  <span className="text-lg">👎</span>
                  <span>won</span>
                </motion.button>
                {showTieOption && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleRecord("tie")}
                    className="bg-felt-dark/60 border border-gold/30 text-gold font-display text-base font-bold tracking-wide rounded-xl py-4 px-4 min-h-[64px] flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">⚖️</span>
                    <span>50/50</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {phase === "reveal" && currentDilemma && winner && (
            <motion.div
              key={`reveal-${round}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-full max-w-sm flex flex-col items-center gap-4"
            >
              <RevealBody dilemma={currentDilemma} winner={winner} />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className="w-full py-3 rounded-lg bg-gold/20 text-gold font-body text-sm font-medium min-h-[48px]"
              >
                {round >= TOTAL_ROUNDS ? "See Results" : "Next round"}
              </motion.button>
            </motion.div>
          )}

          {phase === "end" && (
            <EndScreen
              key="end"
              variant="custom"
              emoji="🃏"
              resultValue="10 rounds done"
              showCrowns={false}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface RevealBodyProps {
  dilemma: WouldYouRatherDilemma;
  winner: Winner;
}

function RevealBody({ dilemma, winner }: RevealBodyProps) {
  useEffect(() => {
    vibrate(50);
  }, []);

  if (winner === "tie") {
    return (
      <div className="w-full bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5">
        <p className="font-display text-gold text-2xl font-bold text-center mb-4">
          Everyone drinks 🍸
        </p>
        <div className="flex flex-col gap-2">
          <p className="font-display text-cream text-base text-center leading-snug">
            👍 {dilemma.optionA}
          </p>
          <p className="font-display text-gold/40 text-xs text-center">or</p>
          <p className="font-display text-cream text-base text-center leading-snug">
            👎 {dilemma.optionB}
          </p>
        </div>
      </div>
    );
  }

  const winningOption = winner === "A" ? dilemma.optionA : dilemma.optionB;
  const losingOption = winner === "A" ? dilemma.optionB : dilemma.optionA;
  const winningEmoji = winner === "A" ? "👍" : "👎";
  const losingEmoji = winner === "A" ? "👎" : "👍";

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Winning side, large */}
      <div className="bg-success-green/15 border-2 border-success-green rounded-xl p-5">
        <p className="font-body text-cream/70 text-xs uppercase tracking-wider text-center mb-2">
          {winningEmoji} won
        </p>
        <p className="font-display text-cream text-xl text-center leading-snug">
          {winningOption}
        </p>
      </div>

      {/* Losing side, smaller */}
      <div className="bg-alert-red/15 border border-alert-red/60 rounded-xl p-3">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-base">🍸</span>
          <p className="font-display text-cream text-sm leading-snug">
            {losingOption}
          </p>
        </div>
        <p className="font-body text-cream/50 text-xs text-center mt-1">
          if you voted {losingEmoji}, take a sip
        </p>
      </div>
    </div>
  );
}
