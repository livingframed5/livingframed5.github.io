"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Briefcase, ListOrdered, Plus, RefreshCw, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { usePortfolio } from "@/hooks/usePortfolio";
import StockChart from "@/components/StockChart";
import {
  Button,
  Card,
  CardTitle,
  ChangeText,
  EmptyState,
  Segmented,
  Spinner,
  Stat,
  TextInput,
} from "@/components/ui";
import { cls, fmtCompact, fmtCurrency, fmtDateTime, fmtSignedValue } from "@/lib/format";
import type { Candle, Mover, TimeRange } from "@/lib/types";

const RANGES: TimeRange[] = ["1d", "1wk", "1mo", "3mo", "6mo", "1y", "5y"];

export default function WatchlistTab({
  symbols,
  setSymbols,
}: {
  symbols: string[];
  setSymbols: Dispatch<SetStateAction<string[]>>;
}) {
  const [selected, setSelected] = useState<string>(symbols[0] ?? "AAPL");
  const [range, setRange] = useState<TimeRange>("1mo");
  const [history, setHistory] = useState<Candle[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [addInput, setAddInput] = useState("");
  const [historyError, setHistoryError] = useState<string | null>(null);

  const { mergedHoldings, holdingSymbols } = usePortfolio();

  const allSymbols = useMemo(
    () => Array.from(new Set([...holdingSymbols, ...symbols])),
    [holdingSymbols, symbols],
  );

  const activeSymbol =
    selected && allSymbols.includes(selected) ? selected : allSymbols[0] ?? "AAPL";

  const { quotes, loading, refreshedAt, refresh } = useQuotes(allSymbols);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stocks?symbol=${encodeURIComponent(activeSymbol)}&range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad response"))))
      .then((data) => {
        if (!cancelled) {
          setChartLoading(false);
          setHistory(data.history ?? []);
          setHistoryError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChartLoading(false);
          setHistory([]);
          setHistoryError("Could not load chart");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeSymbol, range]);

  const selectedQuote = quotes.find((q) => q.symbol === activeSymbol);

  const addSymbol = useCallback(() => {
    const sym = addInput.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
    if (!sym) return;
    setSymbols((prev) => (prev.includes(sym) ? prev : [...prev, sym]));
    setSelected(sym);
    setAddInput("");
  }, [addInput, setSymbols]);

  const removeSymbol = useCallback(
    (sym: string) => {
      setSymbols((prev) => prev.filter((s) => s !== sym));
      if (selected === sym) setSelected("");
    },
    [selected, setSymbols],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <TextInput
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              placeholder="Add ticker…"
              className="w-40 pl-8"
            />
          </div>
          <Button variant="primary" onClick={addSymbol}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {mergedHoldings.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-buy">
                <Briefcase className="h-3 w-3" /> Holdings
              </span>
              {mergedHoldings.map((h) => (
                <button
                  key={h.symbol}
                  type="button"
                  onClick={() => setSelected(h.symbol)}
                  className={cls(
                    "group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors",
                    activeSymbol === h.symbol
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-emerald-800/50 bg-emerald-500/5 text-muted hover:text-foreground",
                  )}
                >
                  {h.symbol}
                  <span className="text-[10px] text-muted/60">×{h.quantity}</span>
                </button>
              ))}
              <span className="mx-1.5 h-4 w-px bg-line" />
            </div>
          ) : null}
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted">
            <ListOrdered className="h-3 w-3" /> Watch
          </span>
          {symbols.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setSelected(sym)}
              className={cls(
                "group inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors",
                activeSymbol === sym
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-line bg-panel text-muted hover:text-foreground",
              )}
            >
              {sym}
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${sym}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSymbol(sym);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    removeSymbol(sym);
                  }
                }}
                className="text-muted/50 hover:text-sell"
              >
                <Trash2 className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw className={cls("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardTitle
            title={
              <span className="font-mono text-lg">{selectedQuote?.symbol ?? activeSymbol}</span>
            }
            subtitle={
              selectedQuote
                ? `${selectedQuote.name} · ${fmtDateTime(selectedQuote.regularMarketTime)}`
                : "Select a ticker"
            }
            right={
              <Segmented
                value={range}
                onChange={setRange}
                options={RANGES.map((r) => ({ value: r, label: r }))}
              />
            }
          />
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Price" value={selectedQuote ? fmtCurrency(selectedQuote.price) : "—"} />
            <Stat
              label="Change"
              value={selectedQuote ? fmtSignedValue(selectedQuote.change) : "—"}
              tone={selectedQuote && selectedQuote.change > 0 ? "up" : "down"}
            />
            <Stat
              label="%"
              value={selectedQuote ? `${selectedQuote.changePercent.toFixed(2)}%` : "—"}
              tone={selectedQuote && selectedQuote.changePercent > 0 ? "up" : "down"}
            />
            <Stat label="Open" value={selectedQuote ? fmtCurrency(selectedQuote.open) : "—"} />
            <Stat label="Day High" value={selectedQuote ? fmtCurrency(selectedQuote.high) : "—"} />
            <Stat label="Day Low" value={selectedQuote ? fmtCurrency(selectedQuote.low) : "—"} />
          </div>
          {chartLoading ? (
            <div className="flex h-72 items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : historyError ? (
            <div className="flex h-72 items-center justify-center">
              <EmptyState title={historyError} />
            </div>
          ) : (
            <StockChart candles={history} className="h-72 w-full" />
          )}
        </Card>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle
            title="Holdings"
            subtitle={`${mergedHoldings.length} positions · live from your portfolio`}
            right={loading ? <Spinner /> : null}
          />
          <div className="flex max-h-96 flex-col gap-1.5 overflow-y-auto pr-0.5">
            {mergedHoldings.length === 0 ? (
              <EmptyState
                title="No holdings imported"
                subtitle="Import your brokers' Positions CSV in the Portfolio tab to see them here"
              />
            ) : (
              mergedHoldings.map((h) => {
                const q = quotes.find((x) => x.symbol === h.symbol);
                const last = q?.price ?? h.price ?? 0;
                const value = last * h.quantity;
                return (
                  <button
                    key={h.symbol}
                    type="button"
                    onClick={() => setSelected(h.symbol)}
                    className={cls(
                      "flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                      activeSymbol === h.symbol
                        ? "border-accent/60 bg-accent/5"
                        : "border-line bg-panel-2/50 hover:bg-panel-2",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-medium">{h.symbol}</span>
                        <span className="text-[10px] text-muted/70">×{h.quantity}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[11px] text-muted">{h.description || h.symbol}</span>
                        {h.accounts.length > 1 ? (
                          <span className="shrink-0 text-[10px] text-accent/80">{h.accounts.join(" + ")}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular-nums">
                        {value > 0 ? fmtCurrency(value) : "—"}
                        {!q && h.price ? <span className="ml-1 text-[10px] text-muted/60">csv</span> : null}
                      </div>
                      {q ? (
                        <ChangeText value={q.changePercent} />
                      ) : h.price ? (
                        <div className="text-[11px] text-muted/60">@ {fmtCurrency(h.price)}</div>
                      ) : (
                        <div className="text-[11px] text-muted/40">no quote</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Watchlist"
            subtitle={`${symbols.length} symbols · ${refreshedAt ? "Updated " + fmtDateTime(refreshedAt) : ""}`}
            right={loading ? <Spinner /> : null}
          />
          <div className="flex max-h-96 flex-col gap-1.5 overflow-y-auto pr-0.5">
            {symbols.length === 0 ? (
              <EmptyState title="No tickers" subtitle="Add a ticker above to start tracking" />
            ) : (
              quotes
                .filter((q) => symbols.includes(q.symbol))
                .map((q) => (
                  <button
                    key={q.symbol}
                    type="button"
                    onClick={() => setSelected(q.symbol)}
                    className={cls(
                      "flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                      activeSymbol === q.symbol
                        ? "border-accent/60 bg-accent/5"
                        : "border-line bg-panel-2/50 hover:bg-panel-2",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-medium">{q.symbol}</div>
                      <div className="truncate text-[11px] text-muted">{q.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular-nums">{fmtCurrency(q.price)}</div>
                      <ChangeText value={q.changePercent} />
                    </div>
                  </button>
                ))
            )}
          </div>
        </Card>
        </div>

      <Movers />
      </div>
    </div>
  );
}

function Movers() {
  const [data, setData] = useState<{ gainers: Mover[]; losers: Mover[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/movers")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <MoverCard title="Daily Gainers" icon={<TrendingUp className="h-4 w-4 text-buy" />} rows={data?.gainers} loading={loading} />
      <MoverCard title="Daily Losers" icon={<TrendingDown className="h-4 w-4 text-sell" />} rows={data?.losers} loading={loading} />
    </div>
  );
}

function MoverCard({
  title,
  icon,
  rows,
  loading,
}: {
  title: string;
  icon: ReactNode;
  rows?: Mover[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardTitle title={title} right={icon} />
      {loading && !rows ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      ) : !rows?.length ? (
        <EmptyState title="No data" subtitle="Market data unavailable right now" />
      ) : (
        <div className="flex flex-col">
          {rows.map((m) => (
            <div
              key={m.symbol}
              className="flex items-center justify-between border-b border-line/50 px-1 py-2 last:border-0"
            >
              <div className="min-w-0">
                <div className="font-mono text-sm font-medium">{m.symbol}</div>
                <div className="truncate text-[11px] text-muted">{m.name}</div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="font-mono text-xs text-muted">Vol {fmtCompact(m.volume)}</span>
                <span className="font-mono text-sm tabular-nums">{fmtCurrency(m.price)}</span>
                <ChangeText value={m.changePercent} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}