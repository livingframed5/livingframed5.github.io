import type { RoutineMode } from "@/lib/routines";

export interface DayActivity {
  date: string;
  /** Maps a step id to the ISO timestamp it was completed. */
  morning: Record<string, string>;
  evening: Record<string, string>;
}

export type ActivityStore = DayActivity[];

const MAX_DAYS = 14;

function emptyDay(date: string): DayActivity {
  return { date, morning: {}, evening: {} };
}

function byDateDesc(a: DayActivity, b: DayActivity): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

function mapRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object") return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" && v) out[k] = v;
  }
  return out;
}

/** Validates a parsed activity store; returns null when unusable. */
export function normalizeActivity(raw: unknown): ActivityStore | null {
  if (!Array.isArray(raw)) return null;
  const out: ActivityStore = [];
  for (const d of raw) {
    if (!d || typeof d !== "object") continue;
    const dd = d as Record<string, unknown>;
    if (typeof dd.date !== "string" || !dd.date) continue;
    const morning = mapRecord(dd.morning);
    const evening = mapRecord(dd.evening);
    if (!morning || !evening) continue;
    out.push({ date: dd.date, morning, evening });
  }
  return out.sort(byDateDesc).slice(0, MAX_DAYS);
}

/** Records a step completion with a timestamp, keeping the last MAX_DAYS. */
export function addStepActivity(
  store: ActivityStore,
  date: string,
  mode: RoutineMode,
  stepId: string,
): ActivityStore {
  const current = (Array.isArray(store) ? store : []).slice();
  const day = current.find((d) => d.date === date) ?? emptyDay(date);
  const updatedDay: DayActivity = {
    ...day,
    [mode]: { ...day[mode], [stepId]: new Date().toISOString() },
  };
  const idx = current.findIndex((d) => d.date === date);
  if (idx === -1) current.unshift(updatedDay);
  else current[idx] = updatedDay;
  return current.sort(byDateDesc).slice(0, MAX_DAYS);
}