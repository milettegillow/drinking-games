"use client";

import { motion } from "framer-motion";
import { vibrate } from "@/lib/haptics";

interface PassPhoneProps {
  playerName: string;
  onReady: () => void;
}

export default function PassPhone({ playerName, onReady }: PassPhoneProps) {
  const handleReady = () => {
    vibrate(30);
    onReady();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 bg-felt-dark/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 px-6"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="text-center"
      >
        <p className="text-5xl mb-6">🙈</p>
        <p className="font-body text-cream/60 text-sm mb-2">
          Pass the phone to
        </p>
        <h2 className="font-display text-3xl text-gold font-bold mb-8">
          {playerName}
        </h2>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleReady}
          className="px-8 py-4 rounded-xl bg-gold/20 border border-gold/30 text-gold font-body text-base font-medium min-h-[48px]"
        >
          I&apos;m ready!
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
