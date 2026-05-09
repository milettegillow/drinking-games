"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import PlayerSetup from "@/components/PlayerSetup";
import ModeToggle from "@/components/ModeToggle";
import ScoreTracker from "@/components/ScoreTracker";
import EndScreen from "@/components/EndScreen";
import LoadingState from "@/components/LoadingState";
import {
  CallYourBluffMode,
  CallYourBluffTrait,
  CALL_YOUR_BLUFF_MODES,
} from "@/lib/types";
import { generateXArray } from "@/lib/callYourBluff";
import { vibrate } from "@/lib/haptics";
import posthog from "posthog-js";

type Phase = "setup" | "loading" | "how-to-play" | "round" | "end";

const TOTAL_ROUNDS = 10;

const TIERS = [
  { minScore: 10, message: "Perfect read. The circle knows itself.", emoji: "🏆" },
  { minScore: 7, message: "Sharp instincts.", emoji: "🎯" },
  { minScore: 4, message: "A respectable showing.", emoji: "🙂" },
  { minScore: 1, message: "You all overclaimed.", emoji: "😬" },
  { minScore: 0, message: "Total bluff failure. Drink up.", emoji: "🍻" },
];

export default function CallYourBluffPage() {
  const { globalExcludeList, addToExcludeList } = useGame();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<CallYourBluffMode>("silly");
  const [playerCount, setPlayerCount] = useState(3);
  const [traits, setTraits] = useState<CallYourBluffTrait[]>([]);
  const [usedTraits, setUsedTraits] = useState<string[]>([]);
  const [xArray, setXArray] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [roundsWon, setRoundsWon] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef<number | null>(null);
  const hasEnded = useRef(false);
  const clickCount = useRef(0);
  const roundRef = useRef(1);

  useEffect(() => {
    startTime.current = Date.now();
    return () => {
      if (hasEnded.current || startTime.current === null) return;
      const duration = Math.round((Date.now() - (startTime.current ?? Date.now())) / 1000);
      const props = {
        game: "call-your-bluff",
        duration_seconds: duration,
        rounds_played: roundRef.current,
        total_clicks: clickCount.current,
        completed: false,
      };
      console.log("[Analytics]", "game_session_end", props);
      posthog.capture("game_session_end", props);
    };
  }, []);

  const currentTrait = traits[0];
  const currentX = xArray[round - 1] ?? 1;

  const fetchTraits = useCallback(
    async (m: CallYourBluffMode, exclude: string[]) => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "call-your-bluff",
          mode: m,
          count: 10,
          exclude,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.items as CallYourBluffTrait[];
    },
    []
  );

  const handleSetupStart = async (count: number) => {
    setPlayerCount(count);
    setXArray(generateXArray(count));
    console.log("[Analytics]", "call_your_bluff_game_start", { mode, playerCount: count });
    posthog.capture("call_your_bluff_game_start", { mode, playerCount: count });
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchTraits(mode, globalExcludeList);
      setTraits(items);
      setPhase("how-to-play");
    } catch (err) {
      console.log("[Analytics]", "api_error", { game: "call-your-bluff", error: String(err) });
      posthog.capture("api_error", { game: "call-your-bluff", error: String(err) });
      setError("Shuffling the deck... try again!");
    }
  };

  const retryFetch = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchTraits(mode, globalExcludeList);
      setTraits(items);
      setPhase("how-to-play");
    } catch (err) {
      console.log("[Analytics]", "api_error", { game: "call-your-bluff", error: String(err) });
      posthog.capture("api_error", { game: "call-your-bluff", error: String(err) });
      setError("Shuffling the deck... try again!");
    }
  }, [fetchTraits, mode, globalExcludeList]);

  const handleResult = (won: boolean) => {
    clickCount.current += 1;
    vibrate(30);
    const newRoundsWon = roundsWon + (won ? 1 : 0);
    setRoundsWon(newRoundsWon);

    const traitStr = currentTrait?.singular || "";
    const remaining = traits.slice(1);
    const newUsed = [...usedTraits, traitStr];
    setUsedTraits(newUsed);
    addToExcludeList([traitStr]);
    setTraits(remaining);

    console.log("[Analytics]", "call_your_bluff_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      mode,
      x: currentX,
      won,
    });
    posthog.capture("call_your_bluff_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      mode,
      x: currentX,
      won,
    });

    if (round >= TOTAL_ROUNDS) {
      console.log("[Analytics]", "call_your_bluff_game_complete", {
        roundsWon: newRoundsWon,
        mode,
        playerCount,
      });
      posthog.capture("call_your_bluff_game_complete", {
        roundsWon: newRoundsWon,
        mode,
        playerCount,
      });
      const duration = Math.round((Date.now() - (startTime.current ?? Date.now())) / 1000);
      const sessionProps = {
        game: "call-your-bluff",
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
      fetchTraits(mode, [...globalExcludeList, ...newUsed]).then((items) => {
        setTraits((prev) => [...prev, ...items]);
      });
    }
  };

  const handlePlayAgain = () => {
    setRound(1);
    setRoundsWon(0);
    setUsedTraits([]);
    setXArray(generateXArray(playerCount));
    startTime.current = Date.now();
    hasEnded.current = false;
    clickCount.current = 0;
    roundRef.current = 1;
    setPhase("setup");
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
            options={CALL_YOUR_BLUFF_MODES}
            value={mode}
            onChange={setMode}
            layoutId="cyb-mode-active"
          />
        </div>

        <PlayerSetup
          gameTitle="Call Your Bluff"
          requireNames={false}
          minPlayers={3}
          maxPlayers={16}
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
        Call Your Bluff
      </motion.h1>

      {phase === "round" && (
        <ScoreTracker
          round={round}
          totalRounds={TOTAL_ROUNDS}
          score={roundsWon}
          maxScore={TOTAL_ROUNDS}
          label="Won"
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

          {phase === "how-to-play" && (
            <motion.div
              key="how"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 mb-4">
                <h2 className="font-display text-2xl text-gold text-center mb-3">
                  Call Your Bluff
                </h2>
                <p className="font-body text-cream/70 text-sm leading-relaxed mb-3">
                  Each round, the prompt says how many of you can claim it.
                </p>
                <div className="bg-felt-dark/50 rounded-lg p-3 mb-3">
                  <p className="font-display text-cream text-sm text-center italic">
                    &quot;I am one of the <span className="text-gold font-bold">3 funniest</span> in the circle&quot;
                  </p>
                </div>
                <p className="font-body text-cream/70 text-sm leading-relaxed mb-3">
                  Stand up if you think this is you. After everyone stands or sits, tell us:
                </p>
                <p className="font-body text-cream/80 text-sm leading-relaxed mb-2">
                  <span className="text-gold">✓</span> Were 3 or fewer of you standing?{" "}
                  <span className="text-gold font-semibold">You called the bluff</span> — sitters drink.
                </p>
                <p className="font-body text-cream/80 text-sm leading-relaxed mb-3">
                  <span className="text-cream/60">✗</span> Were more than 3 standing?{" "}
                  <span className="text-cream font-semibold">You overclaimed</span> — standers drink.
                </p>
                <p className="font-body text-cream/50 text-xs leading-relaxed">
                  Score is how many rounds the group calls right. Ten rounds — let&apos;s go.
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  clickCount.current += 1;
                  vibrate(30);
                  setPhase("round");
                }}
                className="w-full py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide min-h-[48px]"
              >
                Got it
              </motion.button>
            </motion.div>
          )}

          {phase === "round" && currentTrait && (
            <motion.div
              key={`round-${round}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-full max-w-sm"
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 mb-4">
                {currentX === 1 ? (
                  <p className="font-display text-cream text-xl leading-snug text-center">
                    I am <span className="text-gold font-bold">THE</span>{" "}
                    {currentTrait.singular} in the circle
                  </p>
                ) : (
                  <p className="font-display text-cream text-xl leading-snug text-center">
                    I am one of the{" "}
                    <span className="text-gold font-bold">{currentX}</span>{" "}
                    {currentTrait.plural} in the circle
                  </p>
                )}
                <p className="font-body text-cream/40 text-xs text-center mt-3 italic">
                  Count down from 3 — stand up if you think this is you.
                </p>
              </div>

              <div className="bg-felt-dark/40 border border-gold/10 rounded-lg p-3 mb-4 text-xs leading-relaxed">
                <p className="font-body text-cream/70 mb-1">
                  <span className="text-gold">✓</span> If{" "}
                  <span className="font-semibold">{currentX} or fewer</span> stood: Group wins. Sitters drink.
                </p>
                <p className="font-body text-cream/70">
                  <span className="text-cream/60">✗</span> If{" "}
                  <span className="font-semibold">more than {currentX}</span> stood: Group loses. Standers drink.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleResult(true)}
                  className="py-4 px-4 rounded-lg bg-gold/20 border border-gold/30 text-gold font-display text-base font-bold tracking-wide min-h-[56px]"
                >
                  {currentX} or fewer stood ✓
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleResult(false)}
                  className="py-4 px-4 rounded-lg bg-felt-dark/60 border border-cream/20 text-cream font-display text-base font-bold tracking-wide min-h-[56px]"
                >
                  More than {currentX} stood ✗
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "end" && (
            <EndScreen
              key="end"
              score={roundsWon}
              maxScore={TOTAL_ROUNDS}
              tiers={TIERS}
              scoreLabel="Rounds Called Right"
              onPlayAgain={handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
