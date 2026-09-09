"use client";

import { useEffect, useState } from "react";
import { Delete, Lock } from "lucide-react";
import { cls } from "@/lib/format";

/**
 * Default 4-digit PIN guarding the parent area. Parents can change it from
 * within Parent Mode; the new value is stored on-device under "dc:pin".
 */
export const DEFAULT_PIN = "4321";

export const DEFAULT_PIN_ENTRY = (): string => DEFAULT_PIN;

export const isValidPin = (value: string): boolean => /^\d{4}$/.test(value);

const PIN_LENGTH = 4;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

export default function Gate({
  pin = DEFAULT_PIN,
  onUnlock,
  onCancel,
}: {
  pin?: string;
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      else if (/^[0-9]$/.test(e.key) && value.length < PIN_LENGTH) press(e.key);
      else if (e.key === "Backspace") erase();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel, value]);

  function press(key: string) {
    const next = (value + key).slice(0, PIN_LENGTH);
    setValue(next);
    if (next.length === PIN_LENGTH) check(next);
  }

  function erase() {
    if (wrong) return;
    setValue((v) => v.slice(0, -1));
  }

  function check(attempt: string) {
    if (attempt === pin) {
      onUnlock();
      return;
    }
    setWrong(true);
    setValue("");
    window.setTimeout(() => setWrong(false), 650);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Parent area"
      className="fixed inset-0 z-50 grid place-items-center bg-background/85 px-4 backdrop-blur-sm"
    >
      <div
        className={cls(
          "w-full max-w-xs rounded-3xl border border-line bg-panel p-7 text-center",
          wrong && "border-red-500/50",
        )}
      >
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-line bg-panel-2 text-muted">
          <Lock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <h2 className="mt-4 text-base font-semibold tracking-tight">Parent area</h2>
        <p className="mt-1 text-sm text-muted">Enter the 4-digit code to continue</p>

        <div
          className={cls("mt-5 flex items-center justify-center gap-3", wrong && "animate-shake")}
          role="status"
          aria-live="polite"
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              className={cls(
                "h-3 w-3 rounded-full transition-colors",
                i < value.length
                  ? wrong
                    ? "bg-red-400"
                    : "bg-accent"
                  : "bg-line",
              )}
              aria-hidden="true"
            />
          ))}
        </div>

        {wrong ? (
          <p className="mt-2 text-xs text-red-300">Wrong code — try again.</p>
        ) : (
          <p className="mt-2 text-xs text-muted/60">&nbsp;</p>
        )}

        <div className="mx-auto mt-4 grid max-w-[220px] grid-cols-3 gap-2">
          {KEYS.map((key, i) =>
            key === "" ? (
              <span key={`pad-empty-${i}`} aria-hidden="true" />
            ) : key === "back" ? (
              <button
                key="pad-back"
                type="button"
                onClick={erase}
                disabled={wrong}
                aria-label="Delete last digit"
                className="grid h-12 place-items-center rounded-xl text-muted/70 transition-colors hover:bg-panel-2 hover:text-foreground disabled:opacity-40"
              >
                <Delete className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key={`pad-${key}`}
                type="button"
                onClick={() => press(key)}
                className="grid h-12 place-items-center rounded-xl border border-line bg-panel-2 text-lg font-medium tabular-nums transition-colors hover:border-accent/40 hover:text-accent"
              >
                {key}
              </button>
            ),
          )}
        </div>

        <div className="mt-5 flex items-center justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}