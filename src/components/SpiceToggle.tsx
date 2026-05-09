"use client";

import { motion } from "framer-motion";
import { SpiceLevel } from "@/lib/types";
import { vibrate } from "@/lib/haptics";

const options: { level: SpiceLevel; label: string }[] = [
  { level: "mild", label: "Mild 🌸" },
  { level: "spicy", label: "Spicy 🌶️" },
  { level: "villain", label: "Villain 😈" },
];

interface SpiceToggleProps {
  value: SpiceLevel;
  onChange: (level: SpiceLevel) => void;
}

export default function SpiceToggle({ value, onChange }: SpiceToggleProps) {
  return (
    <div className="flex bg-felt-dark/50 rounded-lg p-1 border border-gold/10">
      {options.map((opt) => (
        <button
          key={opt.level}
          onClick={() => {
            vibrate(20);
            onChange(opt.level);
          }}
          className="relative flex-1 py-2 px-3 rounded-md font-body text-xs font-medium transition-colors min-h-[40px]"
        >
          {value === opt.level && (
            <motion.div
              layoutId="spice-active"
              className="absolute inset-0 bg-gold/20 border border-gold/30 rounded-md"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span
            className={`relative z-10 ${value === opt.level ? "text-gold" : "text-cream/50"}`}
          >
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}
