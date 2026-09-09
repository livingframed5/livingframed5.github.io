export type RoutineMode = "morning" | "evening";

export type StepGlyph = "wake" | "dress" | "door" | "badge" | "shirt" | "backpack";

export type StepScreen = "transition" | "task";

export interface RoutineStep {
  id: string;
  glyph: StepGlyph;
  /** "transition" renders the calming breathing shape instead of a task icon. */
  screen: StepScreen;
  title: string;
  instruction: string;
  actionLabel: string;
}

export interface RoutineConfig {
  /** Headline shown on the routine's completion screen. */
  title: string;
  steps: RoutineStep[];
}

export type RoutinesConfig = Record<RoutineMode, RoutineConfig>;

export const STEP_GLYPHS: StepGlyph[] = ["wake", "dress", "door", "badge", "shirt", "backpack"];

/**
 * Default routine definitions. Keeping them in one data structure means
 * editing a routine is just editing config — no UI code involved.
 */
export const DEFAULT_CONFIG: RoutinesConfig = {
  morning: {
    title: "Everything is where you left it",
    steps: [
      {
        id: "wake",
        glyph: "wake",
        screen: "transition",
        title: "Morning",
        instruction:
          "Let the light settle in slowly. Breathe in with the glow, out with the pause.",
        actionLabel: "I'm here",
      },
      {
        id: "dress",
        glyph: "dress",
        screen: "task",
        title: "Get dressed",
        instruction: "Put on the grey hoodie and jeans hanging on the door hook.",
        actionLabel: "On",
      },
      {
        id: "door",
        glyph: "door",
        screen: "task",
        title: "Head out",
        instruction: "Put shoes on. Pick up the backpack from the floor by the door.",
        actionLabel: "Ready",
      },
    ],
  },
  evening: {
    title: "Tomorrow is handled",
    steps: [
      {
        id: "badge",
        glyph: "badge",
        screen: "task",
        title: "Badge in the tray",
        instruction: "Put the school badge in the black tray by the front door.",
        actionLabel: "In the tray",
      },
      {
        id: "shirt",
        glyph: "shirt",
        screen: "task",
        title: "Shirt on the hook",
        instruction: "Hang tomorrow's shirt on the blue hook on your door.",
        actionLabel: "Hung up",
      },
      {
        id: "backpack",
        glyph: "backpack",
        screen: "task",
        title: "Backpack packed",
        instruction:
          "Folder, water bottle, and charger inside the backpack. Zip it. Set it by the door.",
        actionLabel: "Packed",
      },
    ],
  },
};

function asStr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isGlyph(value: unknown): value is StepGlyph {
  return typeof value === "string" && (STEP_GLYPHS as string[]).includes(value);
}

/**
 * Validates and sanitizes a parsed configuration (e.g. from localStorage),
 * so a hand-edited or older config can never crash the app. Returns null
 * when the shape is unusable.
 */
export function normalizeConfig(raw: unknown): RoutinesConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const out = {} as RoutinesConfig;

  for (const mode of ["morning", "evening"] as const) {
    const rc = root[mode];
    if (!rc || typeof rc !== "object") return null;
    const recorded = rc as Record<string, unknown>;
    if (!Array.isArray(recorded.steps) || recorded.steps.length === 0) return null;

    const steps: RoutineStep[] = [];
    for (let i = 0; i < recorded.steps.length; i++) {
      const s = recorded.steps[i];
      if (!s || typeof s !== "object") return null;
      const so = s as Record<string, unknown>;
      steps.push({
        id: asStr(so.id, `${mode}-${i}`),
        glyph: isGlyph(so.glyph) ? so.glyph : "dress",
        screen: so.screen === "transition" ? "transition" : "task",
        title: asStr(so.title, `Step ${i + 1}`),
        instruction: asStr(so.instruction, ""),
        actionLabel: asStr(so.actionLabel, "Done"),
      });
    }

    out[mode] = {
      title: asStr(
        recorded.title,
        mode === "morning" ? DEFAULT_CONFIG.morning.title : DEFAULT_CONFIG.evening.title,
      ),
      steps,
    };
  }

  return out;
}