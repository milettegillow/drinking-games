"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/context/GameContext";
import { vibrate } from "@/lib/haptics";

interface PlayerSetupProps {
  gameTitle: string;
  minPlayers?: number;
  maxPlayers?: number;
  requireNames: boolean;
  onStart: (count: number, names?: string[]) => void;
}

export default function PlayerSetup({
  gameTitle,
  minPlayers = 3,
  maxPlayers = 16,
  requireNames,
  onStart,
}: PlayerSetupProps) {
  const { playerNames, setPlayerNames } = useGame();

  const initialFromContext = useMemo(() => {
    if (!requireNames || !playerNames || playerNames.length === 0) return null;
    return playerNames;
  }, [playerNames, requireNames]);

  const [count, setCount] = useState<number>(() => {
    if (initialFromContext && initialFromContext.length >= minPlayers) {
      return Math.min(initialFromContext.length, maxPlayers);
    }
    return minPlayers;
  });

  const [namesByCount, setNamesByCount] = useState<string[]>(() => {
    const seed = initialFromContext ?? [];
    return Array.from({ length: count }, (_, i) => seed[i] ?? "");
  });
  const [prevCount, setPrevCount] = useState(count);

  // Adjust the names array during render when count changes.
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  let names = namesByCount;
  if (prevCount !== count) {
    if (namesByCount.length < count) {
      names = [
        ...namesByCount,
        ...Array.from({ length: count - namesByCount.length }, () => ""),
      ];
    } else if (namesByCount.length > count) {
      names = namesByCount.slice(0, count);
    }
    setPrevCount(count);
    setNamesByCount(names);
  }

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

  const updateName = (idx: number, value: string) => {
    setNamesByCount((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const cleanedNames = names.map((n) => n.trim());
  const allNamesFilled = !requireNames || cleanedNames.every((n) => n.length > 0);
  const canStart = allNamesFilled;

  const handleStart = () => {
    if (!canStart) return;
    vibrate(30);
    if (requireNames) {
      setPlayerNames(cleanedNames);
      onStart(count, cleanedNames);
    } else {
      onStart(count);
    }
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

        {/* Number stepper */}
        <div className="flex items-center justify-center gap-4 mb-5">
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

        {requireNames && (
          <>
            <p className="font-body text-cream/40 text-xs text-center mb-3 leading-snug">
              Enter names in the order you&apos;re sitting, going round the circle.
            </p>
            <div className="flex flex-col gap-2 mb-5 max-h-[40vh] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {names.map((name, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <label className="flex items-center gap-2">
                      <span className="font-body text-cream/40 text-xs w-16 shrink-0">
                        Player {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updateName(idx, e.target.value)}
                        placeholder="Name"
                        maxLength={20}
                        className="flex-1 bg-felt-dark/50 border border-gold/20 rounded-lg px-3 py-2 font-body text-cream text-base placeholder:text-cream/30 focus:outline-none focus:border-gold/50 transition-colors"
                      />
                    </label>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          disabled={!canStart}
          className="w-full py-3 rounded-lg bg-gold text-felt-dark font-display text-base font-bold tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-opacity min-h-[48px]"
        >
          Start
        </motion.button>
      </div>
    </motion.div>
  );
}
