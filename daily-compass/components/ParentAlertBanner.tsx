"use client";

import { AlertTriangle, CheckCheck, Sparkles, X } from "lucide-react";
import { cls } from "@/lib/format";
import type { ReactNode } from "react";

export type BannerKind = "step" | "complete" | "stall";

const KINDS: Record<
  BannerKind,
  { icon: ReactNode; chip: string; border: string }
> = {
  step: {
    icon: <CheckCheck className="h-4 w-4" aria-hidden="true" />,
    chip: "bg-complete/15 text-complete",
    border: "border-complete/30",
  },
  complete: {
    icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    chip: "bg-accent/15 text-accent",
    border: "border-accent/40",
  },
  stall: {
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    chip: "bg-red-500/15 text-red-300",
    border: "border-red-500/40",
  },
};

/**
 * On-screen parent alert shown in the app itself — no OS toast needed.
 * Mirrors what the push notification would say, so parents can always
 * see step completions and stalled-step alerts on this screen.
 */
export default function ParentAlertBanner({
  kind,
  title,
  body,
  onDismiss,
}: {
  kind: BannerKind;
  title: string;
  body: string;
  onDismiss: () => void;
}) {
  const s = KINDS[kind];
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-4"
    >
      <div
        className={cls(
          "banner-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-panel/95 p-3.5 shadow-2xl backdrop-blur",
          s.border,
        )}
      >
        <span
          className={cls(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line",
            s.chip,
          )}
        >
          {s.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight tracking-tight">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted/70 transition-colors hover:bg-panel-2 hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}