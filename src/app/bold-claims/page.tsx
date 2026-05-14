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
import Countdown from "@/components/Countdown";
import {
  BoldClaimsMode,
  BoldClaimsTrait,
  BOLD_CLAIMS_MODES,
} from "@/lib/types";
import { generateXArray } from "@/lib/boldClaims";
import { vibrate } from "@/lib/haptics";
import posthog from "posthog-js";

type Phase =
  | "setup"
  | "loading"
  | "prompt"
  | "instructions"
  | "countdown"
  | "outcome"
  | "end";

const TOTAL_ROUNDS = 10;

const TIERS = [
  { minScore: 10, message: "Perfect read. The circle knows itself.", emoji: "🏆" },
  { minScore: 7, message: "Sharp instincts.", emoji: "🎯" },
  { minScore: 4, message: "A respectable showing.", emoji: "🙂" },
  { minScore: 1, message: "You all overclaimed.", emoji: "😬" },
  { minScore: 0, message: "Total bluff failure. Drink up.", emoji: "🍻" },
];

export default function BoldClaimsPage() {
  const { globalExcludeList, addToExcludeList, initPlayerNames, resetPlayerNames } =
    useGame();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<BoldClaimsMode>("silly");
  const [playerCount, setPlayerCount] = useState(6);
  const [traits, setTraits] = useState<BoldClaimsTrait[]>([]);
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
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const props = {
        game: "bold-claims",
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
    async (m: BoldClaimsMode, exclude: string[]) => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "bold-claims",
          mode: m,
          count: 10,
          exclude,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.items as BoldClaimsTrait[];
    },
    []
  );

  const handleSetupStart = async (count: number) => {
    setPlayerCount(count);
    initPlayerNames(count);
    setXArray(generateXArray(count));
    console.log("[Analytics]", "bold_claims_game_start", { mode, playerCount: count });
    posthog.capture("bold_claims_game_start", { mode, playerCount: count });
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchTraits(mode, globalExcludeList);
      setTraits(items);
      setPhase("prompt");
    } catch (err) {
      console.log("[Analytics]", "api_error", { game: "bold-claims", error: String(err) });
      posthog.capture("api_error", { game: "bold-claims", error: String(err) });
      setError("Shuffling the deck, try again.");
    }
  };

  const retryFetch = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchTraits(mode, globalExcludeList);
      setTraits(items);
      setPhase("prompt");
    } catch (err) {
      console.log("[Analytics]", "api_error", { game: "bold-claims", error: String(err) });
      posthog.capture("api_error", { game: "bold-claims", error: String(err) });
      setError("Shuffling the deck, try again.");
    }
  }, [fetchTraits, mode, globalExcludeList]);

  const handlePromptNext = () => {
    clickCount.current += 1;
    vibrate(20);
    if (round === 1) {
      setPhase("instructions");
    } else {
      setPhase("countdown");
    }
  };

  const handleInstructionsNext = () => {
    clickCount.current += 1;
    vibrate(20);
    setPhase("countdown");
  };

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

    console.log("[Analytics]", "bold_claims_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      mode,
      x: currentX,
      won,
    });
    posthog.capture("bold_claims_round_complete", {
      round,
      totalRounds: TOTAL_ROUNDS,
      mode,
      x: currentX,
      won,
    });

    if (round >= TOTAL_ROUNDS) {
      console.log("[Analytics]", "bold_claims_game_complete", {
        roundsWon: newRoundsWon,
        mode,
        playerCount,
      });
      posthog.capture("bold_claims_game_complete", {
        roundsWon: newRoundsWon,
        mode,
        playerCount,
      });
      const duration = Math.round(
        (Date.now() - (startTime.current ?? Date.now())) / 1000,
      );
      const sessionProps = {
        game: "bold-claims",
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
    setPhase("prompt");

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
    initPlayerNames(playerCount);
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
            onClick={resetPlayerNames}
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
            options={BOLD_CLAIMS_MODES}
            value={mode}
            onChange={setMode}
            layoutId="bc-mode-active"
          />
        </div>

        <PlayerSetup
          gameTitle="Bold Claims"
          minPlayers={3}
          maxPlayers={16}
          defaultPlayers={6}
          onStart={handleSetupStart}
        />
      </div>
    );
  }

  // The header prompt is shown across prompt / instructions / countdown / outcome.
  const renderPromptCard = () => {
    if (!currentTrait) return null;
    return (
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 w-full max-w-sm">
        {currentX === 1 ? (
          <p className="font-display text-cream text-xl leading-snug text-center">
            I am{" "}
            <span className="text-gold font-bold text-2xl">THE</span>{" "}
            <span className="text-gold font-bold text-2xl">
              {currentTrait.singular}
            </span>{" "}
            in the circle
          </p>
        ) : (
          <p className="font-display text-cream text-xl leading-snug text-center">
            I am one of the{" "}
            <span className="text-gold font-bold text-2xl">{currentX}</span>{" "}
            <span className="text-gold font-bold text-2xl">
              {currentTrait.plural}
            </span>{" "}
            in the circle
          </p>
        )}
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
          onClick={resetPlayerNames}
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
        Bold Claims
      </motion.h1>

      {(phase === "prompt" ||
        phase === "instructions" ||
        phase === "countdown" ||
        phase === "outcome") && (
        <ScoreTracker
          round={round}
          totalRounds={TOTAL_ROUNDS}
          score={roundsWon}
          maxScore={TOTAL_ROUNDS}
          label="Won"
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

          {phase === "prompt" && currentTrait && (
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
                onClick={handlePromptNext}
                className="w-full py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide min-h-[48px]"
              >
                {round === 1 ? "Next" : "Ready"}
              </motion.button>
            </motion.div>
          )}

          {phase === "instructions" && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-4"
            >
              {renderPromptCard()}
              <div className="bg-felt-dark/50 border border-gold/15 rounded-xl p-4 w-full">
                <p className="font-body text-cream/90 text-sm leading-relaxed mb-3">
                  After the countdown,{" "}
                  <span className="text-gold font-bold uppercase">
                    Stand up
                  </span>{" "}
                  if you think the statement applies to you.
                </p>
                <p className="font-body text-cream/90 text-sm leading-relaxed">
                  Then we&apos;ll{" "}
                  <span className="text-gold font-bold uppercase">Count</span>,
                  and the group decides if too many of you stood.
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleInstructionsNext}
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
              <Countdown onComplete={() => setPhase("outcome")} />
            </motion.div>
          )}

          {phase === "outcome" && (
            <motion.div
              key={`outcome-${round}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-4"
            >
              {renderPromptCard()}

              {round === 1 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="font-body text-silver text-sm text-center"
                >
                  Look around. Count who&apos;s standing.
                </motion.p>
              )}

              <div className="flex flex-col gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleResult(true)}
                  className="bg-success-green border-2 border-success-green text-cream font-display text-base font-bold tracking-wide rounded-xl py-4 px-4 min-h-[80px] flex flex-col items-center justify-center gap-1 shadow-lg"
                >
                  <span className="text-lg">
                    {currentX === 1
                      ? "Nobody or just 1 stood up"
                      : `${currentX} or fewer stood up`}
                  </span>
                  <span className="font-body text-cream/80 text-xs font-normal normal-case tracking-normal">
                    Group called it right
                  </span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleResult(false)}
                  className="bg-alert-red border-2 border-alert-red text-cream font-display text-base font-bold tracking-wide rounded-xl py-4 px-4 min-h-[80px] flex flex-col items-center justify-center gap-1 shadow-lg"
                >
                  <span className="text-lg">
                    More than {currentX} stood up
                  </span>
                  <span className="font-body text-cream/80 text-xs font-normal normal-case tracking-normal">
                    Overclaimed
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "end" && (
            <motion.div
              key="end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex items-center justify-center"
            >
              <EndScreen
                score={roundsWon}
                maxScore={TOTAL_ROUNDS}
                tiers={TIERS}
                scoreLabel="Rounds Called Right"
                onPlayAgain={handlePlayAgain}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
