import type { Metrics, KpiCard } from "@/lib/types";
import { KPIS } from "@/lib/constants";
import { Icon } from "@/components/ui";

export function KpiGrid({ metrics }: { metrics: Metrics }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {KPIS.map((k: KpiCard) => (
        <article key={k.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Icon icon={k.icon} size={13} className="text-slate-400" /> {k.label}
            </span>
            {k.id === "labor" && metrics.laborVariance > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                Over
              </span>
            )}
          </div>
          <p
            className={
              "mt-2 text-[26px] font-extrabold tracking-tight tabular-nums " +
              (k.id === "labor" && metrics.laborVariance > 0 ? "text-rose-600" : "text-ink")
            }
          >
            {k.value(metrics)}
          </p>
          <p className="text-[11px] text-slate-500">{k.sub(metrics)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={"h-full rounded-full bar-grow " + k.barColor} style={{ width: k.bar(metrics) + "%" }} />
          </div>
          <p className="mt-1.5 text-[10.5px] font-medium text-slate-400">{k.extra(metrics)}</p>
        </article>
      ))}
    </section>
  );
}
