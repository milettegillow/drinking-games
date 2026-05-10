"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import PlayerSetup from "@/components/PlayerSetup";
import PlayerName from "@/components/PlayerName";
import ModeToggle from "@/components/ModeToggle";
import PassPhone from "@/components/PassPhone";
import ScoreTracker from "@/components/ScoreTracker";
import EndScreen, { type EndSection } from "@/components/EndScreen";
import LoadingState from "@/components/LoadingState";
import { MostLikelyToMode, MOST_LIKELY_TO_MODES } from "@/lib/types";
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

export default function MostLikelyToPage() {
  const { playerNames, globalExcludeList, addToExcludeList, initPlayerNames } =
    useGame();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<MostLikelyToMode>("silly");
  const [traits, setTraits] = useState<string[]>([]);
  const [usedTraits, setUsedTraits] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [voterIndex, setVoterIndex] = useState(0);
  const [votes, setVotes] = useState<number[]>([]);
  const [totalVotes, setTotalVotes] = useState<number[]>([]);
  const [nameEntryDone, setNameEntryDone] = useState<Set<number>>(new Set());
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
        game: "most-likely-to",
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
  const currentTrait = traits[0];

  const fetchTraits = useCallback(
    async (m: MostLikelyToMode, exclude: string[]) => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "most-likely-to",
          mode: m,
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

  const handleSetupStart = async (count: number) => {
    initPlayerNames(count);
    setTotalVotes(Array.from({ length: count }, () => 0));
    setNameEntryDone(new Set());
    console.log("[Analytics]", "most_likely_to_game_start", { mode, playerCount: count });
    posthog.capture("most_likely_to_game_start", { mode, playerCount: count });
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchTraits(mode, globalExcludeList);
      setTraits(items);
      setPhase("pass");
    } catch (err) {
      console.log("[Analytics]", "api_error", { game: "most-likely-to", error: String(err) });
      posthog.capture("api_error", { game: "most-likely-to", error: String(err) });
      setError("Shuffling the deck, try again.");
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

  const handleVote = (playerIdx: number) => {
    clickCount.current += 1;
    vibrate(30);
    const newVotes = [...votes, playerIdx];
    setVotes(newVotes);

    if (voterIndex + 1 >= playerCount) {
      const tally = Array.from({ length: playerCount }, () => 0);
      newVotes.forEach((idx) => {
        tally[idx] = (tally[idx] ?? 0) + 1;
      });
      setTotalVotes((prev) => prev.map((v, i) => v + tally[i]));
      setPhase("reveal");
    } else {
      setVoterIndex((i) => i + 1);
      setPhase("pass");
    }
  };

  const retryFetch = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchTraits(mode, globalExcludeList);
      setTraits(items);
      setPhase("pass");
    } catch (err) {
      console.log("[Analytics]", "api_error", { game: "most-likely-to", error: String(err) });
      posthog.capture("api_error", { game: "most-likely-to", error: String(err) });
      setError("Shuffling the deck, try again.");
    }
  }, [fetchTraits, mode, globalExcludeList]);

  const handleNext = () => {
    clickCount.current += 1;

    const traitStr = currentTrait || "";
    const remaining = traits.slice(1);
    const newUsed = [...usedTraits, traitStr];
    setUsedTraits(newUsed);
    addToExcludeList([traitStr]);

    console.log("[Analytics]", "most_likely_to_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      mode,
    });
    posthog.capture("most_likely_to_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      mode,
    });

    if (round >= TOTAL_ROUNDS) {
      console.log("[Analytics]", "most_likely_to_game_complete", { mode, playerCount });
      posthog.capture("most_likely_to_game_complete", { mode, playerCount });
      const duration = Math.round(
        (Date.now() - (startTime.current ?? Date.now())) / 1000,
      );
      const sessionProps = {
        game: "most-likely-to",
        duration_seconds: duration,
        rounds_played: round,
        total_clicks: clickCount.current,
        completed: true,
      };
      console.log("[Analytics]", "game_session_end", sessionProps);
      posthog.capture("game_session_end", sessionProps);
      hasEnded.current = true;
      setTraits(remaining);
      setPhase("end");
      return;
    }

    setRound((r) => r + 1);
    roundRef.current = round + 1;
    setVoterIndex(0);
    setVotes([]);

    if (remaining.length === 0) {
      setTraits([]);
      setPhase("loading");
      setError(null);
      fetchTraits(mode, [...globalExcludeList, ...newUsed])
        .then((items) => {
          setTraits(items);
          setPhase("pass");
        })
        .catch((err) => {
          console.log("[Analytics]", "api_error", { game: "most-likely-to", error: String(err) });
          posthog.capture("api_error", { game: "most-likely-to", error: String(err) });
          setError("Shuffling the deck, try again.");
        });
      return;
    }

    setTraits(remaining);
    if (remaining.length < 3) {
      fetchTraits(mode, [...globalExcludeList, ...newUsed]).then((items) => {
        setTraits((prev) => [...prev, ...items]);
      });
    }

    setPhase("pass");
  };

  const handlePlayAgain = () => {
    setRound(1);
    setVoterIndex(0);
    setVotes([]);
    setTotalVotes(Array.from({ length: playerCount }, () => 0));
    setUsedTraits([]);
    setNameEntryDone(new Set());
    initPlayerNames(playerCount);
    startTime.current = Date.now();
    hasEnded.current = false;
    clickCount.current = 0;
    roundRef.current = 1;
    setPhase("setup");
  };

  // For reveal: tally this round's votes (top 3)
  const thisRoundTally = (): { idx: number; count: number; voters: number[] }[] => {
    const tally: Record<number, { count: number; voters: number[] }> = {};
    votes.forEach((votedFor, voterIdx) => {
      if (!tally[votedFor]) tally[votedFor] = { count: 0, voters: [] };
      tally[votedFor].count += 1;
      tally[votedFor].voters.push(voterIdx);
    });
    const arr = Object.entries(tally).map(([idx, t]) => ({
      idx: Number(idx),
      count: t.count,
      voters: t.voters,
    }));
    return arr.sort((a, b) => b.count - a.count).slice(0, 3);
  };

  const buildEndSection = (): EndSection[] => {
    const max = Math.max(...totalVotes, 0);
    if (max === 0) {
      return [];
    }
    const indices = totalVotes
      .map((c, i) => ({ count: c, i }))
      .filter((p) => p.count === max)
      .sort((a, b) => a.i - b.i)
      .map((p) => p.i);
    return [
      {
        emoji: "👑",
        label: "Winner",
        names: (
          <>
            {indices.map((i) => (
              <PlayerName key={i} index={i} size="md" />
            ))}
          </>
        ),
        subtitle: `Voted for ${max} ${max === 1 ? "time" : "times"}`,
      },
    ];
  };

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
            Choose a mode
          </p>
          <ModeToggle
            options={MOST_LIKELY_TO_MODES}
            value={mode}
            onChange={setMode}
            layoutId="mlt-mode-active"
          />
        </div>

        <PlayerSetup
          gameTitle="Most Likely To"
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
        Most Likely To
      </motion.h1>

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

          {phase === "vote" && currentTrait && players[voterIndex] !== undefined && (
            <motion.div
              key={`vote-${round}-${voterIndex}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-sm"
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-4 mb-4">
                <div className="font-body text-cream/50 text-xs text-center mb-1 flex items-center justify-center gap-1 flex-wrap">
                  <PlayerName index={voterIndex} size="sm" />
                  <span>: who&apos;s most likely to</span>
                </div>
                <p className="font-display text-cream text-base text-center leading-snug">
                  {currentTrait}?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Render in seating order, exclude current voter. No shuffling. */}
                {players.map((_, idx) =>
                  idx === voterIndex ? null : (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleVote(idx)}
                      className="py-3 px-3 rounded-lg bg-felt-light/40 border border-gold/20 text-cream font-body text-sm font-medium min-h-[52px] leading-tight"
                    >
                      <PlayerName index={idx} size="sm" />
                    </motion.button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {phase === "reveal" && currentTrait && (
            <motion.div
              key={`reveal-${round}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-full max-w-sm overflow-visible"
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-4 mb-4">
                <p className="font-body text-cream/50 text-xs text-center mb-1">
                  Most likely to
                </p>
                <p className="font-display text-cream text-base text-center leading-snug">
                  {currentTrait}
                </p>
              </div>

              <div className="flex flex-col gap-2 mb-4">
                {thisRoundTally().map((entry, i) => (
                  <motion.div
                    key={entry.idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className={`rounded-lg p-3 ${
                      i === 0
                        ? "bg-gold/15 border border-gold/30"
                        : "bg-felt-dark/40 border border-gold/10"
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-1 gap-2">
                      <span className="flex items-baseline gap-1">
                        {i === 0 && <span>🍸</span>}
                        <PlayerName index={entry.idx} size="md" />
                      </span>
                      <span className="font-body text-gold text-sm">
                        {entry.count} {entry.count === 1 ? "vote" : "votes"}
                      </span>
                    </div>
                    <div className="font-body text-cream/50 text-xs flex items-baseline gap-1 flex-wrap">
                      <span>Voted by:</span>
                      {entry.voters.map((vIdx, j) => (
                        <span
                          key={vIdx}
                          className="inline-flex items-baseline gap-1"
                        >
                          <PlayerName index={vIdx} size="sm" />
                          {j < entry.voters.length - 1 && <span>,</span>}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className="w-full py-3 rounded-lg bg-gold/20 text-gold font-body text-sm font-medium min-h-[48px]"
              >
                {round >= TOTAL_ROUNDS ? "See Results" : "Next Round"}
              </motion.button>
            </motion.div>
          )}

          {phase === "end" && (
            <EndScreen
              key="end"
              variant="sections"
              sections={buildEndSection()}
              fallback={{
                emoji: "🤝",
                message: "No clear winner this round. Play again to crown one.",
              }}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
