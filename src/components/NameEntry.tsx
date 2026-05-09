"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/context/GameContext";
import { vibrate } from "@/lib/haptics";

interface NameEntryProps {
  onStart: () => void;
}

export default function NameEntry({ onStart }: NameEntryProps) {
  const { playerNames, setPlayerNames } = useGame();
  const [name1, setName1] = useState(playerNames?.player1 || "");
  const [name2, setName2] = useState(playerNames?.player2 || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name1.trim() && name2.trim()) {
      vibrate(30);
      setPlayerNames({ player1: name1.trim(), player2: name2.trim() });
      onStart();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-6">
        <h2 className="font-display text-xl text-gold text-center mb-1">
          Enter Your Names
        </h2>
        <p className="font-body text-cream/50 text-xs text-center mb-5">
          Who&apos;s playing tonight?
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-body text-cream/60 text-xs block mb-1">
              Player 1
            </label>
            <input
              type="text"
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              placeholder="Enter name..."
              className="w-full bg-felt-dark/50 border border-gold/20 rounded-lg px-4 py-3 font-body text-cream text-base placeholder:text-cream/30 focus:outline-none focus:border-gold/50 transition-colors"
              maxLength={20}
              autoFocus
            />
          </div>

          <div>
            <label className="font-body text-cream/60 text-xs block mb-1">
              Player 2
            </label>
            <input
              type="text"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              placeholder="Enter name..."
              className="w-full bg-felt-dark/50 border border-gold/20 rounded-lg px-4 py-3 font-body text-cream text-base placeholder:text-cream/30 focus:outline-none focus:border-gold/50 transition-colors"
              maxLength={20}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={!name1.trim() || !name2.trim()}
            className="mt-2 py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            Let&apos;s Play
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
