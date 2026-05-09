"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import posthog from "posthog-js";

export type CardRank = "J" | "Q" | "K" | "A";

const rankOrnaments: Record<CardRank, string> = {
  J: "♠",
  Q: "♛",
  K: "♚",
  A: "✦",
};

interface GameCardProps {
  title: string;
  subtitle: string;
  rank: CardRank;
  href: string;
  delay?: number;
}

export default function GameCard({
  title,
  subtitle,
  rank,
  href,
  delay = 0,
}: GameCardProps) {
  const ornament = rankOrnaments[rank];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Link
        href={href}
        className="block"
        onClick={() => {
          const game = href.replace("/", "");
          console.log("[Analytics]", "game_selected", { game });
          posthog.capture("game_selected", { game });
        }}
      >
        <motion.div
          whileHover={{ scale: 1.03, rotateY: 3, rotateX: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative bg-felt-dark/60 backdrop-blur-sm rounded-xl border-2 border-gold/30 shadow-lg overflow-hidden cursor-pointer"
          style={{ perspective: 800 }}
        >
          <div className="p-4 min-h-[180px] flex flex-col items-center justify-center relative">
            {/* Top-left ornament */}
            <span className="absolute top-2 left-3 text-sm text-gold/80 leading-none">
              {ornament}
            </span>

            {/* Bottom-right ornament (rotated) */}
            <span className="absolute bottom-2 right-3 text-sm text-gold/80 leading-none rotate-180">
              {ornament}
            </span>

            {/* Big rank letterform */}
            <span
              className="font-display font-bold text-cream leading-none mb-2"
              style={{ fontSize: "clamp(3.5rem, 18vw, 5rem)" }}
            >
              {rank}
            </span>

            {/* Game title */}
            <h3 className="font-body text-sm text-cream/90 font-semibold text-center leading-tight">
              {title}
            </h3>
            <p className="font-body text-[10px] text-cream/50 text-center leading-snug px-1 mt-1">
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
