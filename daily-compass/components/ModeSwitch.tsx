"use client";

import { MoonStar, Sunrise } from "lucide-react";
import { cls } from "@/lib/format";
import type { RoutineMode } from "@/lib/routines";

/**
 * Quiet segmented switch between the two routines: Morning and Evening.
 */
export default function ModeSwitch({
  mode,
  onChange,
}: {
  mode: RoutineMode;
  onChange: (mode: RoutineMode) => void;
}) {
  const options = [
    { value: "morning" as const, label: "Morning", icon: <Sunrise className="h-4 w-4" aria-hidden="true" /> },
    { value: "evening" as const, label: "Evening", icon: <MoonStar className="h-4 w-4" aria-hidden="true" /> },
  ];

  return (
    <div
      role="tablist"
      aria-label="Choose a routine"
      className="inline-flex rounded-lg border border-line bg-panel p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={mode === o.value}
          onClick={() => onChange(o.value)}
          className={cls(
            "inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors",
            mode === o.value ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}