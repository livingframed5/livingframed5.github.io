"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PaperSnapshot } from "@/lib/paper";
import { fmtCurrency, fmtDateTime } from "@/lib/format";

function SnapTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: PaperSnapshot }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <div className="rounded-md border border-line bg-panel-2 px-3 py-2 text-xs shadow-lg">
      <div className="text-muted">{fmtDateTime(p.t)}</div>
      <div className="font-mono tabular-nums text-accent">{fmtCurrency(p.v)}</div>
    </div>
  );
}

export default function AccountChart({ snaps }: { snaps: PaperSnapshot[] }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={snaps}>
          <defs>
            <linearGradient id="paperFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => fmtDateTime(v).slice(0, 5)}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip content={<SnapTooltip />} />
          <Area
            type="monotone"
            dataKey="v"
            stroke="var(--accent)"
            strokeWidth={1.5}
            fill="url(#paperFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}