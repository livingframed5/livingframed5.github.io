"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ModeSwitch from "@/components/ModeSwitch";
import MuteButton from "@/components/MuteButton";
import ProgressLine from "@/components/ProgressLine";
import StepDisplay from "@/components/StepDisplay";
import FinishDisplay from "@/components/FinishDisplay";
import ParentEntry from "@/components/ParentEntry";
import ParentAlertBanner from "@/components/ParentAlertBanner";
import type { BannerKind } from "@/components/ParentAlertBanner";
import Gate, { DEFAULT_PIN_ENTRY } from "@/components/Gate";
import ParentMode from "@/components/ParentMode";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { setMuted as setSoundMuted, playChime } from "@/lib/sound";
import { sendRoutineNotification } from "@/app/actions";
import { showLocalNotification } from "@/lib/push";
import { DEFAULT_CONFIG, normalizeConfig } from "@/lib/routines";
import type { RoutineMode, RoutinesConfig } from "@/lib/routines";
import { addStepActivity, normalizeActivity } from "@/lib/activity";
import type { ActivityStore } from "@/lib/activity";
import { cls, todayKey } from "@/lib/format";

interface DayProgress {
  date: string;
  morning: string[];
  evening: string[];
}

const DEFAULT_MODE = (): RoutineMode => "morning";
const DEFAULT_MUTED = (): boolean => false;
const DEFAULT_CONFIG_ENTRY = (): RoutinesConfig | null => null;
const DEFAULT_ACTIVITY = (): ActivityStore => [];
const DEFAULT_NOTIFICATIONS = (): boolean => false;
const DEFAULT_STALL_MINUTES = (): number => 10;
const emptyDay = (): DayProgress => ({ date: todayKey(), morning: [], evening: [] });

/** How long the completed state lingers before gliding to the next step. */
const COMPLETE_HOLD_MS = 420;

/** How often the stalled-step timer checks the clock. */
const STALL_CHECK_MS = 20_000;

