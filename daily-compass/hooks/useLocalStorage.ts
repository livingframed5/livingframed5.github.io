"use client";

import { useCallback, useSyncExternalStore } from "react";

interface CacheEntry<T> {
  value: T;
  ready: boolean;
}

const cache = new Map<string, CacheEntry<unknown>>();
const listeners = new Set<() => void>();

function readStored<T>(key: string, initial: () => T): CacheEntry<T> {
  let stored: T | null = null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) stored = JSON.parse(raw) as T;
  } catch {
    // malformed or blocked storage — keep the initializer value
  }
  return { value: stored !== null ? stored : initial(), ready: true };
}

/**
 * localStorage-backed state, hydration-safe.
 *
 * Uses useSyncExternalStore: the server snapshot is the deterministic
 * initializer (matching SSR HTML); after hydration the live snapshot
 * reads stored values and React performs one clean re-render.
 */
export function useLocalStorage<T>(key: string, initial: () => T) {
  const read = useCallback(
    (allowWindow: boolean): CacheEntry<T> => {
      let entry = cache.get(key) as CacheEntry<T> | undefined;
      if (!entry) {
        entry =
          allowWindow && typeof window !== "undefined"
            ? readStored(key, initial)
            : { value: initial(), ready: false };
        cache.set(key, entry);
      } else if (allowWindow && typeof window !== "undefined" && !entry.ready) {
        // The server-snapshot path cached a placeholder entry during SSR.
        // Now that we're on the client, re-read storage and swap in a fresh
        // entry so useSyncExternalStore detects the change and re-renders.
        entry = readStored(key, initial);
        cache.set(key, entry);
      }
      return entry;
    },
    [key, initial],
  );

  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => read(true), [read]);
  const getServerSnapshot = useCallback(() => read(false), [read]);

  const entry = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = read(true);
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(current.value) : next;
      cache.set(key, { value: resolved, ready: true });
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // quota exceeded or storage blocked — state still updates in memory
      }
      for (const l of listeners) l();
    },
    [key, read],
  );

  return [entry.value, set, entry.ready] as const;
}