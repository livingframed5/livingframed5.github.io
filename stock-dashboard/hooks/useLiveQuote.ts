"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/types";

export function useLiveQuote(symbol: string | null, refreshMs = 60_000): {
  quote: Quote | null;
  loading: boolean;
} {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const sym = (symbol ?? "").toUpperCase();

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const promise = sym
        ? fetch(`/api/stocks?symbol=${encodeURIComponent(sym)}&range=1d`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null);
      promise.then((data) => {
        if (cancelled) return;
        setQuote(data?.quote ?? null);
        setLoading(false);
      });
    };
    run();
    const timer = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sym, refreshMs]);

  return { quote, loading };
}