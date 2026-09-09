"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { Project, Metrics, Health, ChangeOrderStatus } from "@/lib/types";
import { computeMetrics, variance, overrun, unbilled, DASHBOARD_TITLE, DASHBOARD_SUBTITLE, DASHBOARD_FOOTER } from "@/lib/constants";
import { useProjects, markChangeOrderInvoiced } from "@/hooks/useProjects";
import { useSortedRows, FILTER_TABS, SORT_LABELS } from "@/hooks/useSortedRows";
import type { SortKey } from "@/components/ProjectsTable";
import { KpiGrid } from "@/components/KpiGrid";
import { HoursChart } from "@/components/HoursChart";
import { ActionItems } from "@/components/ActionItems";
import { ProjectsTable } from "@/components/ProjectsTable";
import { ProjectDrawer } from "@/components/ProjectDrawer";
import { Toast } from "@/components/Toast";
import { MobileHeader, DesktopSidebar } from "@/components/Sidebar";
import { ModeToggle } from "@/components/ModeToggle";
import { ModeStatus } from "@/components/ModeStatus";
import { EmptyState } from "@/components/EmptyState";
import { useMode } from "@/contexts/ModeContext";

export default function MarginLeakPage() {
  const { mode } = useMode();
  const { projects: hookProjects, source, error: loadError } = useProjects(mode);

  // Track which change order IDs have been optimistically marked as invoiced.
  const [invoicedCoIds, setInvoicedCoIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | Health>("all");
  const [sortKey, setSortKey] = useState<SortKey>("leak");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "danger" } | null>(null);

  // Reset invoiced overrides when mode changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvoicedCoIds(new Set());
  }, [mode]);

  const projects: Project[] = useMemo(() => {
    if (invoicedCoIds.size === 0) return hookProjects;
    return hookProjects.map((p) => ({
      ...p,
      changeOrders: p.changeOrders.map((c) =>
        invoicedCoIds.has(c.id) ? { ...c, status: "invoiced" as ChangeOrderStatus } : c,
      ),
    }));
  }, [hookProjects, invoicedCoIds]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const notify = useCallback((msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
  }, []);

  async function markInvoiced(projectId: string, coId: string): Promise<boolean> {
    setInvoicedCoIds((prev) => new Set(prev).add(coId));

    const ok = await markChangeOrderInvoiced(coId, "invoiced");
    if (!ok) {
      setInvoicedCoIds((prev) => {
        const next = new Set(prev);
        next.delete(coId);
        return next;
      });
      notify("Could not update in Airtable - keeping local change.", "danger");
      return false;
    }
    return true;
  }

  const metrics: Metrics = useMemo(() => computeMetrics(projects), [projects]);
  const rows = useSortedRows(projects, statusFilter, sortKey);

  const counts = useMemo(
    () => ({
      all: projects.length,
      healthy: projects.filter((p) => p.health === "healthy").length,
      warning: projects.filter((p) => p.health === "warning").length,
      critical: projects.filter((p) => p.health === "critical").length,
    }),
    [projects],
  );

  const exportCsv = () => {
    const head = [
      "Project",
      "Client",
      "Est Labor",
      "Actual Labor",
      "Labor Variance $",
      "Labor Variance %",
      "Material Overrun $",
      "Unbilled CO $",
      "Margin %",
      "Health",
      "Contract $",
    ];
    const lines = rows.map((p) => {
      const v = variance(p);
      const o = overrun(p);
      const l = { est: p.estHours * 62, act: p.actualHours * 62 };
      return [
        p.name,
        p.client,
        l.est,
        l.act,
        v.$,
        v.pct.toFixed(1),
        o.$,
        unbilled(p),
        p.currentMargin.toFixed(1),
        p.health,
        p.contract,
      ].join(",");
    });
    const blob = new Blob(["\uFEFF" + [head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "margin-leak-report.csv";
    a.click();
    notify("Exported " + rows.length + " rows to CSV.");
  };

  const selected = selectedId ? projects.find((p) => p.id === selectedId) : null;
  const activeSortLabel = SORT_LABELS[sortKey];
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Determine whether to show empty state / error state.
  const showEmpty = mode === "live" && source === "empty" && !loadError;
  const showError = mode === "live" && (source === "error" || loadError);

  return (
    <div className="flex min-h-screen">
      <DesktopSidebar projects={projects} metrics={metrics} mode={mode} />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-center gap-3">
            <MobileHeader onBack={() => setSelectedId(null)} />
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-[19px] font-extrabold tracking-tight text-ink">
                {DASHBOARD_TITLE}
              </h1>
              <p className="mt-0.5 text-[12px] text-slate-500">{DASHBOARD_SUBTITLE}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ModeToggle />
              <ModeStatus source={source} loadError={loadError} />
              <span className="hidden rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm sm:inline-flex sm:items-center sm:gap-1.5">
                &#128337; {dateStr}
              </span>
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
              >
                &#8595; Export CSV
              </button>
            </div>
          </header>

          {showError && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
              <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-rose-800">
                <span className="text-rose-500">Airtable connection error</span>
              </h3>
              <p className="mt-1 text-[11px] text-rose-700">{loadError}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                Verify AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and table names in .env.local.
              </p>
            </div>
          )}

          {showEmpty ? (
            <EmptyState />
          ) : (
            <>
              <KpiGrid metrics={metrics} />

              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <h2 className="text-[13px] font-bold text-ink">Active Project Margin Leaks</h2>
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                      {FILTER_TABS.map((t) => (
                        <button
                          key={t.key}
                          data-on={statusFilter === t.key}
                          onClick={() => setStatusFilter(t.key)}
                          className={
                            "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-ink data-[on=true]:bg-white data-[on=true]:shadow-sm data-[on=true]:text-ink " +
                            (statusFilter === t.key ? "ring-2 ring-offset-1 ring-slate-200" : "")
                          }
                        >
                          <span className={"h-1.5 w-1.5 rounded-full " + t.dot} />
                          {t.label}
                          <span className="tabular-nums text-slate-400">
                            {counts[t.key === "all" ? "all" : t.key]}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="ml-1 hidden items-center gap-1 rounded-lg bg-slate-100 p-0.5 sm:flex">
                      &#8595;
                      {(["leak", "margin", "unbilled", "name"] as SortKey[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSortKey(s)}
                          className={
                            "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors " +
                            (sortKey === s ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink")
                          }
                        >
                          {SORT_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <ProjectsTable rows={rows} onOpen={(p) => setSelectedId(p.id)} selectedId={selectedId} />

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
                  <span>
                    Showing <span className="font-semibold text-slate-600">{rows.length}</span> of{" "}
                    {projects.length} active projects. Click a row for the detail breakdown.
                  </span>
                  <span>Sorted by: {activeSortLabel}</span>
                </footer>
              </section>

              <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <HoursChart projects={projects} onOpen={(p) => setSelectedId(p.id)} />
                </div>
                <div className="lg:col-span-2">
                  <ActionItems projects={projects} onOpen={(p) => setSelectedId(p.id)} />
                </div>
              </section>
            </>
          )}

          <footer className="mt-8 text-center text-[11px] text-slate-400">
            {DASHBOARD_FOOTER}
          </footer>
        </div>
      </main>

      {selected && (
        <ProjectDrawer
          p={selected}
          onClose={() => setSelectedId(null)}
          onToast={notify}
          onMarkInvoiced={markInvoiced}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
