import { useEffect } from "react";
import type { Project } from "@/lib/types";
import { laborFor, variance, overrun, marginAtRisk, fixFor, usd, hoursFmt, HEALTH_META, CO_STATUS_META, getProjectIcon } from "@/lib/constants";
import { Icon } from "@/components/ui";
import { X, Timer, Package, FilePlus, Zap } from "lucide-react";

export function ProjectDrawer({
  p,
  onClose,
  onToast,
  onMarkInvoiced,
}: {
  p: Project;
  onClose: () => void;
  onToast: (msg: string, tone?: "success" | "danger") => void;
  onMarkInvoiced: (projectId: string, coId: string) => Promise<boolean>;
}) {
  const l = laborFor(p);
  const varV = variance(p);
  const or = overrun(p);
  const atRisk = marginAtRisk(p);
  const hrsOver = p.actualHours - p.estHours;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] overlay-in" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl drawer-in">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
             <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
              <Icon icon={getProjectIcon(p.icon)} size={18} />
            </span>
            <div>
              <h3 className="text-[15px] font-bold leading-tight">{p.name}</h3>
              <p className="text-[11px] text-slate-500">
                {p.client} | {p.tag}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close breakdown"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 " + HEALTH_META[p.health].chip}>
              <span className={"h-1.5 w-1.5 rounded-full " + HEALTH_META[p.health].dot + (p.health !== "healthy" ? " animate-pulse" : "")} />
              {HEALTH_META[p.health].label}
            </span>
            <span className="text-[11px] text-slate-400">Contract {usd(p.contract)}</span>
          </div>

          <div
            className={
              "rounded-xl border p-3.5 " +
              (p.health === "critical"
                ? "border-rose-200 bg-rose-50/70"
                : p.health === "warning"
                ? "border-amber-200 bg-amber-50/70"
                : "border-emerald-200 bg-emerald-50/70")
            }
          >
            <div className="flex items-center justify-between">
              <span
                className={
                  "text-[11px] font-semibold uppercase tracking-wide " + HEALTH_META[p.health].text
                }
              >
                {p.health === "healthy" ? "On track" : "Margin at risk"}
              </span>
              <span className={"text-lg font-extrabold tabular-nums " + HEALTH_META[p.health].text}>
                {usd(atRisk)}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {p.health === "healthy"
                ? "Labor and materials are running under estimate. No immediate action needed."
                : "Sum of labor overrun, material overrun, and unbilled change orders on this job."}
            </p>
          </div>

          <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Icon icon={Timer} size={13} className="text-slate-400" /> Labor
            </h4>
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-400">Estimated vs. actual hours</p>
                <p className="text-sm font-bold tabular-nums">
                  {p.estHours}h <span className="text-slate-400">&#8594;</span> {p.actualHours}h
                </p>
              </div>
              <span
                className={
                  "inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums " +
                  (varV.$ > 0 ? "text-rose-600" : "text-emerald-600")
                }
              >
                {varV.$ > 0 ? <span className="text-rose-500">+</span> : ""}
                {usd(varV.$)}
              </span>
            </div>
            <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-full">
                <div
                  className="h-full bg-slate-400/70"
                  style={{ width: (p.estHours / Math.max(p.estHours, p.actualHours)) * 50 + "%" }}
                />
                <div
                  className={"h-full rounded-r-full " + HEALTH_META[p.health].bar}
                  style={{ width: (p.actualHours / Math.max(p.estHours, p.actualHours)) * 50 + "%" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <p className="text-[10px] text-slate-400">Est. cost</p>
                <p className="text-[12px] font-bold tabular-nums">{usd(l.est)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <p className="text-[10px] text-slate-400">Actual cost</p>
                <p className="text-[12px] font-bold tabular-nums">{usd(l.act)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <p className="text-[10px] text-slate-400">Variance</p>
                <p
                  className={
                    "text-[12px] font-bold tabular-nums " + (varV.$ > 0 ? "text-rose-600" : "text-emerald-500")
                  }
                >
                  {varV.$ > 0 ? "+" : ""}
                  {Math.round(varV.pct)}%
                </p>
              </div>
            </div>
            {hrsOver > 0 && (
              <p className="mt-2.5 text-[11px] text-slate-500">
                <span className="font-semibold text-rose-600">+{hoursFmt(hrsOver)}</span> beyond the estimate - at{" "}
                {usd(62)}/hr blended this is the largest labor leak on the job.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Icon icon={Package} size={13} className="text-slate-400" /> Materials
            </h4>
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-400">Budget vs. actual spend</p>
                <p className="text-sm font-bold tabular-nums">
                  {usd(p.materialBudget)} <span className="text-slate-400">&#8594;</span> {usd(p.materialActual)}
                </p>
              </div>
              <span
                className={
                  "inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums " +
                  (or.$ > 0 ? "text-amber-600" : "text-emerald-600")
                }
              >
                {or.$ > 0 ? "+" : ""}
                {usd(or.$)}
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={
                  "h-full rounded-r-full " + (or.$ > 0 ? "bg-amber-500" : "bg-emerald-500")
                }
                style={{
                  width: Math.min(100, (p.materialActual / Math.max(p.materialBudget, 1)) * 100) + "%",
                }}
              />
            </div>
            {or.$ > 0 && (
              <p className="mt-2.5 text-[11px] text-slate-500">
                <span className="font-semibold text-amber-600">{usd(or.$)}</span> over budget (
                {Math.round(or.pct)}%). Check whether overages are billable scope or plan error.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Icon icon={FilePlus} size={13} className="text-slate-400" /> Change orders
            </h4>
            {p.changeOrders.length === 0 && <p className="text-[11.5px] text-slate-400">No change orders on this job.</p>}
            <div className="space-y-2">
              {p.changeOrders.map((co) => {
                const meta = CO_STATUS_META[co.status];
                return (
                  <div
                    key={co.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-slate-700">{co.title}</p>
                      <span className={"mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 " + meta.chip}>
                        {co.id} | {meta.label}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[12px] font-bold tabular-nums text-slate-800">{usd(co.amount)}</span>
                      {co.status !== "invoiced" && (
                        <button
                          onClick={async () => {
                            const ok = await onMarkInvoiced(p.id, co.id);
                            if (ok) onToast("Change order " + co.id + " marked as invoiced.");
                          }}
                          className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-slate-700"
                        >
                          Mark invoiced
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {p.health !== "healthy" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
              <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                <Icon icon={Zap} size={13} /> Suggested fix
              </h4>
              <p className="text-[11.5px] leading-relaxed text-slate-600">{fixFor(p)}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
