"use client";

import { ArrowRight, Check } from "lucide-react";
import { cls } from "@/lib/format";
import IconGlyph from "@/components/IconGlyph";
import PulseMark from "@/components/PulseMark";
import type { RoutineStep } from "@/lib/routines";

/**
 * Renders exactly one task in full focus. Nothing else on screen —
 * no counters, no meta-text, no clutter.
 */
export default function StepDisplay({
  step,
  completing,
  onComplete,
}: {
  step: RoutineStep;
  completing: boolean;
  onComplete: () => void;
}) {
  const isTransition = step.screen === "transition";

  return (
    <div className="step-enter flex flex-col items-center gap-10 text-center">
      {isTransition ? <PulseMark size={260} /> : <IconGlyph glyph={step.glyph} completed={completing} />}

      <div className="space-y-4">
        <h2 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {step.title}
        </h2>
        <p className="mx-auto max-w-md text-lg leading-snug text-foreground/90">
          {step.instruction}
        </p>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className={cls(
          "group inline-flex items-center gap-2.5 rounded-full px-10 py-4 text-base font-semibold",
          "transition-all duration-300 active:scale-[0.97]",
          completing
            ? "complete-pulse bg-complete text-slate-950"
            : "bg-accent text-slate-950 hover:bg-[#b49bfa]",
        )}
      >
        {completing ? (
          <>
            <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            Done
          </>
        ) : (
          <>
            {step.actionLabel}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}