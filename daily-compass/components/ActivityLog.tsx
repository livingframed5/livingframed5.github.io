"use client";

import { Check } from "lucide-react";
import { cls, formatDay, formatTime } from "@/lib/format";
import ProgressLine from "@/components/ProgressLine";
import type { ActivityStore, DayActivity } from "@/lib/activity";
import type { RoutinesConfig, RoutineMode } from "@/lib/routines";

const DAYS_TO_SHOW = 7;

export default function ActivityLog({
  activity,
  config,
  today,
}: {
  activity: ActivityStore;
  config: RoutinesConfig;
  today: string;
}) {
  const todayActivity: DayActivity =
    activity.find((a) => a.date === today) ?? { date: today, morning: {}, evening: {} };

  return (
    <div className="space-y-10">
      <p className="text-xs text-muted">
        Live tracking for today. Steps appear as finished with the time they
        were checked off.
      </p>

      {(["morning", "evening"] as RoutineMode[]).map((mode) => {
        const steps = config[mode].steps;
        const done = todayActivity[mode];
        const doneCount = steps.filter((s) => done[s.id]).length;
        const allDone = steps.length > 0 && doneCount === steps.length;

        return (
          <section key={mode}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight">
                {mode === "morning" ? "Morning" : "Evening"}
              </h3>
              <span
                className={cls(
                  "text-xs font-medium tabular-nums",
                  allDone ? "text-complete" : "text-muted",
                )}
              >
                {doneCount}/{steps.length} finished
              </span>
            </div>

            <div className="mb-4 mt-3">
              <ProgressLine completed={doneCount} total={steps.length} />
            </div>

            <ul className="space-y-1.5">
              {steps.map((s, i) => {
                const time = done[s.id];
                const isDone = Boolean(time);
                return (
                  <li
                    key={s.id}
                    className={cls(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                      isDone
                        ? "border-complete/25 bg-complete/[0.06]"
                        : "border-line bg-panel-2/40",
                    )}
                  >
                    <span
                      className={cls(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-medium tabular-nums",
                        isDone ? "bg-complete/20 text-complete" : "bg-line text-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
                    {isDone ? (
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-complete">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        {formatTime(time)}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted/70">Not yet</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section>
        <h3 className="text-sm font-semibold tracking-tight">Last {DAYS_TO_SHOW} days</h3>
        <ul className="mt-3 space-y-1">
          {activity.slice(0, DAYS_TO_SHOW).map((day) => (
            <DaySummaryRow key={day.date} day={day} config={config} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function DaySummaryRow({ day, config }: { day: DayActivity; config: RoutinesConfig }) {
  const morningCount = config.morning.steps.filter((s) => day.morning[s.id]).length;
  const eveningCount = config.evening.steps.filter((s) => day.evening[s.id]).length;
  const morningDone = morningCount === config.morning.steps.length;
  const eveningDone = eveningCount === config.evening.steps.length;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-panel-2/40 px-3 py-2">
      <span className="w-28 shrink-0 text-xs font-medium text-muted">{formatDay(day.date)}</span>
      <span
        className={cls(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums",
          morningDone ? "bg-complete/15 text-complete" : "bg-line text-muted",
        )}
      >
        M {morningCount}/{config.morning.steps.length}
      </span>
      <span
        className={cls(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums",
          eveningDone ? "bg-complete/15 text-complete" : "bg-line text-muted",
        )}
      >
        E {eveningCount}/{config.evening.steps.length}
      </span>
      {morningDone && eveningDone ? (
        <span className="ml-auto flex items-center gap-1 text-[11px] text-complete">
          <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          Both done
        </span>
      ) : null}
    </li>
  );
}