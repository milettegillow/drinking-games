"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import type { ReactNode } from "react";

interface Tier {
  minScore: number;
  message: string;
  emoji: string;
}

interface NumericEndScreenProps {
  variant?: "numeric";
  score: number;
  maxScore: number;
  tiers: Tier[];
  scoreSuffix?: string;
  scoreLabel?: string;
  onPlayAgain: () => void;
}

interface CustomEndScreenProps {
  variant: "custom";
  emoji: string;
  resultLabel: string;
  resultValue: ReactNode;
  message: string;
  showCrowns?: boolean;
  onPlayAgain: () => void;
}

export interface EndSection {
  emoji: string;
  label: string;
  names: ReactNode;
  subtitle: string;
}

interface SectionsEndScreenProps {
  variant: "sections";
  sections: EndSection[];
  fallback?: { emoji: string; message: string };
  onPlayAgain: () => void;
}

type EndScreenProps =
  | NumericEndScreenProps
  | CustomEndScreenProps
  | SectionsEndScreenProps;

function getTier(score: number, tiers: Tier[]): Tier {
  const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((t) => score >= t.minScore) || sorted[sorted.length - 1];
}

// Pre-computed jitter so renders are deterministic.
const CROWN_JITTERS = [-8, 5, -3, 9, -7, 4];

function FloatingCrowns() {
  return (
    <div className="relative h-0">
      {CROWN_JITTERS.map((jitter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 0, x: (i - 3) * 30 }}
          animate={{
            opacity: [0, 1, 0],
            y: -60,
            x: (i - 3) * 30 + jitter,
          }}
          transition={{
            duration: 1.5,
            delay: 0.6 + i * 0.1,
          }}
          className="absolute left-1/2 text-xl"
        >
          👑
        </motion.span>
      ))}
    </div>
  );
}

export default function EndScreen(props: EndScreenProps) {
  const { resetPlayerNames } = useGame();

  const handlePlayAgain = () => {
    resetPlayerNames();
    props.onPlayAgain();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm mx-auto text-center"
    >
      {props.variant === "sections" ? (
        <SectionsBody {...props} />
      ) : (
        <SingleBody {...props} />
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePlayAgain}
          className="flex-1 py-3 rounded-lg bg-gold/20 text-gold font-body text-sm font-medium min-h-[48px]"
        >
          Play Again
        </motion.button>
        <Link href="/" className="flex-1" onClick={resetPlayerNames}>
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

function SingleBody(props: NumericEndScreenProps | CustomEndScreenProps) {
  const isCustom = props.variant === "custom";

  let emoji: string;
  let scoreNode: ReactNode;
  let messageNode: ReactNode;
  let crowns: boolean;

  if (isCustom) {
    emoji = props.emoji;
    scoreNode = (
      <p className="font-display text-3xl text-gold font-bold mb-2 leading-tight">
        {props.resultValue}
      </p>
    );
    messageNode = (
      <p className="font-body text-cream/70 text-base">{props.message}</p>
    );
    crowns = props.showCrowns ?? true;
  } else {
    const tier = getTier(props.score, props.tiers);
    emoji = tier.emoji;
    const display =
      props.scoreSuffix !== undefined
        ? `${props.score}${props.scoreSuffix}`
        : `${props.score}/${props.maxScore}`;
    scoreNode = (
      <>
        {props.scoreLabel && (
          <p className="font-body text-cream/40 text-xs uppercase tracking-wider mb-1">
            {props.scoreLabel}
          </p>
        )}
        <p className="font-display text-5xl text-gold font-bold mb-2">
          {display}
        </p>
      </>
    );
    messageNode = (
      <p className="font-body text-cream/70 text-base">{tier.message}</p>
    );
    crowns = props.score >= props.tiers[0]?.minScore;
  }

  return (
    <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-8 overflow-visible">
      <motion.p
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="text-6xl mb-4"
      >
        {emoji}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {isCustom && (
          <p className="font-body text-cream/40 text-xs uppercase tracking-wider mb-2">
            {props.resultLabel}
          </p>
        )}
        {scoreNode}
        {messageNode}
      </motion.div>

      {crowns && <FloatingCrowns />}
    </div>
  );
}

function SectionsBody(props: SectionsEndScreenProps) {
  if (props.sections.length === 0 && props.fallback) {
    return (
      <div className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-8 overflow-visible">
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="text-6xl mb-4"
        >
          {props.fallback.emoji}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-body text-cream/80 text-base leading-relaxed"
        >
          {props.fallback.message}
        </motion.p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-visible">
      {props.sections.map((section, i) => (
        <motion.div
          key={section.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.1 }}
          className="bg-cream/10 backdrop-blur-sm border border-gold/20 rounded-xl p-5 text-center"
        >
          <p className="text-3xl mb-2">{section.emoji}</p>
          <p className="font-body text-cream/40 text-xs uppercase tracking-wider mb-2">
            {section.label}
          </p>
          <div className="font-display text-2xl text-gold font-bold mb-1 leading-tight flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {section.names}
          </div>
          <p className="font-body text-cream/60 text-xs">{section.subtitle}</p>
        </motion.div>
      ))}
      {props.sections.length > 0 && (
        <div className="relative h-0">
          <FloatingCrowns />
        </div>
      )}
    </div>
  );
}
