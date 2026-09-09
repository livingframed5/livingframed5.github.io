"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cls, inputCls } from "@/lib/format";
import { STEP_GLYPHS, DEFAULT_CONFIG, normalizeConfig } from "@/lib/routines";
import type {
  RoutinesConfig,
  RoutineMode,
  RoutineStep,
  StepGlyph,
} from "@/lib/routines";

const GLYPH_LABELS: Record<StepGlyph, string> = {
  wake: "Sunrise (calm wake)",
  dress: "Shirt",
  door: "Door",
  badge: "Badge",
  shirt: "Shirt",
  backpack: "Backpack",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function newStepId(mode: RoutineMode): string {
  return `${mode}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function newStep(mode: RoutineMode): RoutineStep {
  return {
    id: newStepId(mode),
    glyph: "dress",
    screen: "task",
    title: "New step",
    instruction: "Describe the exact action.",
    actionLabel: "Done",
  };
}

export default function RoutineEditor({
  config,
  isCustom,
  onSave,
  onRestore,
  onClose,
}: {
  config: RoutinesConfig;
  isCustom: boolean;
  onSave: (next: RoutinesConfig) => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<RoutinesConfig>(() => clone(config));
  const normalized = useMemo(() => normalizeConfig(draft), [draft]);
  const valid = normalized !== null;

  function patchRoutine(mode: RoutineMode, title: string) {
    setDraft((d) => ({ ...d, [mode]: { ...d[mode], title } }));
  }

  function patchStep(mode: RoutineMode, id: string, patch: Partial<RoutineStep>) {
    setDraft((d) => ({
      ...d,
      [mode]: {
        ...d[mode],
        steps: d[mode].steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      },
    }));
  }

  function removeStep(mode: RoutineMode, id: string) {
    setDraft((d) => ({
      ...d,
      [mode]: { ...d[mode], steps: d[mode].steps.filter((s) => s.id !== id) },
    }));
  }

  function addStep(mode: RoutineMode) {
    setDraft((d) => ({
      ...d,
      [mode]: { ...d[mode], steps: [...d[mode].steps, newStep(mode)] },
    }));
  }

  function moveStep(mode: RoutineMode, index: number, dir: -1 | 1) {
    setDraft((d) => {
      const steps = [...d[mode].steps];
      const j = index + dir;
      if (j < 0 || j >= steps.length) return d;
      [steps[index], steps[j]] = [steps[j], steps[index]];
      return { ...d, [mode]: { ...d[mode], steps } };
    });
  }

  function save() {
    if (!normalized) return;
    onSave(normalized);
  }

  function restore() {
    setDraft(clone(DEFAULT_CONFIG));
    onRestore();
  }

  return (
    <div className="space-y-10">
      <p className="text-xs text-muted">
        Edit what each routine says. Changes save to this device and show on
        the main screen right away.
      </p>

      {(["morning", "evening"] as RoutineMode[]).map((mode) => (
        <section key={mode}>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
            {mode === "morning" ? "Morning" : "Evening"}
          </h3>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Done headline</span>
            <input
              className={inputCls}
              value={draft[mode].title}
              onChange={(e) => patchRoutine(mode, e.target.value)}
              placeholder="Shown when the routine is finished"
            />
          </label>

          <div className="mt-4 space-y-3">
            {draft[mode].steps.map((step, i) => (
              <div key={step.id} className="rounded-2xl border border-line bg-panel-2/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="min-w-[10rem] flex-1">
                    <span className="mb-1 block text-[11px] font-medium text-muted">
                      Step {i + 1} — icon
                    </span>
                    <select
                      className={inputCls}
                      value={step.glyph}
                      onChange={(e) =>
                        patchStep(mode, step.id, { glyph: e.target.value as StepGlyph })
                      }
                    >
                      {STEP_GLYPHS.map((g) => (
                        <option key={g} value={g}>
                          {GLYPH_LABELS[g]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-[10rem] flex-1">
                    <span className="mb-1 block text-[11px] font-medium text-muted">Screen</span>
                    <select
                      className={inputCls}
                      value={step.screen}
                      onChange={(e) =>
                        patchStep(mode, step.id, {
                          screen: e.target.value as "transition" | "task",
                        })
                      }
                    >
                      <option value="task">Standard step</option>
                      <option value="transition">Breathing screen (calm wake)</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3 space-y-3">
                  <input
                    className={inputCls}
                    value={step.title}
                    onChange={(e) => patchStep(mode, step.id, { title: e.target.value })}
                    placeholder="Short title, e.g. Badge in the tray"
                    aria-label={`Step ${i + 1} title`}
                  />
                  <textarea
                    className={cls(inputCls, "min-h-[3.5rem] resize-y")}
                    value={step.instruction}
                    onChange={(e) => patchStep(mode, step.id, { instruction: e.target.value })}
                    placeholder="Say the exact action and name the real object."
                    aria-label={`Step ${i + 1} instruction`}
                  />
                  <input
                    className={inputCls}
                    value={step.actionLabel}
                    onChange={(e) => patchStep(mode, step.id, { actionLabel: e.target.value })}
                    placeholder="Button label, e.g. In the tray"
                    aria-label={`Step ${i + 1} button label`}
                  />
                </div>

                <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => moveStep(mode, i, -1)}
                    aria-label={`Move step ${i + 1} up`}
                    className="grid h-8 w-8 place-items-center rounded-md border border-line bg-panel-2 text-muted transition-colors hover:text-foreground"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(mode, i, 1)}
                    aria-label={`Move step ${i + 1} down`}
                    className="grid h-8 w-8 place-items-center rounded-md border border-line bg-panel-2 text-muted transition-colors hover:text-foreground"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(mode, step.id)}
                    aria-label={`Delete step ${i + 1}`}
                    className="grid h-8 w-8 place-items-center rounded-md border border-red-800/50 bg-red-500/10 text-slate-400 transition-colors hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addStep(mode)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add step
            </button>
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {isCustom ? (
          <button
            type="button"
            onClick={restore}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset to defaults
          </button>
        ) : (
          <span className="text-[11px] text-muted">
            You&apos;re using the default routines. Editing will save your custom version here.
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!valid}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}