"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import PlayerSetup from "@/components/PlayerSetup";
import PlayerName from "@/components/PlayerName";
import PassPhone from "@/components/PassPhone";
import ScoreTracker from "@/components/ScoreTracker";
import EndScreen, { type EndSection } from "@/components/EndScreen";
import LoadingState from "@/components/LoadingState";
import { WouldYouRatherDilemma, WyrCategory, WYR_CATEGORIES } from "@/lib/types";
import { vibrate } from "@/lib/haptics";
import posthog from "posthog-js";

type Phase =
  | "setup"
  | "loading"
  | "pass"
  | "name-entry"
  | "vote"
  | "reveal"
  | "end";

const TOTAL_ROUNDS = 10;

type Vote = "A" | "B";

export default function WouldYouRatherPage() {
  const { playerNames, globalExcludeList, addToExcludeList, initPlayerNames } =
    useGame();
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState<WyrCategory>("shuffle");
  const [dilemmas, setDilemmas] = useState<WouldYouRatherDilemma[]>([]);
  const [usedDilemmas, setUsedDilemmas] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [voterIndex, setVoterIndex] = useState(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [minorityCounts, setMinorityCounts] = useState<number[]>([]);
  const [majorityCounts, setMajorityCounts] = useState<number[]>([]);
  const [nameEntryDone, setNameEntryDone] = useState<Set<number>>(new Set());
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

  const players = playerNames;
  const playerCount = players.length;
  const currentDilemma = dilemmas[0];

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
        setPhase("pass");
      } catch (err) {
        console.log("[Analytics]", "api_error", { game: "would-you-rather", error: String(err) });
        posthog.capture("api_error", { game: "would-you-rather", error: String(err) });
        setError("Shuffling the deck, try again.");
      }
    },
    [fetchDilemmas, usedDilemmas, globalExcludeList]
  );

  const handleSetupStart = (count: number) => {
    initPlayerNames(count);
    setMinorityCounts(Array.from({ length: count }, () => 0));
    setMajorityCounts(Array.from({ length: count }, () => 0));
    setNameEntryDone(new Set());
    console.log("[Analytics]", "wyr_game_start", { category, playerCount: count });
    posthog.capture("wyr_game_start", { category, playerCount: count });
    loadDilemmas(category);
  };

  const handleCategoryChange = (newCat: WyrCategory) => {
    if (newCat === category) return;
    vibrate(20);
    console.log("[Analytics]", "wyr_category_switch", { from: category, to: newCat });
    posthog.capture("wyr_category_switch", { from: category, to: newCat });
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

  const handlePassReady = () => {
    clickCount.current += 1;
    if (nameEntryDone.has(voterIndex)) {
      setPhase("vote");
    } else {
      setPhase("name-entry");
    }
  };

  const handleNameEntryReady = () => {
    clickCount.current += 1;
    vibrate(20);
    setNameEntryDone((prev) => {
      const next = new Set(prev);
      next.add(voterIndex);
      return next;
    });
    setPhase("vote");
  };

  const handleVote = (choice: Vote) => {
    clickCount.current += 1;
    vibrate(30);
    const newVotes = [...votes, choice];
    setVotes(newVotes);

    if (voterIndex + 1 >= playerCount) {
      setPhase("reveal");
    } else {
      setVoterIndex((i) => i + 1);
      setPhase("pass");
    }
  };

  const handleNext = () => {
    clickCount.current += 1;

    const aVoters = votes.map((v, i) => (v === "A" ? i : -1)).filter((i) => i >= 0);
    const bVoters = votes.map((v, i) => (v === "B" ? i : -1)).filter((i) => i >= 0);
    const aCount = aVoters.length;
    const bCount = bVoters.length;
    const isUnanimous = aCount === 0 || bCount === 0;
    const isTie = aCount === bCount;

    if (!isUnanimous && !isTie) {
      const minorityIndices = aCount < bCount ? aVoters : bVoters;
      const majorityIndices = aCount < bCount ? bVoters : aVoters;
      setMinorityCounts((prev) => {
        const next = [...prev];
        minorityIndices.forEach((idx) => {
          next[idx] = (next[idx] ?? 0) + 1;
        });
        return next;
      });
      setMajorityCounts((prev) => {
        const next = [...prev];
        majorityIndices.forEach((idx) => {
          next[idx] = (next[idx] ?? 0) + 1;
        });
        return next;
      });
    }

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

    console.log("[Analytics]", "wyr_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      aCount,
      bCount,
      category: currentDilemma?.category ?? category,
    });
    posthog.capture("wyr_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      aCount,
      bCount,
      category: currentDilemma?.category ?? category,
    });

    if (round >= TOTAL_ROUNDS) {
      console.log("[Analytics]", "wyr_game_complete", { category, playerCount });
      posthog.capture("wyr_game_complete", { category, playerCount });
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
    setVoterIndex(0);
    setVotes([]);

    if (remaining.length === 0) {
      setDilemmas([]);
      setPhase("loading");
      setError(null);
      fetchDilemmas(category, [...globalExcludeList, ...newUsed])
        .then((items) => {
          if (category === "shuffle") items = enforceShuffleOrder(items);
          setDilemmas(items);
          setPhase("pass");
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

    setPhase("pass");
  };

  const handlePlayAgain = () => {
    setRound(1);
    setVoterIndex(0);
    setVotes([]);
    setMinorityCounts(Array.from({ length: playerCount }, () => 0));
    setMajorityCounts(Array.from({ length: playerCount }, () => 0));
    setUsedDilemmas([]);
    setNameEntryDone(new Set());
    recentCategories.current = [];
    initPlayerNames(playerCount);
    startTime.current = Date.now();
    hasEnded.current = false;
    clickCount.current = 0;
    roundRef.current = 1;
    loadDilemmas(category);
  };

  const buildEndSections = (): EndSection[] => {
    const maxMinority = Math.max(...minorityCounts, 0);
    const maxMajority = Math.max(...majorityCounts, 0);

    const sections: EndSection[] = [];

    if (maxMinority > 0) {
      const indices = minorityCounts
        .map((c, i) => ({ count: c, i }))
        .filter((p) => p.count === maxMinority)
        .sort((a, b) => a.i - b.i)
        .map((p) => p.i);
      sections.push({
        emoji: "🔥",
        label: "Most Controversial",
        names: (
          <>
            {indices.map((i) => (
              <PlayerName key={i} index={i} size="md" />
            ))}
          </>
        ),
        subtitle: `In the minority ${maxMinority} ${maxMinority === 1 ? "time" : "times"}`,
      });
    }

    if (maxMajority > 0) {
      const indices = majorityCounts
        .map((c, i) => ({ count: c, i }))
        .filter((p) => p.count === maxMajority)
        .sort((a, b) => a.i - b.i)
        .map((p) => p.i);
      sections.push({
        emoji: "😴",
        label: "Least Interesting",
        names: (
          <>
            {indices.map((i) => (
              <PlayerName key={i} index={i} size="md" />
            ))}
          </>
        ),
        subtitle: `Voted with the crowd ${maxMajority} ${maxMajority === 1 ? "time" : "times"}`,
      });
    }

    return sections;
  };

  const showCategoryTabs =
    phase === "pass" || phase === "name-entry" || phase === "vote" || phase === "reveal";

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
          score={voterIndex}
          maxScore={playerCount}
          label="Voted"
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

          {phase === "pass" && players[voterIndex] !== undefined && (
            <PassPhone
              key={`pass-${round}-${voterIndex}`}
              player={<PlayerName index={voterIndex} size="lg" />}
              onReady={handlePassReady}
            />
          )}

          {phase === "name-entry" && (
            <motion.div
              key={`name-${round}-${voterIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-5"
            >
              <h2 className="font-display text-2xl text-cream text-center mt-4">
                What&apos;s your name?
              </h2>
              <PlayerName index={voterIndex} size="lg" prominent />
              <p className="font-body text-silver text-xs text-center">
                or tap Ready to play as Player {voterIndex + 1}
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleNameEntryReady}
                className="w-full py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide min-h-[48px]"
              >
                Ready
              </motion.button>
            </motion.div>
          )}

          {phase === "vote" && currentDilemma && players[voterIndex] !== undefined && (
            <motion.div
              key={`vote-${round}-${voterIndex}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-sm"
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 mb-4">
                <p className="font-body text-cream/50 text-xs mb-1 flex items-center gap-1 flex-wrap">
                  <PlayerName index={voterIndex} size="sm" />
                  <span>, would you rather...</span>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleVote("A")}
                  className="py-4 px-5 rounded-lg bg-gold/20 border border-gold/30 text-cream font-body text-sm font-medium text-left min-h-[56px] leading-relaxed"
                >
                  {currentDilemma.optionA}
                </motion.button>
                <p className="font-display text-gold/40 text-xs text-center">or</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleVote("B")}
                  className="py-4 px-5 rounded-lg bg-silver/20 border border-silver/30 text-cream font-body text-sm font-medium text-left min-h-[56px] leading-relaxed"
                >
                  {currentDilemma.optionB}
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "reveal" && currentDilemma && (
            <RevealScreen
              key={`reveal-${round}`}
              dilemma={currentDilemma}
              votes={votes}
              isLastRound={round >= TOTAL_ROUNDS}
              onNext={handleNext}
            />
          )}

          {phase === "end" && (
            (() => {
              const sections = buildEndSections();
              return (
                <EndScreen
                  key="end"
                  variant="sections"
                  sections={sections}
                  fallback={{
                    emoji: "🤝",
                    message: "Strangely well-balanced room tonight.",
                  }}
                  onPlayAgain={handlePlayAgain}
                />
              );
            })()
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface RevealScreenProps {
  dilemma: WouldYouRatherDilemma;
  votes: Vote[];
  isLastRound: boolean;
  onNext: () => void;
}

function RevealScreen({ dilemma, votes, isLastRound, onNext }: RevealScreenProps) {
  useEffect(() => {
    vibrate(50);
  }, []);

  const aVoters = votes
    .map((v, i) => (v === "A" ? i : -1))
    .filter((i) => i >= 0);
  const bVoters = votes
    .map((v, i) => (v === "B" ? i : -1))
    .filter((i) => i >= 0);

  const isUnanimous = aVoters.length === 0 || bVoters.length === 0;
  const isTie = aVoters.length === bVoters.length && aVoters.length > 0 && bVoters.length > 0;
  const everyoneDrinks = isUnanimous || isTie;

  const winningSide: "A" | "B" | null = everyoneDrinks
    ? null
    : aVoters.length > bVoters.length
      ? "A"
      : "B";

  const winningOption = winningSide === "A" ? dilemma.optionA : dilemma.optionB;
  const losingOption = winningSide === "A" ? dilemma.optionB : dilemma.optionA;
  const winningVoters = winningSide === "A" ? aVoters : bVoters;
  const losingVoters = winningSide === "A" ? bVoters : aVoters;

  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ transformStyle: "preserve-3d" }}
      className="w-full max-w-sm overflow-visible"
    >
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-4 mb-4">
        <p className="font-body text-cream/50 text-xs text-center mb-1">
          Would you rather...
        </p>
        <p className="font-body text-cream/80 text-sm text-center mb-1">
          {dilemma.optionA}
        </p>
        <p className="font-body text-cream/40 text-xs text-center mb-1">or</p>
        <p className="font-body text-cream/80 text-sm text-center">
          {dilemma.optionB}
        </p>
      </div>

      {everyoneDrinks ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="bg-gold/15 border border-gold/30 rounded-xl p-5 mb-4 text-center"
        >
          <p className="font-display text-gold text-2xl font-bold mb-1">
            Everyone drinks 🍸
          </p>
          <p className="font-body text-cream/60 text-xs">
            {isUnanimous ? "Unanimous." : "Perfect tie."}
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {/* Right answer (winning side) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl p-4 border-2 border-success-green bg-success-green/15"
          >
            <p className="font-body text-cream/70 text-xs uppercase tracking-wider mb-2 text-center">
              🟢 The Right Answer
            </p>
            <p className="font-display text-cream text-base text-center mb-3 leading-snug">
              {winningOption}
            </p>
            <p className="font-body text-cream/40 text-xs text-center mb-2">
              Voted by:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {winningVoters.map((idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-md bg-success-green/30 border border-success-green/50"
                >
                  <PlayerName index={idx} size="sm" />
                </span>
              ))}
            </div>
          </motion.div>

          {/* Wrong answer (losing side) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl p-4 border-2 border-alert-red bg-alert-red/15"
          >
            <p className="font-body text-cream/70 text-xs uppercase tracking-wider mb-2 text-center">
              🍸 Wrong, take a sip
            </p>
            <p className="font-display text-cream text-base text-center mb-3 leading-snug">
              {losingOption}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {losingVoters.map((idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-md bg-alert-red/30 border border-alert-red/50"
                >
                  <PlayerName index={idx} size="sm" />
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        className="w-full py-3 rounded-lg bg-gold/20 text-gold font-body text-sm font-medium min-h-[48px]"
      >
        {isLastRound ? "See Results" : "Next Round"}
      </motion.button>
    </motion.div>
  );
}
