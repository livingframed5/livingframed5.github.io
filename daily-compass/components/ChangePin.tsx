"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { cls, inputCls } from "@/lib/format";
import { isValidPin } from "@/components/Gate";

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string };

function cleanDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

/**
 * Change the 4-digit code that opens Parent Mode. Requires the current
 * code and asks for the new one twice before saving.
 */
export default function ChangePin({
  currentPin,
  onChangePin,
}: {
  currentPin: string;
  onChangePin: (next: string) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function submit() {
    if (current !== currentPin) {
      setStatus({ kind: "error", message: "Current code is incorrect." });
      return;
    }
    if (!isValidPin(next)) {
      setStatus({ kind: "error", message: "New code must be exactly 4 digits." });
      return;
    }
    if (next !== confirm) {
      setStatus({ kind: "error", message: "New code doesn't match the confirmation." });
      return;
    }
    onChangePin(next);
    setCurrent("");
    setNext("");
    setConfirm("");
    setStatus({ kind: "saved" });
  }

  const field = (
    label: string,
    value: string,
    setter: (v: string) => void,
    placeholder: string,
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-muted">{label}</span>
      <input
        className={inputCls}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={value}
        onChange={(e) => setter(cleanDigits(e.target.value))}
        placeholder={placeholder}
      />
    </label>
  );

  return (
    <section className="rounded-2xl border border-line bg-panel-2/60 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel text-muted">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Parent code</h3>
          <p className="text-[11px] text-muted">
            The 4-digit code that opens this panel.
          </p>
        </div>
      </div>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {field("Current code", current, setCurrent, "••••")}
        {field("New code", next, setNext, "••••")}
        {field("Confirm new code", confirm, setConfirm, "••••")}
      </form>

      <div className="mt-4 flex items-center justify-end gap-3">
        {status.kind === "saved" ? (
          <span className="text-xs font-medium text-complete">Code updated.</span>
        ) : status.kind === "error" ? (
          <span className="text-xs text-red-300">{status.message}</span>
        ) : (
          <span className="text-[11px] text-muted/60">Digits only, no spaces.</span>
        )}
        <button
          type="button"
          onClick={submit}
          className={cls(
            "rounded-lg px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90",
            "bg-accent text-slate-950",
          )}
        >
          Save code
        </button>
      </div>
    </section>
  );
}