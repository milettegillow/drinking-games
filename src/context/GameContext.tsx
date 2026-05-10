"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface GameContextType {
  playerNames: string[];
  initPlayerNames: (count: number) => void;
  updatePlayerName: (index: number, name: string) => void;
  resetPlayerNames: () => void;
  globalExcludeList: string[];
  addToExcludeList: (items: string[]) => void;
}

const GameContext = createContext<GameContextType>({
  playerNames: [],
  initPlayerNames: () => {},
  updatePlayerName: () => {},
  resetPlayerNames: () => {},
  globalExcludeList: [],
  addToExcludeList: () => {},
});

export function defaultPlayerName(index: number): string {
  return `Player ${index + 1}`;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [globalExcludeList, setGlobalExcludeList] = useState<string[]>([]);

  const initPlayerNames = useCallback((count: number) => {
    setPlayerNames(Array.from({ length: count }, (_, i) => defaultPlayerName(i)));
  }, []);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setPlayerNames((prev) => {
      const trimmed = name.trim();
      const next = [...prev];
      next[index] = trimmed.length > 0 ? trimmed : defaultPlayerName(index);
      return next;
    });
  }, []);

  const resetPlayerNames = useCallback(() => {
    setPlayerNames([]);
  }, []);

  const addToExcludeList = useCallback((items: string[]) => {
    setGlobalExcludeList((prev) => {
      const updated = [...prev, ...items];
      return updated.slice(-100);
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        playerNames,
        initPlayerNames,
        updatePlayerName,
        resetPlayerNames,
        globalExcludeList,
        addToExcludeList,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
