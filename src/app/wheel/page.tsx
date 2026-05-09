"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import SpinWheel from "@/components/SpinWheel";
import LoadingState from "@/components/LoadingState";
import { WheelCategory, WHEEL_EMOJIS } from "@/lib/types";
import posthog from "posthog-js";

export default function WheelPage() {
  const { globalExcludeList, addToExcludeList } = useGame();
  const [currentCategory, setCurrentCategory] = useState<WheelCategory | null>(
    null,
  );
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [topicPools, setTopicPools] = useState<Record<string, string[]>>({});
  const [usedTopics, setUsedTopics] = useState<string[]>([]);
  const [topicsExplored, setTopicsExplored] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showTopic, setShowTopic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const startTime = useRef(Date.now());
  const clickCount = useRef(0);
  const topicsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (!startTime.current) return;
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const props = { game: 'wheel', duration_seconds: duration, topics_explored: topicsRef.current, total_clicks: clickCount.current, completed: false };
      console.log('[Analytics]', 'game_session_end', props);
      posthog.capture('game_session_end', props);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTopics = useCallback(
    async (category: WheelCategory, exclude: string[]) => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "wheel",
          category,
          count: 5,
          exclude,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.items as string[];
    },
    [],
  );

  const getTopicFromPool = useCallback(
    async (category: WheelCategory) => {
      setIsLoading(true);
      setError(null);

      try {
        let pool = topicPools[category] || [];

        // Fetch if pool is empty
        if (pool.length === 0) {
          pool = await fetchTopics(category, [...globalExcludeList, ...usedTopics]);
          setTopicPools((prev) => ({ ...prev, [category]: pool }));
        }

        // Pop a topic
        const topic = pool[0];
        const remaining = pool.slice(1);
        setTopicPools((prev) => ({ ...prev, [category]: remaining }));
        setUsedTopics((prev) => [...prev, topic]);
        addToExcludeList([topic]);
        setCurrentTopic(topic);
        setTopicsExplored((prev) => prev + 1);
        topicsRef.current += 1;
        setShowTopic(true);

        // Refetch in background if pool is getting low
        if (remaining.length < 2) {
          fetchTopics(category, [...globalExcludeList, ...usedTopics, topic]).then((newTopics) => {
            setTopicPools((prev) => ({
              ...prev,
              [category]: [...(prev[category] || []), ...newTopics],
            }));
          });
        }
      } catch (err) {
        console.log('[Analytics]', 'api_error', { game: "wheel", error: String(err) });
        posthog.capture("api_error", { game: "wheel", error: String(err) });
        setError("Shuffling the deck... try again!");
      } finally {
        setIsLoading(false);
      }
    },
    [topicPools, usedTopics, fetchTopics, globalExcludeList, addToExcludeList],
  );

  const handleCategorySelected = useCallback(
    (category: WheelCategory) => {
      clickCount.current += 1;
      if (!hasStarted) {
        console.log('[Analytics]', 'wheel_game_start', {});
        posthog.capture("wheel_game_start", {});
        setHasStarted(true);
      }
      console.log('[Analytics]', 'wheel_spin', { category });
      posthog.capture("wheel_spin", { category });
      setCurrentCategory(category);
      setShowTopic(false);
      getTopicFromPool(category);
    },
    [getTopicFromPool, hasStarted],
  );

  const handleNextTopic = () => {
    if (currentCategory) {
      clickCount.current += 1;
      console.log('[Analytics]', 'wheel_next_topic', { category: currentCategory });
      posthog.capture("wheel_next_topic", { category: currentCategory });
      setShowTopic(false);
      setTimeout(() => getTopicFromPool(currentCategory), 300);
    }
  };

  const handleSpinAgain = () => {
    clickCount.current += 1;
    console.log('[Analytics]', 'wheel_spin_again', {});
    posthog.capture("wheel_spin_again");
    setShowTopic(false);
    setCurrentTopic(null);
    setCurrentCategory(null);
  };

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
        className="font-display font-bold text-gold leading-tight mb-3 shrink-0"
        style={{ fontSize: "clamp(1.75rem, 8.5vw, 2.5rem)" }}
      >
        Conversation Wheel
      </motion.h1>

      {/* Wheel — shrinks if needed, no vertical centering */}
      <div className="shrink min-h-0 flex justify-center mb-3">
        <SpinWheel
          onCategorySelected={handleCategorySelected}
          disabled={isLoading}
        />
      </div>

      {/* Topic display area */}
      <div className="w-full max-w-sm shrink-0">
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadingState />
            </motion.div>
          )}

          {error && !isLoading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="font-body text-cream/60 text-sm mb-3">{error}</p>
              <button
                onClick={() =>
                  currentCategory && getTopicFromPool(currentCategory)
                }
                className="font-body text-gold text-sm underline"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {showTopic && currentTopic && !isLoading && !error && (
            <motion.div
              key="topic"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-4 max-h-[30vh] overflow-y-auto">
                <p className="font-body text-gold/60 text-xs uppercase tracking-wider mb-1">
                  {currentCategory && WHEEL_EMOJIS[currentCategory]}{" "}
                  {currentCategory}
                </p>
                <p className="font-display text-cream text-lg leading-relaxed">
                  {currentTopic}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleNextTopic}
                  className="flex-1 py-3 rounded-lg bg-gold/20 text-gold font-body text-sm font-medium hover:bg-gold/30 transition-colors"
                >
                  Next Topic
                </button>
                <button
                  onClick={handleSpinAgain}
                  className="flex-1 py-3 rounded-lg border border-gold/20 text-cream/70 font-body text-sm font-medium hover:bg-cream/5 transition-colors"
                >
                  Spin Again
                </button>
              </div>
            </motion.div>
          )}

          {!showTopic && !isLoading && !error && (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-body text-cream/30 text-sm text-center"
            >
              Tap SPIN to get a conversation topic
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Spacer — absorbs remaining space below content */}
      <div className="flex-1" />
    </div>
  );
}