export default function RoutineDashboard() {
  const [mode, setMode] = useLocalStorage<RoutineMode>("dc:mode", DEFAULT_MODE);
  const [muted, setMutedState] = useLocalStorage<boolean>("dc:muted", DEFAULT_MUTED);
  const [progress, setProgress] = useLocalStorage<DayProgress>("dc:progress", emptyDay);
  const [customConfig, setCustomConfig] = useLocalStorage<RoutinesConfig | null>(
    "dc:config",
    DEFAULT_CONFIG_ENTRY,
  );
  const [activity, setActivity] = useLocalStorage<ActivityStore>("dc:activity", DEFAULT_ACTIVITY);
  const [pin, setPin] = useLocalStorage<string>("dc:pin", DEFAULT_PIN_ENTRY);
  const [notifications, setNotifications] = useLocalStorage<boolean>(
    "dc:notifications",
    DEFAULT_NOTIFICATIONS,
  );
  const [stallMinutes, setStallMinutes] = useLocalStorage<number>(
    "dc:stallMinutes",
    DEFAULT_STALL_MINUTES,
  );
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const advanceTimer = useRef<number | null>(null);
  // Banners give parents on-screen visibility even when OS toasts are blocked.
  const [banner, setBanner] = useState<{
    id: number;
    kind: BannerKind;
    title: string;
    body: string;
  } | null>(null);
  // Tracks when the current step became active and which steps have already
  // raised a stalled-step alert during this run.
  const activeSinceRef = useRef<number>(0);
  const stallAlertedRef = useRef<Set<string>>(new Set());

  // Progress is scoped to "today". A stored value from a previous day is
  // ignored on render and rewritten cleanly as soon as the user interacts.
  const liveProgress = progress.date === todayKey() ? progress : emptyDay();
  const liveActivity = useMemo(() => normalizeActivity(activity) ?? [], [activity]);
  const effectiveConfig = useMemo(() => normalizeConfig(customConfig) ?? DEFAULT_CONFIG, [customConfig]);

  // Keep the audio engine in sync with the stored mute preference.
  useEffect(() => {
    setSoundMuted(muted);
  }, [muted]);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  /**
   * Sends a notification to subscribed parent devices (push relay first,
   * local service-worker notification as fallback) and flashes an on-screen
   * banner. No-op when the parent hasn't enabled notifications.
   */
  function notify(title: string, body: string, tag: string) {
    if (!notifications) return;
    const kind: BannerKind =
      tag === "dc-stall" ? "stall" : tag === "dc-complete" ? "complete" : "step";
    setBanner({ id: Date.now(), kind, title, body });
    sendRoutineNotification({ title, body, tag }).catch(() => {});
    showLocalNotification(title, body, tag).catch(() => {});
  }

  const steps = useMemo(() => effectiveConfig[mode].steps, [effectiveConfig, mode]);
  const finishTitle = effectiveConfig[mode].title;

  const completed = useMemo(() => {
    const stored = liveProgress[mode] ?? [];
    return stored.filter((id) => steps.some((s) => s.id === id));
  }, [liveProgress, mode, steps]);

  const doneSet = useMemo(() => new Set(completed), [completed]);

  const currentIndex = steps.findIndex((s) => !doneSet.has(s.id));
  const finished = currentIndex === -1;
  const current = finished ? null : steps[currentIndex];
  const completing = current !== null && completingId === current.id;

  // Restart the stall clock each time a new step becomes active.
  useEffect(() => {
    activeSinceRef.current = Date.now();
    const activeId = current?.id;
    if (activeId) stallAlertedRef.current.delete(activeId);
  }, [current?.id]);

  // Auto-dismiss the on-screen banner after a few seconds.
  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 6500);
    return () => window.clearTimeout(id);
  }, [banner]);

  // Watchdog: if the active step sits past the threshold, ping the parent once.
  useEffect(() => {
    if (!current || !notifications || stallMinutes <= 0) return;
    const minutes = stallMinutes;
    const id = window.setInterval(() => {
      const elapsedMs = Date.now() - activeSinceRef.current;
      if (elapsedMs >= minutes * 60_000 && !stallAlertedRef.current.has(current.id)) {
        stallAlertedRef.current.add(current.id);
        notify(
          "Routine alert",
          `Stalled on "${current.title}" for over ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          "dc-stall",
        );
      }
    }, STALL_CHECK_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, notifications, stallMinutes]);

  function completeStep() {
    if (!current || completing) return;
    const isLast = currentIndex === steps.length - 1;

    // Immediate feedback: flash the completed state and chime first…
    setCompletingId(current.id);
    playChime(isLast ? "done" : "complete");

    // …then glide forward.
    advanceTimer.current = window.setTimeout(() => {
      setCompletingId(null);
      setProgress((p) => {
        const base = p.date === todayKey() ? p : emptyDay();
        return {
          ...base,
          [mode]: [...new Set([...(base[mode] ?? []), current.id])],
        };
      });
      setActivity((store) => addStepActivity(store, todayKey(), mode, current.id));

      if (isLast) {
        notify(
          mode === "morning" ? "Morning routine complete" : "Evening routine complete",
          mode === "morning" ? "She's ready to head out!" : "Everything is ready for tomorrow.",
          "dc-complete",
        );
      } else {
        notify("Step complete", `"${current.title}" finished.`, "dc-step");
      }
    }, COMPLETE_HOLD_MS);
  }

  function restart() {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    setCompletingId(null);
    activeSinceRef.current = Date.now();
    stallAlertedRef.current = new Set();
    setProgress((p) => ({ ...p, date: todayKey(), [mode]: [] }));
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <ModeSwitch mode={mode} onChange={setMode} />
        <div className="flex items-center gap-2">
          <MuteButton muted={muted} onToggle={() => setMutedState((m) => !m)} />
        </div>
      </header>

      <main
        className="flex flex-1 flex-col justify-center py-10"
        aria-live="polite"
        aria-atomic="false"
      >
        <section
          className={cls(
            "grid w-full min-h-[420px] place-items-center rounded-3xl border bg-panel/70 p-8 transition-colors duration-500 sm:min-h-[460px] sm:p-14",
            finished ? "border-complete/25" : "border-line",
          )}
        >
          {finished ? (
            <FinishDisplay
              title={finishTitle}
              message={
                mode === "evening"
                  ? "Everything for tomorrow is already in the tray and the bag. Nothing left to plan — you can stop now."
                  : "Clothes, bag, badge — all where you left them. Nothing to figure out this morning."
              }
              onRestart={restart}
            />
          ) : current ? (
            <StepDisplay
              key={current.id}
              step={current}
              completing={completing}
              onComplete={completeStep}
            />
          ) : null}
        </section>

        <div className="mt-8 px-2">
          <ProgressLine completed={completed.length} total={steps.length} />
        </div>
      </main>

      {gateOpen ? (
        <Gate
          pin={pin}
          onUnlock={() => {
            setGateOpen(false);
            setParentUnlocked(true);
            setParentOpen(true);
          }}
          onCancel={() => setGateOpen(false)}
        />
      ) : null}

      {parentOpen ? (
        <ParentMode
          config={effectiveConfig}
          isCustom={customConfig !== null}
          activity={liveActivity}
          pin={pin}
          notifications={notifications}
          stallMinutes={stallMinutes}
          onSave={(next) => setCustomConfig(next)}
          onRestore={() => setCustomConfig(null)}
          onChangePin={(next) => setPin(next)}
          onNotifications={(next) => setNotifications(next)}
          onStallMinutes={(next) => setStallMinutes(next)}
          onClose={() => setParentOpen(false)}
        />
      ) : null}

      <ParentEntry
        unlocked={parentUnlocked}
        onClick={() => (parentUnlocked ? setParentOpen(true) : setGateOpen(true))}
      />

      {banner ? (
        <ParentAlertBanner
          kind={banner.kind}
          title={banner.title}
          body={banner.body}
          onDismiss={() => setBanner(null)}
        />
      ) : null}
    </div>
  );
}