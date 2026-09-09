"use client";

import { useMode } from "@/contexts/ModeContext";
import { Gauge, Database } from "lucide-react";

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium text-slate-600">
      <button
        onClick={() => setMode("demo")}
        data-on={mode === "demo"}
        className={
          "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors " +
          (mode === "demo"
            ? "bg-white text-ink shadow-sm text-slate-900"
            : "text-slate-500 hover:text-ink")
        }
      >
        <Gauge size={12} /> Demo Mode
      </button>
      <button
        onClick={() => setMode("live")}
        data-on={mode === "live"}
        className={
          "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors " +
          (mode === "live"
            ? "bg-white text-ink shadow-sm text-slate-900"
            : "text-slate-500 hover:text-ink")
        }
      >
        <Database size={12} /> Live Data
      </button>
    </div>
  );
}
