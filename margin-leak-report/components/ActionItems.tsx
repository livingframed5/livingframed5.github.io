import type { Project } from "@/lib/types";
import { variance, overrun, unbilled, marginAtRisk, fixFor, usd } from "@/lib/constants";
import { Icon } from "@/components/ui";
import { Zap, ChevronRight } from "lucide-react";

interface LeakItem {
  p: Project;
  score: number;
  detail: string;
  rank: number;
}

function computeLeakItems(projects: Project[]): LeakItem[] {
  return projects
    .map((p) => {
      const v = variance(p);
      const or = overrun(p);
      const ub = unbilled(p);
      const score = marginAtRisk(p);
      const rank = { critical: 2, warning: 1, healthy: 0 }[p.health];
      const bits: string[] = [];
      if (v.$ > 0) bits.push(v.$ + " labor over (" + Math.round(v.pct) + "% over estimate)");
      if (or.$ > 0) bits.push(usd(or.$) + " materials over budget (" + Math.round(or.pct) + "%)");
      if (ub > 0) bits.push(usd(ub) + " done but not billed");
      return {
        p,
        score,
        detail: bits.length ? bits.join(" | ") : "Slight drift - keep an eye on it.",
        rank,
      };
    })
    .filter((x) => x.score > 0 || x.rank > 0)
    .sort((a, b) => b.rank - a.rank || b.score - a.score);
}

export function ActionItems({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  const items = computeLeakItems(projects);

  const toneMap = {
    critical: "border-rose-200 bg-rose-50/70 text-rose-700",
    warning: "border-amber-200 bg-amber-50/70 text-amber-700",
    healthy: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-ink">
        <Icon icon={Zap} size={14} className="text-amber-500" /> Action Items - Immediate Fixes
      </h3>
      <p className="mb-4 text-[11px] text-slate-500">Shortlisted by urgency and dollar impact - open a job for the full breakdown.</p>
      <div className="space-y-2.5">
        {items.map(({ p, detail, rank }) => (
          <button
            key={p.id}
            onClick={() => onOpen(p)}
            className={
              "group w-full rounded-xl border p-3 text-left transition-transform hover:-translate-y-px " +
              (rank === 2 ? toneMap.critical : rank === 1 ? toneMap.warning : toneMap.healthy)
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold">{p.name}</span>
              <ChevronRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{detail}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-600">{fixFor(p)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
