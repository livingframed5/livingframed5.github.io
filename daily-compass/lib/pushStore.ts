import { promises as fs } from "node:fs";
import path from "node:path";

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

const STORE_PATH = path.join(process.cwd(), ".push-subscriptions.json");

let memoryCache: StoredSubscription[] | null = null;

async function load(): Promise<StoredSubscription[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    memoryCache = Array.isArray(parsed) ? (parsed as StoredSubscription[]) : [];
  } catch {
    memoryCache = [];
  }
  return memoryCache;
}

async function persist(list: StoredSubscription[]): Promise<void> {
  memoryCache = list;
  await fs.writeFile(STORE_PATH, JSON.stringify(list, null, 2), "utf8");
}

/** Saves a browser push subscription (replacing an existing entry for the same endpoint). */
export async function addSubscription(subscription: unknown): Promise<number> {
  const list = await load();
  const s = subscription as StoredSubscription;
  if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth) {
    throw new Error("Invalid subscription payload");
  }
  const filtered = list.filter((item) => item.endpoint !== s.endpoint);
  const next = [...filtered, s];
  await persist(next);
  return next.length;
}

/** Drops a subscription by its endpoint. */
export async function removeSubscription(endpoint: string): Promise<void> {
  const list = await load();
  await persist(list.filter((item) => item.endpoint !== endpoint));
}

/** Performs the given callback once with the current snapshot. */
export async function withSubscriptions<T>(
  fn: (list: StoredSubscription[]) => Promise<T> | T,
): Promise<T> {
  const list = await load();
  return fn(list);
}