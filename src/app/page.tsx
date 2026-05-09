"use client";

import GameCard from "@/components/GameCard";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div
      className="h-[100dvh] flex flex-col items-center justify-center px-5 overflow-hidden table-pattern"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10 w-full max-w-sm"
      >
        <h1
          className="font-display font-bold gold-shimmer leading-tight mb-1 whitespace-nowrap"
          style={{ fontSize: "clamp(2rem, 10vw, 3rem)" }}
        >
          party games 🎉
        </h1>
        <p
          className="font-body text-cream/60"
          style={{ fontSize: "clamp(0.875rem, 4vw, 1.25rem)" }}
        >
          Four games for the circle
        </p>
      </motion.div>

      {/* Game Cards Grid — J Q K A */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <GameCard
          title="Call Your Bluff"
          subtitle="Stand if you think it's you"
          rank="J"
          href="/call-your-bluff"
          delay={0.1}
        />
        <GameCard
          title="Most Likely To"
          subtitle="Vote anonymously"
          rank="Q"
          href="/most-likely-to"
          delay={0.2}
        />
        <GameCard
          title="Would You Rather"
          subtitle="Pick A or B"
          rank="K"
          href="/would-you-rather"
          delay={0.3}
        />
        <GameCard
          title="Never Have I Ever"
          subtitle="How depraved is the circle?"
          rank="A"
          href="/never-have-i-ever"
          delay={0.4}
        />
      </div>

      {/* Decorative footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-8 flex flex-col items-center gap-3"
      >
        <div className="h-px w-48 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <p className="font-body text-cream/30 text-[10px]">
          party games
        </p>
      </motion.div>
    </div>
  );
}
