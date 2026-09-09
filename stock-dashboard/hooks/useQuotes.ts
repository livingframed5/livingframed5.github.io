"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Quote } from "@/lib/types";

interface QuoteResult {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  refreshedAt: number;
  refresh: () => void;
}

const CONCURRENCY = 6;

async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const quotes: Quote[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < symbols.length) {
      const symbol = symbols[cursor++];
      try {
        const res = await fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}&range=1d`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.quote) quotes.push(data.quote);
      } catch {
        /* ignore single-symbol failures */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, symbols.length) }, worker));
  return quotes;
}

export function useQuotes(symbols: string[], refreshMs = 30_000): QuoteResult {
  const symbolsKey = symbols.join(",");
  const stableSymbols = useMemo(
    () => (symbolsKey ? symbolsKey.split(",") : []),
    [symbolsKey],
  );
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      fetchQuotes(stableSymbols)
        .then((result) => {
          if (cancelled) return;
          setQuotes(result);
          setError(null);
          setRefreshedAt(Date.now());
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load quotes");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();
    const timer = setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [stableSymbols, refreshMs, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { quotes, loading, error, refreshedAt, refresh };
}