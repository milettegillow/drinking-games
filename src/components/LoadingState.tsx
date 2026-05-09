"use client";

import { motion } from "framer-motion";

const suits = ["♣", "♦", "♥", "♠"];

export default function LoadingState({ message = "Shuffling the deck..." }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-12"
    >
      <div className="flex gap-3">
        {suits.map((suit, i) => (
          <motion.span
            key={suit}
            className="text-3xl"
            animate={{
              y: [0, -12, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          >
            {suit}
          </motion.span>
        ))}
      </div>
      <p className="font-body text-cream/70 text-sm">{message}</p>
    </motion.div>
  );
}
