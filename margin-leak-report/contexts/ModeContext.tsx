"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type Mode = "demo" | "live";

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

const STORAGE_KEY = "mlr:mode";

function getInitialMode(): Mode {
  if (typeof window === "undefined") return "demo";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "demo" || saved === "live") return saved;
  return "demo";
}

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(getInitialMode);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return ctx;
}
