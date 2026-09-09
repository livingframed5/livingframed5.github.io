"use client";

import { useMemo, useState } from "react";
import { Copy, RotateCcw, Trash2 } from "lucide-react";
import { copyTrade } from "@/lib/calculators";
import { fmtCurrency, fmtNumber, fmtSignedValue, cls } from "@/lib/format";
import { Button, Card, CardTitle, FieldLabel, NumberInput, TextInput } from "@/components/ui";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useQuotes } from "@/hooks/useQuotes";
import type { InsiderTrade } from "@/lib/types";

const STORAGE_KEY = "at:copy-trades";

export interface CopyTrack {
  id: string;
  ticker: string;
  insider: string;
  price: number;
  shares: number;
  date: string;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function CopyTrade({
  prefill,
  onConsumePrefill,
}: {
  prefill: InsiderTrade | null;
  onConsumePrefill: () => void;
}) {
  const [tracks, setTracks] = useLocalStorage<CopyTrack[]>(STORAGE_KEY, []);
  const [draft, setDraft] = useState({
    ticker: "",
    insider: "",
    price: "",
    shares: "100",
    date: new Date().toISOString().slice(0, 10),
  });

  const tickers = useMemo(() => [...new Set(tracks.map((t) => t.ticker))], [tracks]);
  const { quotes } = useQuotes(tickers, 60_000);

  const quoteFor = (ticker: string) => quotes.find((q) => q.symbol === ticker);

  const applyPrefill = () => {
    if (!prefill) return;
    setDraft({
      ticker: prefill.ticker,
      insider: `${prefill.reporter} (${prefill.company})`,
      price: String(prefill.price),
      shares: "100",
      date: prefill.date,
    });
    onConsumePrefill();
  };

  const addTrack = () => {
    const ticker = draft.ticker.trim().toUpperCase();
    const price = Number(draft.price);
    const shares = Number(draft.shares);
    if (!ticker || !(price > 0) || !(shares > 0)) return;
    setTracks((prev) => [
      { id: uid(), ticker, insider: draft.insider.trim() || "Copy trade", price, shares, date: draft.date },
      ...prev,
    ]);
    setDraft((d) => ({ ...d, ticker: "", insider: "", price: "" }));
  };

  const removeTrack = (id: string) => setTracks((prev) => prev.filter((t) => t.id !== id));

  const resetAll = () => setTracks([]);

  return (
    <Card className="lg:col-span-2">
      <CardTitle
        title="Copy-Trade Tracker"
        subtitle="Sandbox: mirror an insider's latest open-market purchase"
        right={
          tracks.length > 0 ? (
            <Button variant="ghost" onClick={resetAll}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          ) : null
        }
      />

      {prefill ? (
        <div className="mb-4 slide-up flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/40 bg-accent/10 p-3">
          <div className="text-sm">
            <span className="font-medium text-accent">{prefill.ticker}</span>
            <span className="text-muted"> — {prefill.reporter} bought {fmtNumber(prefill.shares)} @ {fmtCurrency(prefill.price)} on {prefill.date}</span>
          </div>
          <Button variant="primary" onClick={applyPrefill} className="!py-1.5 text-xs">
            <Copy className="h-3.5 w-3.5" /> Prefill mirror
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <FieldLabel>Mirror ticker</FieldLabel>
          <TextInput value={draft.ticker} onChange={(e) => setDraft((d) => ({ ...d, ticker: e.target.value }))} placeholder="SOFI" />
        </div>
        <div>
          <FieldLabel>Insider / source</FieldLabel>
          <TextInput value={draft.insider} onChange={(e) => setDraft((d) => ({ ...d, insider: e.target.value }))} placeholder="e.g. Anthony Noto (SoFi)" />
        </div>
        <div>
          <FieldLabel>Insider entry price</FieldLabel>
          <NumberInput value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} placeholder="14.82" />
        </div>
        <div>
          <FieldLabel>Mirror shares</FieldLabel>
          <NumberInput value={draft.shares} onChange={(e) => setDraft((d) => ({ ...d, shares: e.target.value }))} placeholder="100" />
        </div>
      </div>
      <div className="mt-3">
        <Button variant="primary" onClick={addTrack}>
          <Copy className="h-4 w-4" /> Track mirror trade
        </Button>
      </div>

      {tracks.length > 0 ? (
        <div className="mt-5 flex flex-col">
          {tracks.map((t) => {
            const q = quoteFor(t.ticker);
            const result = copyTrade(t.ticker, t.price, t.shares, q?.price ?? null, q?.changePercent ?? null);
            if (!result) return null;
            const up = result.unrealizedPnl >= 0;
            return (
              <div
                key={t.id}
                className="grid grid-cols-2 items-center gap-3 border-b border-line/50 px-1 py-3 last:border-0 lg:grid-cols-[130px_1fr_90px_90px_110px_110px_40px]"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm font-medium">{t.ticker}</div>
                  <div className="truncate text-[11px] text-muted">{t.insider}</div>
                </div>
                <div className="hidden text-xs text-muted lg:block">
                  Mirrored {fmtNumber(t.shares)} sh @ {fmtCurrency(t.price)}
                  <div className="text-muted/60">{t.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted">Cost</div>
                  <div className="font-mono text-xs tabular-nums">{fmtCurrency(result.mirrorCost)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted">Last</div>
                  <div className="font-mono text-xs tabular-nums">
                    {q ? fmtCurrency(q.price) : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted">P&L</div>
                  <div className={cls("font-mono text-xs font-semibold tabular-nums", up ? "text-buy" : "text-sell")}>
                    {fmtSignedValue(result.unrealizedPnl)}
                    <span className="ml-1 text-[10px]">({result.unrealizedPnlPct.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted">Today</div>
                  <div className={cls("font-mono text-xs tabular-nums", (result.dayPnlPct ?? 0) >= 0 ? "text-buy" : "text-sell")}>
                    {result.dayPnlPct != null ? `${result.dayPnlPct.toFixed(2)}%` : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <Button variant="ghost" aria-label="Remove track" onClick={() => removeTrack(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-line bg-panel-2/40 p-3 text-xs text-muted">
          No mirror trades yet. Use the form above, or hit “Copy” on any BUY in the Insider Feed to prefill one.
        </div>
      )}
    </Card>
  );
}