"use client";

import { motion } from "framer-motion";
import { vibrate } from "@/lib/haptics";

export interface ModeOption<T extends string> {
  value: T;
  label: string;
}

interface ModeToggleProps<T extends string> {
  options: ModeOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId?: string;
}

export default function ModeToggle<T extends string>({
  options,
  value,
  onChange,
  layoutId = "mode-active",
}: ModeToggleProps<T>) {
  return (
    <div className="flex bg-felt-dark/50 rounded-lg p-1 border border-gold/10">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => {
            vibrate(20);
            onChange(opt.value);
          }}
          className="relative flex-1 py-2 px-3 rounded-md font-body text-xs font-medium transition-colors min-h-[40px]"
        >
          {value === opt.value && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-gold/20 border border-gold/30 rounded-md"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span
            className={`relative z-10 ${value === opt.value ? "text-gold" : "text-cream/50"}`}
          >
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}
