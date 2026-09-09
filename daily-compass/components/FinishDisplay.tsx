"use client";

import { Check, RotateCcw } from "lucide-react";

/**
 * Quiet finish state. No confetti, no popups — the accent simply
 * settles to the complete (electric blue) tone and says it plainly.
 */
export default function FinishDisplay({
  title,
  message,
  onRestart,
}: {
  title: string;
  message: string;
  onRestart: () => void;
}) {
  return (
    <div className="step-enter flex flex-col items-center gap-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-complete/40 bg-complete/10 text-complete">
        <Check className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
      </div>

      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-complete">All complete</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        <p className="mx-auto max-w-md text-base leading-relaxed text-foreground/85">{message}</p>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-2/80 px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Start over
      </button>
    </div>
  );
}