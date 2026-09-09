"use server";

import webpush from "web-push";
import {
  addSubscription,
  removeSubscription,
  withSubscriptions,
} from "@/lib/pushStore";

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject =
  process.env.VAPID_SUBJECT || "mailto:parent@daily-compass.local";

const pushConfigured = Boolean(vapidPublic && vapidPrivate);

if (pushConfigured) {
  webpush.setVapidDetails(vapidSubject, vapidPublic as string, vapidPrivate as string);
}

export async function subscribeUser(
  subscription: unknown,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const count = await addSubscription(subscription);
    return { ok: true, count };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to subscribe" };
  }
}

export async function unsubscribeUser(
  endpoint: string,
): Promise<{ ok: boolean }> {
  try {
    await removeSubscription(endpoint);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
}

export async function sendRoutineNotification(
  payload: PushPayload,
): Promise<{ ok: boolean; delivered?: number; error?: string }> {
  if (!pushConfigured) {
    return { ok: false, error: "Push relay is not configured" };
  }

  const delivered = await withSubscriptions(async (list) => {
    let deliveredCount = 0;
    for (const sub of list) {
      try {
        await webpush.sendNotification(
          sub,
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            tag: payload.tag || "daily-compass",
            badge: "/icon.svg",
          }),
        );
        deliveredCount += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        console.error(
          `[push] send to ${sub.endpoint.slice(0, 48)}… failed:`,
          error instanceof Error ? error.message : error,
        );
        if (typeof statusCode === "number" && statusCode >= 410) {
          // Gone/expired subscription — clean it up so future sends skip it.
          await removeSubscription(sub.endpoint);
        }
      }
    }
    return deliveredCount;
  });

  if (delivered === 0) {
    return { ok: false, error: "No subscribed devices received the push" };
  }
  return { ok: true, delivered };
}