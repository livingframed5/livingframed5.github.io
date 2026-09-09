"use client";

import { subscribeUser, unsubscribeUser } from "@/app/actions";

export type SubscribeResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: "unsupported" | "permission" | "vapid" | "error"; error?: string };

/** Converts a base64url VAPID public key into a Uint8Array (Push API requirement). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; i += 1) output[i] = rawData.charCodeAt(i);
  return output;
}

/** Whether this browser can receive push notifications. */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  swRegistered: boolean;
  subscribed: boolean;
  endpoint: string | null;
  relayConfigured: boolean;
}

/**
 * Live readout of this browser's push setup — used by the settings card so
 * failures are visible instead of silent.
 */
export async function getPushStatus(): Promise<PushStatus> {
  const supported = pushSupported();
  const base: PushStatus = {
    supported,
    permission: supported ? Notification.permission : ("denied" as NotificationPermission),
    swRegistered: false,
    subscribed: false,
    endpoint: null,
    relayConfigured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
  };
  if (!supported || typeof navigator === "undefined") return base;

  const registration = await navigator.serviceWorker.getRegistration("/");
  base.swRegistered = Boolean(registration);
  if (registration) {
    const sub = await registration.pushManager.getSubscription();
    base.subscribed = Boolean(sub);
    base.endpoint = sub?.endpoint ?? null;
  }
  return base;
}

/** Registers (or reuses) the app service worker. */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

/**
 * Requests notification permission and subscribes this browser to the
 * push relay. Call from a user gesture (e.g. a button click).
 */
export async function subscribeForPush(): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported", error: "Push API not available in this browser" };

  try {
    const permission = await Notification.requestPermission();
    console.info("[push-subscribe] permission =", permission);
    if (permission !== "granted") {
      return { ok: false, reason: "permission", error: `Permission is ${permission}, not "granted"` };
    }

    const registration = await getRegistration();
    console.info("[push-subscribe] sw registration =", registration?.active?.state ?? "none");
    if (!registration) return { ok: false, reason: "error", error: "getRegistration() returned null" };

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      const serialized = JSON.parse(JSON.stringify(existing));
      const res = await subscribeUser(serialized);
      console.info("[push-subscribe] reused subscription, store:", res);
      if (!res.ok) return { ok: false, reason: "error", error: `Server store failed: ${res.error ?? "unknown"}` };
      return { ok: true, subscription: existing };
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return { ok: false, reason: "vapid", error: "No VAPID public key configured" };

    const created = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const serialized = JSON.parse(JSON.stringify(created));
    const res = await subscribeUser(serialized);
    console.info("[push-subscribe] new subscription stored:", res);
    if (!res.ok) return { ok: false, reason: "error", error: `Server store failed: ${res.error ?? "unknown"}` };
    return { ok: true, subscription: created };
  } catch (err) {
    console.error("[push-subscribe] threw:", err);
    return {
      ok: false,
      reason: "error",
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

/** Removes this browser's subscription from the push relay. */
export async function unsubscribeLocal(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const sub = await registration?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await unsubscribeUser(endpoint);
  }
}

/**
 * Local fallback: shows the notification via the service worker even when
 * the push relay is unavailable (same device, tab open or backgrounded).
 * Returns whether the browser actually displayed a notification.
 */
export async function showLocalNotification(
  title: string,
  body: string,
  tag = "daily-compass",
): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return false;
    await registration.showNotification(title, {
      body,
      tag,
      icon: "/icon.svg",
      badge: "/icon.svg",
    });
    return true;
  } catch {
    return false;
  }
}