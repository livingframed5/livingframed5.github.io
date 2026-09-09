import type { Project } from "@/lib/types";
import { HEALTH_META } from "@/lib/constants";
import { Icon } from "@/components/ui";
import { BarChart3 } from "lucide-react";

export function HoursChart({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  const maxHrs = Math.max(...projects.map((p) => Math.max(p.estHours, p.actualHours)));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <Icon icon={BarChart3} size={14} className="text-slate-500" /> Estimated vs. Actual Hours
          </h3>
          <p className="text-[11px] text-slate-500">Where labor is blowing past the estimate — click a row to investigate.</p>
        </div>
        <div className="hidden items-center gap-3 text-[10px] font-medium text-slate-500 sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-slate-400"></span>Estimated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-rose-500"></span>Actual
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {projects.map((p) => {
          const over = p.actualHours - p.estHours;
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="group grid w-full grid-cols-[86px_1fr_46px] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
            >
              <span
                className={
                  "truncate text-[11px] font-semibold " + (over > 0 ? "text-ink" : "text-slate-500")
                }
              >
                {p.name}
              </span>
              <span className="space-y-1">
                <span className="flex items-center gap-1">
                  <span className="h-2 overflow-hidden rounded-sm bg-slate-100">
                    <span
                      className="block h-full rounded-sm bg-slate-400/80 bar-grow"
                      style={{ width: (p.estHours / maxHrs) * 100 + "%" }}
                    />
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 overflow-hidden rounded-sm bg-slate-100">
                    <span
                      className={"block h-full rounded-sm bar-grow " + HEALTH_META[p.health].bar}
                      style={{ width: (p.actualHours / maxHrs) * 100 + "%" }}
                    />
                  </span>
                </span>
              </span>
              <span
                className={
                  "text-right text-[11px] font-bold tabular-nums " +
                  (over > 0 ? "text-rose-600" : "text-slate-500")
                }
              >
                {over !== 0 ? (over > 0 ? "+" : "") + over + "h" : "on budget"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
