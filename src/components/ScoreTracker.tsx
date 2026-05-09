"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ScoreTrackerProps {
  round: number;
  totalRounds: number;
  score: number;
  maxScore?: number;
  label?: string;
}

export default function ScoreTracker({
  round,
  totalRounds,
  score,
  maxScore,
  label = "Score",
}: ScoreTrackerProps) {
  return (
    <div className="flex items-center justify-between w-full max-w-sm">
      <span className="font-body text-cream/40 text-xs">
        Round {round}/{totalRounds}
      </span>
      <div className="flex items-center gap-1">
        <span className="font-body text-cream/40 text-xs">{label}:</span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={score}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="font-display text-gold text-sm font-bold"
          >
            {score}
            {maxScore !== undefined ? `/${maxScore}` : ""}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
