"use client";

import { useCallback, useEffect, useState } from "react";

type Initer<T> = T | (() => T);

function resolve<T>(initial: Initer<T>): T {
  return typeof initial === "function" ? (initial as () => T)() : initial;
}

export function useLocalStorage<T>(key: string, initial: Initer<T>) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return resolve(initial);
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : resolve(initial);
    } catch {
      return resolve(initial);
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}