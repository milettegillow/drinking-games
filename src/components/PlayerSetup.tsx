"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { vibrate } from "@/lib/haptics";

interface PlayerSetupProps {
  gameTitle: string;
  minPlayers?: number;
  maxPlayers?: number;
  defaultPlayers?: number;
  onStart: (count: number) => void;
}

export default function PlayerSetup({
  gameTitle,
  minPlayers = 3,
  maxPlayers = 16,
  defaultPlayers = 6,
  onStart,
}: PlayerSetupProps) {
  const initial = Math.min(Math.max(defaultPlayers, minPlayers), maxPlayers);
  const [count, setCount] = useState<number>(initial);

  const decrement = () => {
    if (count <= minPlayers) return;
    vibrate(15);
    setCount((c) => c - 1);
  };
  const increment = () => {
    if (count >= maxPlayers) return;
    vibrate(15);
    setCount((c) => c + 1);
  };

  const handleStart = () => {
    vibrate(30);
    onStart(count);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-6">
        <h2 className="font-display text-2xl text-gold text-center mb-1 leading-tight">
          {gameTitle}
        </h2>
        <p className="font-body text-cream/50 text-xs text-center mb-5">
          How many players?
        </p>

        <div className="flex items-center justify-center gap-4 mb-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={decrement}
            disabled={count <= minPlayers}
            className="w-12 h-12 rounded-full bg-felt-dark/60 border border-gold/30 text-gold font-display text-2xl leading-none flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Decrease players"
          >
            −
          </motion.button>
          <motion.span
            key={count}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="font-display text-cream text-4xl font-bold w-16 text-center tabular-nums"
          >
            {count}
          </motion.span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={increment}
            disabled={count >= maxPlayers}
            className="w-12 h-12 rounded-full bg-felt-dark/60 border border-gold/30 text-gold font-display text-2xl leading-none flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Increase players"
          >
            +
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          className="w-full py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide min-h-[48px]"
        >
          Start
        </motion.button>
      </div>
    </motion.div>
  );
}
