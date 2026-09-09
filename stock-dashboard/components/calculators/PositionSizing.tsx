"use client";

import { useMemo } from "react";
import { positionSizing } from "@/lib/calculators";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { Card, CardTitle, FieldLabel, NumberInput, Stat } from "@/components/ui";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const STORAGE_KEY = "at:position-sizing";

export default function PositionSizing() {
  const [inputs, setInputs] = useLocalStorage(STORAGE_KEY, {
    accountBalance: 100000,
    riskPercent: 1,
    entryPrice: 0,
    stopLoss: 0,
  });

  const update = (key: keyof typeof inputs) => (value: string) =>
    setInputs((prev) => ({ ...prev, [key]: Number(value) || 0 }));

  const result = useMemo(() => positionSizing(inputs), [inputs]);

  return (
    <Card>
      <CardTitle
        title="Position Sizing"
        subtitle="Risk-based share size with a stop-loss"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Account balance</FieldLabel>
          <NumberInput value={inputs.accountBalance || ""} onChange={(e) => update("accountBalance")(e.target.value)} placeholder="100000" />
        </div>
        <div>
          <FieldLabel hint="%">Risk per trade</FieldLabel>
          <NumberInput value={inputs.riskPercent || ""} onChange={(e) => update("riskPercent")(e.target.value)} placeholder="1" />
        </div>
        <div>
          <FieldLabel>Entry price</FieldLabel>
          <NumberInput value={inputs.entryPrice || ""} onChange={(e) => update("entryPrice")(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <FieldLabel>Stop-loss</FieldLabel>
          <NumberInput value={inputs.stopLoss || ""} onChange={(e) => update("stopLoss")(e.target.value)} placeholder="0.00" />
        </div>
      </div>

      {result ? (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-line bg-panel-2/60 p-3 sm:grid-cols-3">
          <Stat label="Recommended shares" value={fmtNumber(result.shares)} />
          <Stat label="Position value" value={fmtCurrency(result.positionValue)} />
          <Stat label="% of account" value={`${result.positionPct.toFixed(2)}%`} />
          <Stat label="Dollar risk" value={fmtCurrency(result.riskAmount)} tone="down" />
          <Stat label="Risk / share" value={fmtCurrency(result.riskPerShare)} />
          <Stat label="Max loss" value={fmtCurrency(result.maxLoss)} tone="down" />
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-line bg-panel-2/40 p-3 text-xs text-muted">
          Enter risk, entry and a stop-loss below the entry to size the position.
        </div>
      )}
    </Card>
  );
}