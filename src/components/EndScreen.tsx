"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface Tier {
  minScore: number;
  message: string;
  emoji: string;
}

interface EndScreenProps {
  score: number;
  maxScore: number;
  tiers: Tier[];
  onPlayAgain: () => void;
}

function getTier(score: number, tiers: Tier[]): Tier {
  // Tiers should be sorted descending by minScore
  const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((t) => score >= t.minScore) || sorted[sorted.length - 1];
}

export default function EndScreen({
  score,
  maxScore,
  tiers,
  onPlayAgain,
}: EndScreenProps) {
  const tier = getTier(score, tiers);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm mx-auto text-center"
    >
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-8 overflow-visible">
        {/* Emoji */}
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="text-6xl mb-4"
        >
          {tier.emoji}
        </motion.p>

        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="font-display text-5xl text-gold font-bold mb-2">
            {score}/{maxScore}
          </p>
          <p className="font-body text-cream/70 text-base">{tier.message}</p>
        </motion.div>

        {/* Floating hearts for high scores */}
        {score >= tiers[0]?.minScore && (
          <div className="relative h-0">
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 0, x: (i - 3) * 30 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: -60,
                  x: (i - 3) * 30 + Math.random() * 20 - 10,
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.6 + i * 0.1,
                }}
                className="absolute left-1/2 text-xl"
              >
                {["♠️", "♥️", "♦️", "♣️", "🎰", "💰"][i]}
              </motion.span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onPlayAgain}
          className="flex-1 py-3 rounded-lg bg-gold/20 text-gold font-body text-sm font-medium min-h-[48px]"
        >
          Play Again
        </motion.button>
        <Link href="/" className="flex-1">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="py-3 rounded-lg border border-gold/20 text-cream/70 font-body text-sm font-medium text-center min-h-[48px] flex items-center justify-center"
          >
            Back to Menu
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}
