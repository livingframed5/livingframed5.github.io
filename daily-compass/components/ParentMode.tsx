"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ClipboardList, Settings, X } from "lucide-react";
import { cls } from "@/lib/format";
import RoutineEditor from "@/components/RoutineEditor";
import ActivityLog from "@/components/ActivityLog";
import ChangePin from "@/components/ChangePin";
import NotificationSettings from "@/components/NotificationSettings";
import { todayKey } from "@/lib/format";
import type { ActivityStore } from "@/lib/activity";
import type { RoutinesConfig } from "@/lib/routines";

type Tab = "routines" | "activity";

/**
 * Gated parent area. Two tabs: routine editing and the activity/history log.
 */
export default function ParentMode({
  config,
  isCustom,
  activity,
  pin,
  notifications,
  stallMinutes,
  onSave,
  onRestore,
  onChangePin,
  onNotifications,
  onStallMinutes,
  onClose,
}: {
  config: RoutinesConfig;
  isCustom: boolean;
  activity: ActivityStore;
  pin: string;
  notifications: boolean;
  stallMinutes: number;
  onSave: (next: RoutinesConfig) => void;
  onRestore: () => void;
  onChangePin: (next: string) => void;
  onNotifications: (enabled: boolean) => void;
  onStallMinutes: (minutes: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("routines");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const tabs: Array<{ value: Tab; label: string; icon: ReactNode }> = [
    { value: "routines", label: "Routines", icon: <Settings className="h-3.5 w-3.5" aria-hidden="true" /> },
    { value: "activity", label: "Routine activity", icon: <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Parent mode"
      className="fixed inset-0 z-50 overflow-y-auto bg-background/85 p-4 backdrop-blur-sm sm:p-6"
    >
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-line bg-panel p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Parent mode</h2>
            <div className="mt-3 inline-flex rounded-lg border border-line bg-panel-2 p-1">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  aria-pressed={tab === t.value}
                  className={cls(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    tab === t.value
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close parent mode"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 text-muted transition-colors hover:border-accent/50 hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6">
          {tab === "routines" ? (
            <div className="space-y-6">
              <RoutineEditor
                config={config}
                isCustom={isCustom}
                onSave={onSave}
                onRestore={onRestore}
                onClose={onClose}
              />
              <NotificationSettings
                enabled={notifications}
                stallMinutes={stallMinutes}
                onToggle={onNotifications}
                onStallMinutes={onStallMinutes}
              />
              <ChangePin currentPin={pin} onChangePin={onChangePin} />
            </div>
          ) : (
            <ActivityLog activity={activity} config={config} today={todayKey()} />
          )}
        </div>
      </div>
    </div>
  );
}