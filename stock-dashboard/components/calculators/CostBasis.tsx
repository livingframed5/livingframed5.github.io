"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { costBasis, type Lot } from "@/lib/calculators";
import { fmtCurrency, fmtNumber, fmtSignedValue } from "@/lib/format";
import { Button, Card, CardTitle, FieldLabel, NumberInput, Stat, TextInput } from "@/components/ui";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLiveQuote } from "@/hooks/useLiveQuote";

const STORAGE_KEY = "at:cost-basis";

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function defaultLot(): Lot {
  return { id: uid(), shares: 0, price: 0 };
}

export default function CostBasis() {
  const [state, setState] = useLocalStorage<{ lots: Lot[]; symbol: string; manualPrice: string }>(STORAGE_KEY, {
    lots: [defaultLot(), defaultLot()],
    symbol: "",
    manualPrice: "",
  });

  const ticker = state.symbol.trim().toUpperCase();
  const { quote } = useLiveQuote(ticker || null);

  const referencePrice = useMemo(() => {
    if (state.manualPrice && Number(state.manualPrice) > 0) return Number(state.manualPrice);
    if (quote?.price) return quote.price;
    return null;
  }, [state.manualPrice, quote]);

  const result = useMemo(
    () => costBasis({ lots: state.lots, currentPrice: referencePrice }),
    [state.lots, referencePrice],
  );

  const setLot = (id: string, key: "shares" | "price", value: string) =>
    setState((prev) => ({
      ...prev,
      lots: prev.lots.map((l) => (l.id === id ? { ...l, [key]: Number(value) || 0 } : l)),
    }));

  const addLot = () => setState((prev) => ({ ...prev, lots: [...prev.lots, defaultLot()] }));

  const removeLot = (id: string) =>
    setState((prev) => ({ ...prev, lots: prev.lots.filter((l) => l.id !== id) }));

  return (
    <Card>
      <CardTitle
        title="Cost Basis & P&L"
        subtitle="Blended average of multiple buy lots"
      />
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <FieldLabel hint="optional">Ticker for live price</FieldLabel>
          <div className="flex items-center gap-2">
            <TextInput value={state.symbol} onChange={(e) => setState((p) => ({ ...p, symbol: e.target.value }))} placeholder="AAPL" />
          </div>
        </div>
        <div>
          <FieldLabel hint="or manual">Reference price</FieldLabel>
          <TextInput
            inputMode="decimal"
            value={state.manualPrice}
            onChange={(e) => setState((p) => ({ ...p, manualPrice: e.target.value }))}
            placeholder={quote?.price ? String(quote.price.toFixed(2)) : "e.g. 180.00"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {state.lots.map((lot) => (
          <div key={lot.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <NumberInput placeholder="Shares" value={lot.shares || ""} onChange={(e) => setLot(lot.id, "shares", e.target.value)} />
            <NumberInput placeholder="Price" value={lot.price || ""} onChange={(e) => setLot(lot.id, "price", e.target.value)} />
            <Button variant="ghost" aria-label="Remove lot" onClick={() => removeLot(lot.id)} disabled={state.lots.length <= 1}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button variant="secondary" onClick={addLot}>
          <Plus className="h-4 w-4" /> Add lot
        </Button>
      </div>

      {result ? (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-line bg-panel-2/60 p-3 sm:grid-cols-3">
          <Stat label="Total shares" value={fmtNumber(result.totalShares)} />
          <Stat label="Total invested" value={fmtCurrency(result.totalCost)} />
          <Stat label="Blended avg price" value={fmtCurrency(result.blendedAvgPrice, 4)} />
          <Stat label="Break-even" value={fmtCurrency(result.breakeven, 4)} />
          <Stat
            label="Unrealized P&L"
            value={fmtSignedValue(result.unrealizedPnl)}
            tone={result.unrealizedPnl >= 0 ? "up" : "down"}
          />
          <Stat
            label="Return"
            value={`${result.unrealizedPnlPct.toFixed(2)}%`}
            tone={result.unrealizedPnlPct >= 0 ? "up" : "down"}
          />
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-line bg-panel-2/40 p-3 text-xs text-muted">
          Add at least one lot with shares and price to calculate your blended cost basis.
        </div>
      )}
    </Card>
  );
}