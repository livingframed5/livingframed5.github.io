import type { Project } from "@/lib/types";
import { laborFor, variance, overrun, unbilled, coCount, usd, HEALTH_META, getProjectIcon } from "@/lib/constants";
import { Icon } from "@/components/ui";

export type SortKey = "leak" | "margin" | "unbilled" | "name";

export function ProjectsTable({
  rows,
  onOpen,
  selectedId,
}: {
  rows: Project[];
  onOpen: (p: Project) => void;
  selectedId: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2.5 font-semibold">Project</th>
            <th className="px-3 py-2.5 font-semibold">Client</th>
            <th className="px-3 py-2.5 text-right font-semibold">Est. Labor</th>
            <th className="px-3 py-2.5 text-right font-semibold">Actual Labor</th>
            <th className="px-3 py-2.5 text-right font-semibold">Variance ($ / %)</th>
            <th className="px-3 py-2.5 text-right font-semibold">Material Overrun</th>
            <th className="px-3 py-2.5 text-right font-semibold">Unbilled CO</th>
            <th className="px-4 py-2.5 text-right font-semibold">Margin Health</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const v = variance(p);
            const o = overrun(p);
            const ub = unbilled(p);
            const l = laborFor(p);
            const sel = selectedId === p.id;
            return (
              <tr
                key={p.id}
                onClick={() => onOpen(p)}
                className={
                  "cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80 " +
                  (sel ? "bg-rose-50/60" : "")
                }
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg " +
                        (p.health === "critical"
                          ? "bg-rose-100 text-rose-600"
                          : p.health === "warning"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-slate-100 text-slate-500")
                      }
                    >
                      <Icon icon={getProjectIcon(p.icon)} size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-bold text-ink">{p.name}</p>
                      <p className="text-[10.5px] text-slate-400">{p.tag}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-[11.5px] text-slate-600">{p.client}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-600">{usd(l.est)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-600">{usd(l.act)}</td>
                <td className="px-3 py-3 text-right">
                  <span className="flex flex-col items-end leading-tight">
                    <span
                      className={
                        "text-[12px] font-bold tabular-nums " + (v.$ > 0 ? "text-rose-600" : "text-emerald-600")
                      }
                    >
                      {v.$ > 0 ? "+" : ""}
                      {usd(v.$)}
                    </span>
                    <span
                      className={
                        "text-[10.5px] tabular-nums " + (v.$ > 0 ? "text-rose-400" : "text-emerald-500")
                      }
                    >
                      {v.$ > 0 ? "+" : ""}
                      {Math.round(v.pct)}%
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {o.$ === 0 ? (
                    <span className="text-[11px] text-slate-400">-</span>
                  ) : (
                    <span
                      className={
                        "inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums " +
                        (o.$ > 0 ? "text-amber-600" : "text-emerald-600")
                      }
                    >
                      {o.$ > 0 ? "+" : ""}
                      {usd(o.$)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {ub === 0 ? (
                    <span className="text-[11px] text-slate-400">-</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold tabular-nums text-amber-600">
                      {usd(ub)}
                      {coCount(p) > 0 && (
                        <span className="rounded bg-amber-100 px-1 py-px text-[9.5px] font-bold text-amber-700">
                          {coCount(p)}
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className={
                        "hidden text-[10px] font-bold tabular-nums sm:inline " + HEALTH_META[p.health].text
                      }
                    >
                      {p.currentMargin}%
                    </span>
                    <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 " + HEALTH_META[p.health].chip}>
                      <span className={"h-1.5 w-1.5 rounded-full " + HEALTH_META[p.health].dot} />
                      {HEALTH_META[p.health].label}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[12px] text-slate-400">
                No projects match the current filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
