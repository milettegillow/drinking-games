"use client";

import { motion } from "framer-motion";
import { vibrate } from "@/lib/haptics";
import { useEffect } from "react";

interface RevealResultProps {
  question: string;
  player1Name: string;
  player2Name: string;
  player1Answer: string;
  player2Answer: string;
  matched: boolean;
  onNext: () => void;
  matchMessage?: string;
  mismatchMessage?: string;
}

export default function RevealResult({
  question,
  player1Name,
  player2Name,
  player1Answer,
  player2Answer,
  matched,
  onNext,
  matchMessage = "You think alike!",
  mismatchMessage = "Uh oh! Looks like you need to talk about this one!",
}: RevealResultProps) {
  useEffect(() => {
    vibrate(matched ? [50, 50, 100] : [100, 50, 50]);
  }, [matched]);

  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ transformStyle: "preserve-3d" }}
      className="w-full max-w-sm mx-auto overflow-visible"
    >
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 overflow-visible">
        {/* Match/mismatch indicator */}
        <div className="text-center mb-4">
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="text-4xl mb-2"
          >
            {matched ? "❤️" : "💔"}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`font-body text-sm ${matched ? "text-gold" : "text-silver"}`}
          >
            {matched ? matchMessage : mismatchMessage}
          </motion.p>
          {matched && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-display text-gold text-lg font-bold"
            >
              +1
            </motion.p>
          )}
        </div>

        {/* Question */}
        <p className="font-body text-cream/50 text-xs text-center mb-4">
          {question}
        </p>

        {/* Answers side by side */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="text-center">
            <p className="font-body text-cream/40 text-xs mb-1">
              {player1Name}
            </p>
            <div className="bg-felt-light/50 rounded-lg py-2 px-3">
              <p className="font-display text-cream text-sm font-semibold">
                {player1Answer}
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-body text-cream/40 text-xs mb-1">
              {player2Name}
            </p>
            <div className="bg-felt-light/50 rounded-lg py-2 px-3">
              <p className="font-display text-cream text-sm font-semibold">
                {player2Answer}
              </p>
            </div>
          </div>
        </div>

        {/* Next button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          className="w-full py-3 rounded-lg bg-gold/20 text-gold font-body text-sm font-medium min-h-[48px]"
        >
          Next Question
        </motion.button>
      </div>
    </motion.div>
  );
}
