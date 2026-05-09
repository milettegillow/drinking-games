"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import posthog from "posthog-js";

type Suit = "hearts" | "spades" | "diamonds" | "clubs";

const suitSymbols: Record<Suit, string> = {
  hearts: "♥",
  spades: "♠",
  diamonds: "♦",
  clubs: "♣",
};

const suitColors: Record<Suit, string> = {
  hearts: "text-casino-red",
  spades: "text-felt-dark",
  diamonds: "text-casino-red",
  clubs: "text-felt-dark",
};

interface GameCardProps {
  title: string;
  subtitle: string;
  suit: Suit;
  href: string;
  delay?: number;
}

export default function GameCard({
  title,
  subtitle,
  suit,
  href,
  delay = 0,
}: GameCardProps) {
  const symbol = suitSymbols[suit];
  const color = suitColors[suit];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Link href={href} className="block" onClick={() => { console.log('[Analytics]', 'game_selected', { game: href.replace("/", "") }); posthog.capture("game_selected", { game: href.replace("/", "") }); }}>
        <motion.div
          whileHover={{ scale: 1.03, rotateY: 3, rotateX: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative bg-cream rounded-xl border-2 border-gold/30 shadow-lg overflow-hidden cursor-pointer"
          style={{ perspective: 800 }}
        >
          <div className="p-4 min-h-[160px] flex flex-col items-center justify-center relative">
            {/* Top-left suit */}
            <span
              className={`absolute top-2 left-3 text-lg font-bold ${color}`}
            >
              {symbol}
            </span>

            {/* Bottom-right suit (rotated) */}
            <span
              className={`absolute bottom-2 right-3 text-lg font-bold ${color} rotate-180`}
            >
              {symbol}
            </span>

            {/* Card content */}
            <h3 className="font-display text-xl text-felt-dark font-bold text-center leading-tight mb-1">
              {title}
            </h3>
            <p className="font-body text-xs text-felt-light text-center leading-snug px-2">
              {subtitle}
            </p>
          </div>

          {/* Gold bottom accent */}
          <div className="h-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </motion.div>
      </Link>
    </motion.div>
  );
}
