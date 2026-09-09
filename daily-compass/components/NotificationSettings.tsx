"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { cls, inputCls } from "@/lib/format";
import { sendRoutineNotification } from "@/app/actions";
import {
  getPushStatus,
  pushSupported,
  showLocalNotification,
  subscribeForPush,
  unsubscribeLocal,
} from "@/lib/push";
import type { PushStatus } from "@/lib/push";

/**
 * Parent notification controls: enable/disable push on this device, set the
 * stalled-step alert threshold, and verify the pipe with a test notification.
 */
export default function NotificationSettings({
  enabled,
  stallMinutes,
  onToggle,
  onStallMinutes,
}: {
  enabled: boolean;
  stallMinutes: number;
  onToggle: (enabled: boolean) => void;
  onStallMinutes: (minutes: number) => void;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [testState, setTestState] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "sent"; delivered: number } | { kind: "failed"; error: string }
  >({ kind: "idle" });

  const supported = pushSupported();

  useEffect(() => {
    if (enabled && supported) {
      getPushStatus().then(setStatus).catch(() => setStatus(null));
    }
  }, [enabled, supported]);

  async function enable() {
    setWorking(true);
    setMessage(null);
    const result = await subscribeForPush();
    setWorking(false);
    if (result.ok) {
      onToggle(true);
    } else {
      const text =
        result.reason === "permission"
          ? `Permission was denied (${result.error ?? "no"})? Allow notifications in your browser settings, then try again.`
          : result.reason === "vapid"
            ? "Notification relay isn't configured on this server."
            : result.reason === "unsupported"
              ? "This browser doesn't support push notifications."
              : `Couldn't enable: ${result.error ?? "unknown error"}`;
      setMessage(text);
    }
  }

  async function disable() {
    setWorking(true);
    await unsubscribeLocal();
    setWorking(false);
    onToggle(false);
    setTestState({ kind: "idle" });
  }

  async function sendTest() {
    setTestState({ kind: "sending" });
    const result = await sendRoutineNotification({
      title: "Test notification",
      body: "Push relay is working from Daily Compass.",
      tag: "dc-test",
    });
    const localShown = await showLocalNotification(
      "Test notification",
      "Local notification works.",
      "dc-test-local",
    );
    console.info("[push-test]", { relay: result, localShown, permission: Notification.permission });
    if (result.ok && localShown) {
      setTestState({ kind: "sent", delivered: result.delivered ?? 0 });
    } else if (!result.ok && !localShown) {
      setTestState({
        kind: "failed",
        error: `${result.error ?? "Unknown error"} (and no local notification either)`,
      });
    } else if (result.ok) {
      setTestState({
        kind: "failed",
        error: `Relay sent to ${result.delivered} device(s), but the browser did not show it locally — push arrived elsewhere or display is blocked.`,
      });
    } else {
      setTestState({
        kind: "failed",
        error: `${result.error ?? "Unknown error"} — but the browser did show a local notification.`,
      });
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel-2/60 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel text-muted">
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Parent notifications</h3>
          <p className="text-[11px] text-muted">
            Get a ping on this device when a step is finished or stalls.
          </p>
        </div>
      </div>

      {!supported ? (
        <p className="mt-4 text-xs text-muted">
          Notifications aren&apos;t supported in this browser.
        </p>
      ) : enabled ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-complete/25 bg-complete/[0.06] px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm text-complete">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Notifications are on for this device.
            </span>
            <button
              type="button"
              onClick={disable}
              disabled={working}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
            >
              <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
              Disable
            </button>
          </div>

          {status ? (
            <ul className="space-y-1 rounded-xl border border-line bg-panel px-3 py-2.5 text-[11px] text-muted">
              <li className="flex items-center gap-1.5">
                <StatusDot ok={status.permission === "granted"} /> Permission: {status.permission}
              </li>
              <li className="flex items-center gap-1.5">
                <StatusDot ok={status.swRegistered} /> Service worker registered: {status.swRegistered ? "yes" : "no"}
              </li>
              <li className="flex items-center gap-1.5">
                <StatusDot ok={status.subscribed} /> Subscribed on this device: {status.subscribed ? "yes" : "no"}
              </li>
              <li className="flex items-center gap-1.5">
                <StatusDot ok={status.relayConfigured} /> Push relay configured: {status.relayConfigured ? "yes" : "no"}
              </li>
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={sendTest}
              disabled={testState.kind === "sending"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {testState.kind === "sending" ? "Sending…" : "Send test notification"}
            </button>
            {testState.kind === "sent" ? (
              <span className="text-xs font-medium text-complete">
                Sent — {testState.delivered} device{testState.delivered === 1 ? "" : "s"}.
              </span>
            ) : testState.kind === "failed" ? (
              <span className="text-xs text-red-300">Failed: {testState.error}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-muted">
                Alert if a step takes longer than
              </span>
              <div className="flex items-center gap-2">
                <input
                  className={cls(inputCls, "w-20 text-center tabular-nums")}
                  type="number"
                  min={1}
                  max={120}
                  value={stallMinutes}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(120, Number(e.target.value)));
                    onStallMinutes(Number.isFinite(n) ? n : stallMinutes);
                  }}
                  aria-label="Stalled step alert threshold in minutes"
                />
                <span className="text-xs text-muted">minutes</span>
              </div>
            </label>
            <p className="pb-1 text-[11px] text-muted/70">
              When a step sits active past this limit without being completed,
              the parent device gets a &quot;stalled&quot; alert.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={enable}
            disabled={working}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {working ? "Working…" : "Enable notifications"}
          </button>
          {message ? <p className="mt-2 text-xs text-muted">{message}</p> : null}
        </div>
      )}
    </section>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cls("h-1.5 w-1.5 rounded-full", ok ? "bg-complete" : "bg-red-400")}
      aria-hidden="true"
    />
  );
}