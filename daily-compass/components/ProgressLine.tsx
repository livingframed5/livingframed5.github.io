"use client";

/**
 * Minimal progress feedback: a single line, no text. The fill glides
 * forward on completion and a soft dot rides its leading edge.
 */
export default function ProgressLine({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100));

  return (
    <div
      role="progressbar"
      aria-label="Routine progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
      className="relative h-1 w-full rounded-full bg-line"
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-complete transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      >
        <span
          className="absolute right-0 top-1/2 block h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-complete tip-glow"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}