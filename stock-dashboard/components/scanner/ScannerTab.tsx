"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, RefreshCw, Search, X } from "lucide-react";
import type { ScannerResponse } from "@/lib/scanner";
import { SCREENS } from "@/lib/scanner";
import { Badge, Button, Card, CardTitle, ChangeText, EmptyState, Spinner } from "@/components/ui";
import { cls, fmtCurrency, fmtDateTime } from "@/lib/format";

const POLL_MS = 5 * 60_000;
const SEEN_KEY = "at:scanner-seen";
const ENABLED_KEY = "at:scanner-screens";

type SeenMap = Record<string, number>;

function loadSeen(): SeenMap {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as SeenMap;
  } catch {
    return {};
  }
}

function saveSeen(seen: SeenMap) {
  const entries = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 300);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignore */
  }
}

function defaultEnabled(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (raw) return { ...Object.fromEntries(SCREENS.map((s) => [s.code, true])), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return Object.fromEntries(SCREENS.map((s) => [s.code, true]));
}

interface NewSignal {
  key: string;
  symbol: string;
  price: number;
  labels: string[];
  at: number;
}

export default function ScannerTab() {
  const [data, setData] = useState<ScannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(defaultEnabled);
  const [newSignals, setNewSignals] = useState<NewSignal[]>([]);

  const notify = useCallback((sig: NewSignal) => {
    setNewSignals((prev) => [sig, ...prev].slice(0, 20));
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(`New scan signal: ${sig.symbol}`, {
        body: `${sig.labels.join(" · ")} — ${fmtCurrency(sig.price)}`,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const runScan = useCallback(
    async (initial: boolean) => {
      setScanning(true);
      try {
        const res = await fetch("/api/scanner");
        if (!res.ok) throw new Error("bad response");
        const d: ScannerResponse = await res.json();
        setData(d);
        const seen = loadSeen();
        for (const hit of d.hits) {
          for (const c of hit.conditions) {
            if (!enabled[c.code]) continue;
            const key = `${hit.symbol}:${c.code}`;
            if (!(key in seen)) {
              seen[key] = Date.now();
              if (!initial) {
                notify({
                  key,
                  symbol: hit.symbol,
                  price: hit.price,
                  labels: [c.label],
                  at: Date.now(),
                });
              }
            }
          }
        }
        saveSeen(seen);
      } catch {
        /* keep last data on failure */
      } finally {
        setLoading(false);
        setScanning(false);
      }
    },
    [enabled, notify],
  );

  useEffect(() => {
    const current = runScan;
    const t0 = setTimeout(() => void current(true), 0);
    const timer = setInterval(() => void current(false), POLL_MS);
    return () => {
      clearTimeout(t0);
      clearInterval(timer);
    };
  }, [runScan]);

  const toggleScreen = (code: string) => {
    const next = { ...enabled, [code]: !enabled[code] };
    setEnabled(next);
    try {
      localStorage.setItem(ENABLED_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const enableNotifications = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().catch(() => {});
  };

  const hits = (data?.hits ?? []).filter((h) =>
    h.conditions.some((c) => enabled[c.code]),
  );
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Card>
        <CardTitle
          title="Market Scanner"
          subtitle={
            data
              ? `Scanned at ${fmtDateTime(new Date(data.scannedAt).getTime())} · ${hits.length} of ${data.hits.length} signals shown`
              : "Screens the universe on objective price/volume rules"
          }
          right={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={enableNotifications}>
                {typeof Notification !== "undefined" && Notification.permission === "granted" ? (
                  <BellRing className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Notify
              </Button>
              <Button variant="secondary" onClick={() => void runScan(false)} disabled={scanning}>
                <RefreshCw className={cls("h-3.5 w-3.5", scanning && "animate-spin")} /> Scan now
              </Button>
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SCREENS.map((s) => (
            <button
              key={s.code}
              type="button"
              title={s.description}
              onClick={() => toggleScreen(s.code)}
              className={cls(
                "flex items-start gap-2 rounded-md border p-2.5 text-left transition-colors",
                enabled[s.code]
                  ? "border-accent/50 bg-accent/5"
                  : "border-line bg-panel-2/50 text-muted",
              )}
            >
              <span
                className={cls(
                  "mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full",
                  enabled[s.code] ? "bg-accent" : "bg-muted/30",
                )}
              />
              <span>
                <span className="block text-xs font-medium">{s.label}</span>
                <span className="block text-[11px] text-muted">{s.description}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          <Search className="h-3.5 w-3.5" />
          Heuristic screening only — not a prediction, not investment advice. Always research a name before acting.
        </p>
      </Card>

      {newSignals.length > 0 ? (
        <Card>
          <CardTitle
            title="Newly triggered signals"
            subtitle="Signals that crossed a threshold since the last scan"
            right={
              <Button variant="ghost" onClick={() => setNewSignals([])}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            }
          />
          <div className="flex flex-col">
            {newSignals.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between border-b border-line/50 px-1 py-2 last:border-0"
              >
                <div className="min-w-0">
                  <span className="font-mono text-sm font-medium">{s.symbol}</span>
                  <span className="ml-2 text-[11px] text-muted">{fmtDateTime(s.at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {s.labels.map((l) => (
                    <Badge key={l} tone="accent">
                      {l}
                    </Badge>
                  ))}
                  <span className="font-mono text-sm tabular-nums">{fmtCurrency(s.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle
          title="Signals"
          subtitle={`${enabledCount}/${SCREENS.length} screens active`}
          right={loading || scanning ? <Spinner /> : null}
        />
        {loading && !data ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : hits.length === 0 ? (
          <EmptyState
            title="Nothing matches right now"
            subtitle="Moves are quiet. Try again later or enable more screens."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-1 py-2">Symbol</th>
                  <th className="px-1 py-2 text-right">Price</th>
                  <th className="px-1 py-2 text-right">Day</th>
                  <th className="px-1 py-2 text-right">RSI-14</th>
                  <th className="px-1 py-2 text-right">vs SMA-50</th>
                  <th className="px-1 py-2 text-right">Vol/20d</th>
                  <th className="px-1 py-2">Triggers</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((h) => (
                  <tr key={h.symbol} className="border-b border-line/50 last:border-0">
                    <td className="px-1 py-2">
                      <span className="font-mono font-medium">{h.symbol}</span>
                      <span className="ml-2 hidden max-w-40 truncate text-[11px] text-muted lg:inline">
                        {h.name}
                      </span>
                    </td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(h.price)}</td>
                    <td className="px-1 py-2 text-right">
                      <ChangeText value={h.changePercent} />
                    </td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">
                      {h.rsi14 > 0 ? h.rsi14.toFixed(1) : "—"}
                    </td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">
                      {h.distFromSMA50 !== 0 ? `${h.distFromSMA50.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-1 py-2 text-right font-mono text-xs tabular-nums">
                      {h.avgVolume20 > 0 ? `${(h.volume / h.avgVolume20).toFixed(1)}×` : "—"}
                    </td>
                    <td className="px-1 py-2">
                      <span className="flex flex-wrap gap-1">
                        {h.conditions.map((c) => (
                          <Badge key={c.code} tone="accent">
                            {c.code.replace(/-/g, " ")}
                          </Badge>
                        ))}
                      </span>
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