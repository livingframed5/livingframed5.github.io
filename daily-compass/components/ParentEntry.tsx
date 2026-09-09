"use client";

import { Settings } from "lucide-react";
import { cls } from "@/lib/format";

/**
 * A deliberately low-profile entry to the parent area, tucked in the
 * bottom corner. Nearly invisible by default; clicking it opens the
 * PIN gate (or the parent panel once unlocked for the session).
 */
export default function ParentEntry({
  unlocked,
  onClick,
}: {
  unlocked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unlocked ? "Open parent mode" : "Parent area"}
      title="Parent area"
      className={cls(
        "fixed bottom-8 right-4 z-40 grid h-11 w-11 place-items-center rounded-2xl border sm:bottom-4 sm:h-9 sm:w-9",
        "transition-colors",
        unlocked
          ? "border-accent/40 bg-accent/10 text-accent/90"
          : "border-line/80 bg-panel-2/70 text-muted/70 hover:border-accent/40 hover:text-muted/90",
      )}
    >
      <Settings className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}