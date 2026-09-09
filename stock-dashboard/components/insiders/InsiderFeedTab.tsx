"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy, FilterX, Layers, Search } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  OrderBadge,
  Select,
  Spinner,
  TextInput,
} from "@/components/ui";
import { cls, fmtCompact, fmtCurrency, fmtDate, fmtNumber } from "@/lib/format";
import type { InsiderCategory, InsiderTrade, OrderType } from "@/lib/types";

interface Props {
  onCopyTrade: (trade: InsiderTrade) => void;
}

interface Filters {
  ticker: string;
  reporter: string;
  type: OrderType | "";
  category: InsiderCategory | "";
  dateFrom: string;
  dateTo: string;
  cluster: boolean;
  windowDays: number;
  minBuys: number;
}

const defaults: Filters = {
  ticker: "",
  reporter: "",
  type: "",
  category: "",
  dateFrom: "",
  dateTo: "",
  cluster: false,
  windowDays: 30,
  minBuys: 2,
};

function within(days: number, a: string, b: string): boolean {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) <= days * 86_400_000;
}

function clusterInfo(trades: InsiderTrade[], windowDays: number, minBuys: number): Set<string> {
  const set = new Set<string>();
  const buysByTicker = new Map<string, string[]>();
  for (const t of trades) {
    if (t.type !== "BUY") continue;
    const arr = buysByTicker.get(t.ticker) ?? [];
    arr.push(t.date);
    buysByTicker.set(t.ticker, arr);
  }
  for (const [ticker, dates] of buysByTicker) {
    for (const anchor of dates) {
      if (dates.filter((d) => within(windowDays, d, anchor)).length >= minBuys) {
        set.add(ticker);
        break;
      }
    }
  }
  return set;
}

export default function InsiderFeedTab({ onCopyTrade }: Props) {
  const [filters, setFilters] = useState<Filters>(defaults);
  const [trades, setTrades] = useState<InsiderTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"edgar" | "demo" | "mixed">("demo");
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

const applyKey = useCallback(
    (key: keyof Filters) => (value: string) => set(key, value as Filters[typeof key]),
    [set],
  );

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (filters.ticker.trim()) params.set("ticker", filters.ticker.trim().toUpperCase());
    if (filters.reporter.trim()) params.set("reporter", filters.reporter.trim());
    if (filters.type) params.set("type", filters.type);
    if (filters.category) params.set("category", filters.category);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.cluster) {
      params.set("cluster", "true");
      params.set("window", String(filters.windowDays));
      params.set("minBuys", String(filters.minBuys));
    }
    fetch(`/api/insider-trades?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad response"))))
      .then((data) => {
        if (cancelled) return;
        setTrades(data.trades ?? []);
        setSource(data.source ?? "demo");
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load insider feed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const clusteredTickers = useMemo(
    () => clusterInfo(trades, filters.windowDays, filters.minBuys),
    [trades, filters.windowDays, filters.minBuys],
  );

  const activeFilterCount = [filters.ticker, filters.reporter, filters.type, filters.category, filters.dateFrom, filters.dateTo].filter(Boolean).length + (filters.cluster ? 1 : 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <TextInput placeholder="Ticker (e.g. NVDA)" value={filters.ticker} onChange={(e) => applyKey("ticker")(e.target.value)} className="pl-8" />
          </div>
          <TextInput placeholder="Insider / public figure name" value={filters.reporter} onChange={(e) => applyKey("reporter")(e.target.value)} />
          <Select value={filters.type} onChange={(e) => applyKey("type")(e.target.value)}>
            <option value="">All types</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </Select>
          <Select value={filters.category} onChange={(e) => applyKey("category")(e.target.value)}>
            <option value="">All filers</option>
            <option value="corporate">Corporate Form 4</option>
            <option value="congressional">Congressional</option>
            <option value="public">Public figures</option>
          </Select>
          <label className="flex items-center gap-2 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={filters.cluster}
              onChange={(e) => set("cluster", e.target.checked)}
              className="h-4 w-4 accent-sky-400"
            />
            <span className="font-medium text-accent">Cluster Buy</span>
          </label>
        </div>
        {filters.cluster ? (
          <div className="mt-3 grid grid-cols-2 gap-3 md:max-w-md">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Window (days)</label>
              <TextInput type="number" min={1} value={filters.windowDays} onChange={(e) => set("windowDays", Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Min buys</label>
              <TextInput type="number" min={2} value={filters.minBuys} onChange={(e) => set("minBuys", Math.max(2, Number(e.target.value) || 2))} />
            </div>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className={cls("h-1.5 w-1.5 rounded-full", source === "edgar" ? "bg-accent pulse-dot" : source === "mixed" ? "bg-sky-400" : "bg-amber-400")} />
              {source === "edgar"
                ? "Live SEC EDGAR feed"
                : source === "mixed"
                  ? "Live SEC EDGAR + sample fills"
                  : "Sample feed (fallback)"}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{trades.length} transactions</span>
          </div>
          <div className="flex items-center gap-2">
            <TextInput type="date" value={filters.dateFrom} onChange={(e) => applyKey("dateFrom")(e.target.value)} className="!w-auto !py-1.5 text-xs" />
            <span className="text-muted">→</span>
            <TextInput type="date" value={filters.dateTo} onChange={(e) => applyKey("dateTo")(e.target.value)} className="!w-auto !py-1.5 text-xs" />
            {activeFilterCount > 0 ? (
              <Button variant="ghost" onClick={() => setFilters(defaults)}>
                <FilterX className="h-4 w-4" /> Clear
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <EmptyState title={error} />
        ) : trades.length === 0 ? (
          <EmptyState title="No matching transactions" subtitle="Try widening your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Filer</th>
                  <th className="px-3 py-3 font-medium">Security</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 text-right font-medium">Shares</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-3 py-3 text-right font-medium">Value</th>
                  <th className="px-4 py-3 text-right font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-line/50 transition-colors last:border-0 hover:bg-panel-2/40">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="font-medium">{t.reporter}</div>
                          <div className="text-[11px] text-muted">
                            {t.title} <span className="text-muted/50">· {t.source === "edgar" ? "Form 4" : "Sample"}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-xs font-medium">{t.ticker}</span>
                        {clusteredTickers.has(t.ticker) ? (
                          <Badge tone="accent">
                            <Layers className="h-2.5 w-2.5" /> Cluster
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted">{t.company}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <OrderBadge type={t.type} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtNumber(t.shares)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{t.price ? fmtCurrency(t.price) : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted">{fmtCompact(t.value)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted">{fmtDate(t.date)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {t.type === "BUY" ? (
                        <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => onCopyTrade(t)}>
                          <Copy className="h-3 w-3" /> Copy
                        </Button>
                      ) : (
                        <Button variant="ghost" disabled className="!px-2 !py-1 text-xs">
                          <ArrowRight className="h-3 w-3" /> Track
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}