"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import PlayerSetup from "@/components/PlayerSetup";
import ModeToggle from "@/components/ModeToggle";
import Countdown from "@/components/Countdown";
import ScoreTracker from "@/components/ScoreTracker";
import EndScreen from "@/components/EndScreen";
import LoadingState from "@/components/LoadingState";
import { MostLikelyToMode, MOST_LIKELY_TO_MODES } from "@/lib/types";
import { vibrate } from "@/lib/haptics";
import posthog from "posthog-js";

type Phase = "setup" | "loading" | "prompt" | "countdown" | "point" | "end";

const TOTAL_ROUNDS = 10;
const POINT_FLASH_MS = 1500;

export default function MostLikelyToPage() {
  const { globalExcludeList, addToExcludeList } = useGame();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<MostLikelyToMode>("silly");
  const [playerCount, setPlayerCount] = useState(6);
  const [traits, setTraits] = useState<string[]>([]);
  const [usedTraits, setUsedTraits] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [showPointFlash, setShowPointFlash] = useState(false);
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

  // POINT! flashes for ~1.5s then settles into the "Take a sip" view.
  // The setState calls here synchronise React state with a timer (an external
  // system), which is the legitimate use case for an effect.
  useEffect(() => {
    if (phase !== "point") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowPointFlash(true);
    vibrate(60);
    const t = setTimeout(() => setShowPointFlash(false), POINT_FLASH_MS);
    return () => clearTimeout(t);
  }, [phase]);

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
    setPlayerCount(count);
    console.log("[Analytics]", "most_likely_to_game_start", { mode, playerCount: count });
    posthog.capture("most_likely_to_game_start", { mode, playerCount: count });
    setPhase("loading");
    setError(null);
    try {
      const items = await fetchTraits(mode, globalExcludeList);
      setTraits(items);
      setPhase("prompt");
    } catch (err) {
      console.log("[Analytics]", "api_error", { game: "most-likely-to", error: String(err) });
      posthog.capture("api_error", { game: "most-likely-to", error: String(err) });
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
      console.log("[Analytics]", "api_error", { game: "most-likely-to", error: String(err) });
      posthog.capture("api_error", { game: "most-likely-to", error: String(err) });
      setError("Shuffling the deck, try again.");
    }
  }, [fetchTraits, mode, globalExcludeList]);

  const handleReady = () => {
    clickCount.current += 1;
    vibrate(20);
    setPhase("countdown");
  };

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

    if (remaining.length === 0) {
      setTraits([]);
      setPhase("loading");
      setError(null);
      fetchTraits(mode, [...globalExcludeList, ...newUsed])
        .then((items) => {
          setTraits(items);
          setPhase("prompt");
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

    setPhase("prompt");
  };

  const handlePlayAgain = () => {
    setRound(1);
    setUsedTraits([]);
    setShowPointFlash(false);
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

  // Reusable prompt card. `compact` shrinks the type a bit for the point phase.
  const renderPromptCard = (compact = false) => {
    if (!currentTrait) return null;
    return (
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 w-full max-w-sm">
        <p className="font-body text-cream/50 text-xs text-center mb-1">
          Most likely to
        </p>
        <p
          className={`font-display text-cream text-center leading-snug ${
            compact ? "text-base" : "text-xl"
          }`}
        >
          {currentTrait}
        </p>
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
        Most Likely To
      </motion.h1>

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
              <p className="font-body text-silver text-sm text-center">
                On the countdown, point at one person.
              </p>
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
              <Countdown onComplete={() => setPhase("point")} />
            </motion.div>
          )}

          {phase === "point" && (
            <motion.div
              key={`point-${round}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center gap-4 relative"
            >
              {renderPromptCard(showPointFlash)}

              <AnimatePresence mode="wait">
                {showPointFlash ? (
                  <motion.div
                    key="point-flash"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, duration: 0.4 }}
                    className="flex-1 flex items-center justify-center min-h-[180px]"
                  >
                    <span
                      className="font-display text-gold font-bold leading-none"
                      style={{ fontSize: "clamp(5rem, 22vw, 8rem)" }}
                    >
                      POINT!
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="point-settled"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full flex flex-col items-center gap-4"
                  >
                    <p className="font-display text-cream text-lg text-center">
                      Take a sip 🍸
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleNext}
                      className="w-full py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide min-h-[48px]"
                    >
                      {round >= TOTAL_ROUNDS ? "See Results" : "Next"}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
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
