"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Candle } from "@/lib/types";
import { fmtCompact, fmtCurrency } from "@/lib/format";

function axisDate(iso: string, count: number): string {
  const d = new Date(iso);
  if (count > 90) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (count > 14) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: Candle }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const c = payload[0].payload;
  if (!c) return null;
  const up = c.close >= c.open;
  return (
    <div className="rounded-md border border-line bg-panel-2 px-3 py-2 text-xs shadow-lg">
      <div className="text-muted">{axisDate(c.date, 100)}</div>
      <div className={up ? "text-buy" : "text-sell"}>
        Close {fmtCurrency(c.close)} <span className="text-muted">({up ? "▲" : "▼"})</span>
      </div>
      <div className="text-muted">O {fmtCurrency(c.open)} · H {fmtCurrency(c.high)} · L {fmtCurrency(c.low)}</div>
      <div className="text-muted">Vol {fmtCompact(c.volume)}</div>
    </div>
  );
}

export default function StockChart({ candles, className }: { candles: Candle[]; className?: string }) {
  const data = useMemo(
    () => candles.map((c) => ({ ...c, _t: c.date })),
    [candles],
  );

  const up = useMemo(() => {
    if (candles.length < 2) return true;
    return candles[candles.length - 1].close >= candles[0].close;
  }, [candles]);

  const color = up ? "#34d399" : "#f87171";
  const count = candles.length;

  if (!candles.length) {
    return <div className="flex h-64 items-center justify-center text-xs text-muted">No chart data</div>;
  }

  return (
    <div className={className ?? "h-64 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="closeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="_t"
            tickFormatter={(v) => axisDate(v, count)}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmtCurrency(v, v > 1000 ? 0 : 2)}
            width={52}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={1.8}
            fill="url(#closeFill)"
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}