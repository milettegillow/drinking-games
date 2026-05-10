"use client";

import { useState } from "react";
import { useGame, defaultPlayerName } from "@/context/GameContext";

interface PlayerNameProps {
  index: number;
  size?: "sm" | "md" | "lg";
  prominent?: boolean;
  onSave?: () => void;
}

const sizeClasses: Record<NonNullable<PlayerNameProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
};

const pencilSizeClasses: Record<NonNullable<PlayerNameProps["size"]>, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-base",
};

export default function PlayerName({
  index,
  size = "md",
  prominent = false,
  onSave,
}: PlayerNameProps) {
  const { playerNames, updatePlayerName } = useGame();
  const currentName = playerNames[index] ?? defaultPlayerName(index);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentName);

  const beginEdit = () => {
    setDraft(currentName);
    setEditing(true);
  };

  const commit = () => {
    updatePlayerName(index, draft);
    setEditing(false);
    onSave?.();
  };

  const sizeCls = sizeClasses[size];
  const pencilCls = pencilSizeClasses[size];

  if (editing) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-cream/10 border-b-2 border-gold/70 px-2 py-0.5 ${
          prominent ? "ring-1 ring-gold/40" : ""
        }`}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          maxLength={20}
          enterKeyHint="done"
          inputMode="text"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          className={`bg-transparent text-cream font-display font-semibold focus:outline-none ${sizeCls} min-w-[4ch] w-[10ch]`}
        />
        <span className={`${pencilCls} text-gold/70 select-none`} aria-hidden>
          ✎
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={beginEdit}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-cream/5 active:bg-cream/10 transition-colors ${
        prominent ? "border-b-2 border-gold/40" : ""
      }`}
    >
      <span className={`font-display font-semibold text-cream ${sizeCls}`}>
        {currentName}
      </span>
      <span
        className={`${pencilCls} ${
          prominent ? "text-gold" : "text-gold/50"
        } select-none`}
        aria-hidden
      >
        ✎
      </span>
    </button>
  );
}
