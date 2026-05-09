"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { PlayerNames } from "@/lib/types";

interface GameContextType {
  playerNames: PlayerNames | null;
  setPlayerNames: (names: PlayerNames) => void;
  globalExcludeList: string[];
  addToExcludeList: (items: string[]) => void;
}

const GameContext = createContext<GameContextType>({
  playerNames: null,
  setPlayerNames: () => {},
  globalExcludeList: [],
  addToExcludeList: () => {},
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [playerNames, setPlayerNames] = useState<PlayerNames | null>(null);
  const [globalExcludeList, setGlobalExcludeList] = useState<string[]>([]);

  const addToExcludeList = useCallback((items: string[]) => {
    setGlobalExcludeList(prev => {
      const updated = [...prev, ...items];
      return updated.slice(-100);
    });
  }, []);

  return (
    <GameContext.Provider value={{ playerNames, setPlayerNames, globalExcludeList, addToExcludeList }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
