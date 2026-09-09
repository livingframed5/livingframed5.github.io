"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Droplet,
  ArrowLeft,
  LayoutDashboard,
  ClipboardList,
  FileText,
  Timer,
  Settings,
  Receipt,
  Gauge,
  Package,
  FilePlus,
  Zap,
  BarChart3,
  ChevronRight,
  X,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  ArrowDownWideNarrow,
  Leaf,
  Store,
  Hammer,
  Fence,
  LayoutGrid,
  PaintRoller,
  Waves,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   MARGIN LEAK REPORT — Field Operations
   ───────────────────────────────────────────────────────────────────────────
   A dashboard for small construction & service business owners that finds
   where estimated profit leaks away on active jobs:

    1. TOP-LEVEL METRICS   — revenue booked vs. target, labor variance
                             (estimated vs. actual hours in $), unbilled
                             change orders, and average gross margin.
    2. ACTIVE PROJECT TABLE — estimated/actual labor cost, material overruns,
                             unbilled change orders, and a margin-health badge.
                             Sortable by whichever leak is the biggest.
    3. HOURS CHART + FIXES  — estimated vs. actual hours per job, alongside a
                             prioritized immediate-fix callout list.

   Companion source for margin-leak-report.html (single-file runtime build).
   All data is mocked so the dashboard is populated and interactive out of the
   box. Design: light canvas · dark sidebar · soft-red / muted-amber warnings.
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Domain types ────────────────────────────────────────────────────────────

type Health = "healthy" | "warning" | "critical";
type ChangeOrderStatus = "unsigned" | "pending" | "invoiced";

interface ChangeOrder {
  id: string;
  title: string;
  amount: number;
  status: ChangeOrderStatus;
}

interface Project {
  id: string;
  name: string;
  client: string;
  icon: string;
  tag: string;
  estHours: number;
  actualHours: number;
  materialBudget: number;
  materialActual: number;
  contract: number;
  targetMargin: number;
  currentMargin: number;
  health: Health;
  changeOrders: ChangeOrder[];
}

interface Metrics {
  activeCount: number;
  revenueBooked: number;
  revenueTarget: number;
  laborVariance: number;
  laborHrsDelta: number;
  laborVarPct: number;
  unbilledChangeOrders: number;
  coCount: number;
  avgMargin: number;
  avgTargetMargin: number;
}

interface Variance { $: number; pct: number }
interface Overrun { $: number; pct: number }

// ─── Mode (Demo vs. Live) ─────────────────────────────────────────────────────

type Mode = "demo" | "live";

const MODE_STORAGE_KEY = "mlr-mode";

interface ModeOption {
  key: Mode;
  label: string;
  icon: LucideIcon;
  sub: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { key: "demo", label: "Demo", icon: Leaf, sub: "Hardcoded sample data" },
  { key: "live", label: "Live", icon: Store, sub: "Connected to Airtable" },
];

function getStoredMode(): Mode {
  if (typeof window !== "undefined") {
    const v = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (v === "demo" || v === "live") return v;
  }
  return "demo";
}

function setStoredMode(m: Mode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MODE_STORAGE_KEY, m);
  }
}

interface ProjectApiResponse {
  id: string;
  name: string;
  client: string;
  icon?: string;
  tag?: string;
  estHours: number;
  actualHours: number;
  materialBudget: number;
  materialActual: number;
  contract: number;
  targetMargin: number;
  currentMargin: number;
  health: Health;
  changeOrders?: ApiChangeOrder[];
}

interface ApiChangeOrder {
  id: string;
  title: string;
  amount: number;
  status: ChangeOrderStatus;
}

// ─── Constants & mock data ───────────────────────────────────────────────────

/** Blended shop labor rate ($/hr) used to convert labor hours into dollars. */
const LABOR_RATE = 62;

const SEED_PROJECTS: Project[] = [
  {
    id: "p1", name: "Oak Street Landscaping", client: "W. Marcus Property Mgmt", icon: "leaf", tag: "Landscaping",
    estHours: 86, actualHours: 100,
    materialBudget: 3400, materialActual: 4020,
    contract: 18500, targetMargin: 34, currentMargin: 27, health: "critical",
    changeOrders: [{ id: "CO-104", title: "Retaining wall +100 sq ft", amount: 1950, status: "unsigned" }],
  },
  {
    id: "p2", name: "Downtown Retail Remodel", client: "Alder & Stone Retail", icon: "store", tag: "Remodel",
    estHours: 240, actualHours: 296,
    materialBudget: 21500, materialActual: 26875,
    contract: 78400, targetMargin: 38, currentMargin: 30, health: "critical",
    changeOrders: [
      { id: "CO-207", title: "Mezzanine stair + fireproofing", amount: 7200, status: "pending" },
      { id: "CO-208", title: "Casework for back-of-house", amount: 3200, status: "unsigned" },
      { id: "CO-209", title: "Client-selected fixtures", amount: 2000, status: "pending" },
    ],
  },
  {
    id: "p3", name: "Hillsdale Deck Build", client: "R. Covington", icon: "hammer", tag: "Deck",
    estHours: 64, actualHours: 61,
    materialBudget: 4800, materialActual: 4655,
    contract: 22600, targetMargin: 39, currentMargin: 41, health: "healthy",
    changeOrders: [],
  },
  {
    id: "p4", name: "Commercial Irrigation Fix", client: "W. Marcus Property Mgmt", icon: "droplet", tag: "Irrigation",
    estHours: 30, actualHours: 36,
    materialBudget: 1150, materialActual: 1310,
    contract: 7400, targetMargin: 44, currentMargin: 40, health: "warning",
    changeOrders: [{ id: "CO-118", title: "Zone 4 valve replacement", amount: 760, status: "unsigned" }],
  },
  {
    id: "p5", name: "Northfield Fence Replacement", client: "Hearthstone HOA", icon: "fence", tag: "Fence",
    estHours: 58, actualHours: 55,
    materialBudget: 2900, materialActual: 2880,
    contract: 14900, targetMargin: 36, currentMargin: 37, health: "healthy",
    changeOrders: [],
  },
  {
    id: "p6", name: "Cherry Grove Paver Patio", client: "D. & M. Okonkwo", icon: "layout-grid", tag: "Hardscape",
    estHours: 95, actualHours: 104,
    materialBudget: 6200, materialActual: 6820,
    contract: 19300, targetMargin: 42, currentMargin: 38, health: "warning",
    changeOrders: [{ id: "CO-212", title: "Extra paver accent border", amount: 1200, status: "unsigned" }],
  },
  {
    id: "p7", name: "Lincoln Ave Interior Paint", client: "B. Hayes", icon: "paint-roller", tag: "Paint",
    estHours: 140, actualHours: 138,
    materialBudget: 2350, materialActual: 2305,
    contract: 17850, targetMargin: 45, currentMargin: 46, health: "healthy",
    changeOrders: [],
  },
  {
    id: "p8", name: "Sunset St. Pool Resurface", client: "Harborview Realty", icon: "waves", tag: "Pool",
    estHours: 160, actualHours: 192,
    materialBudget: 15800, materialActual: 18140,
    contract: 41200, targetMargin: 40, currentMargin: 33, health: "critical",
    changeOrders: [
      { id: "CO-301", title: "Coping tile upgrade", amount: 3300, status: "pending" },
      { id: "CO-302", title: "Extra coating allowance", amount: 2550, status: "pending" },
    ],
  },
];

// ─── Helmets / derivations ───────────────────────────────────────────────────

const laborFor = (p: Project) => ({ est: p.estHours * LABOR_RATE, act: p.actualHours * LABOR_RATE });

const variance = (p: Project): Variance => {
  const { est, act } = laborFor(p);
  return { $: act - est, pct: est ? ((act - est) / est) * 100 : 0 };
};

const overrun = (p: Project): Overrun => ({
  $: p.materialActual - p.materialBudget,
  pct: p.materialBudget ? ((p.materialActual - p.materialBudget) / p.materialBudget) * 100 : 0,
});

const unbilled = (p: Project) =>
  p.changeOrders.filter((c) => c.status !== "invoiced").reduce((s, c) => s + c.amount, 0);

const coCount = (p: Project) => p.changeOrders.filter((c) => c.status !== "invoiced").length;

const marginAtRisk = (p: Project) =>
  Math.max(0, variance(p).$ ) + Math.max(0, overrun(p).$) + unbilled(p);

function fixFor(p: Project): string {
  const v = variance(p);
  const or = overrun(p);
  const ub = unbilled(p);
  const bits: string[] = [];
  if (ub > 0) bits.push("invoice " + usd(ub) + " in signed/unsigned change orders now");
  if (v.$ > 0) bits.push("freeze overtime until the estimator re-prices");
  if (or.$ > 0) bits.push("verify " + usd(or.$) + " in material overruns against billable scope");
  return bits.length ? "Get the money owed first: " + bits.join(" · ") + "." : "Monitor — job is tracking clean.";
}

// ─── Formatting ──────────────────────────────────────────────────────────────

const usd = (v: number) => (v < 0 ? "-" : "") + "$" + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const hoursFmt = (v: number) => v.toLocaleString("en-US") + "h";
const marginFmt = (v: number) => v.toFixed(1) + "%";

const HEALTH_META: Record<Health, { label: string; dot: string; chip: string; bar: string; text: string }> = {
  healthy: { label: "Healthy", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", bar: "bg-emerald-500", text: "text-emerald-600" },
  warning: { label: "Warning", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", bar: "bg-amber-500", text: "text-amber-600" },
  critical: { label: "Critical Leak", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", bar: "bg-rose-500", text: "text-rose-600" },
};

const CO_STATUS_META: Record<ChangeOrderStatus, { label: string; chip: string }> = {
  unsigned: { label: "Unsigned", chip: "bg-slate-100 text-slate-500 ring-1 ring-slate-300" },
  pending: { label: "Signed · not invoiced", chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  invoiced: { label: "Invoiced", chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
};

// ─── Tiny shared pieces ──────────────────────────────────────────────────────

function Icon({ icon: I, size = 14, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return <I size={size} className={className} />;
}

function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 " + className}>{children}</span>;
}

function HealthBadge({ health, pulse }: { health: Health; pulse?: boolean }) {
  const m = HEALTH_META[health];
  return (
    <Pill className={m.chip}>
      <span className={"h-1.5 w-1.5 rounded-full " + m.dot + (pulse ? " animate-pulse" : "")} />{m.label}
    </Pill>
  );
}

function DeltaChip({ v, invert }: { v: number; invert?: boolean }) {
  const good = invert ? v < 0 : v > 0;
  return (
    <span className={"inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums " + (good ? "text-rose-600" : "text-emerald-600")}>
      {good ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {v > 0 ? "+" : ""}{usd(v)}
    </span>
  );
}

// ─── KPI definitions ─────────────────────────────────────────────────────────

interface KpiCard {
  id: string;
  icon: LucideIcon;
  label: string;
  value: (m: Metrics) => string;
  sub: (m: Metrics) => string;
  bar: (m: Metrics) => number;
  barColor: string;
  extra: (m: Metrics) => string;
}

const KPIS: KpiCard[] = [
  {
    id: "revenue", icon: Receipt, label: "Revenue Booked",
    value: (m) => usd(m.revenueBooked),
    sub: (m) => "of " + usd(m.revenueTarget) + " quarterly target",
    bar: (m) => Math.min(100, (m.revenueBooked / m.revenueTarget) * 100),
    barColor: "bg-emerald-500",
    extra: (m) => "OK " + Math.round((m.revenueBooked / m.revenueTarget) * 100) + "% of goal",
  },
  {
    id: "labor", icon: Timer, label: "Labor Variance",
    value: (m) => usd(m.laborVariance),
    sub: (m) => (m.laborHrsDelta >= 0 ? hoursFmt(m.laborHrsDelta) + " over estimate" : hoursFmt(Math.abs(m.laborHrsDelta)) + " under estimate"),
    bar: (m) => Math.min(100, Math.abs(m.laborVarPct)),
    barColor: "bg-rose-500",
    extra: (m) => (m.laborVariance > 0 ? "Leaking to overtime & rework" : "Crews running lean"),
  },
  {
    id: "unbilled", icon: FileText, label: "Unbilled Change Orders",
    value: (m) => usd(m.unbilledChangeOrders),
    sub: (m) => m.coCount + " change order" + (m.coCount === 1 ? "" : "s") + " waiting to be invoiced",
    bar: (m) => Math.min(100, (m.unbilledChangeOrders / (m.revenueBooked || 1)) * 100),
    barColor: "bg-amber-500",
    extra: () => "Hidden money not yet billed",
  },
  {
    id: "margin", icon: Gauge, label: "Avg Gross Margin",
    value: (m) => marginFmt(m.avgMargin),
    sub: (m) => "across " + m.activeCount + " active jobs",
    bar: (m) => Math.min(100, (m.avgMargin / m.avgTargetMargin) * 100),
    barColor: "bg-violet-500",
    extra: (m) => "Target " + marginFmt(m.avgTargetMargin) + " · " + marginFmt(Math.max(0, m.avgTargetMargin - m.avgMargin)) + " pts at risk",
  },
];

const SORTS = [
  { key: "leak", label: "Biggest leak" },
  { key: "margin", label: "Margin %" },
  { key: "unbilled", label: "Unbilled $" },
  { key: "name", label: "Project" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

const NAV = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: ClipboardList, label: "Active Projects" },
  { icon: FileText, label: "Change Orders" },
  { icon: Timer, label: "Labor & Hours" },
  { icon: Settings, label: "Settings" },
];

// ─── Slices ──────────────────────────────────────────────────────────────────

function ProjectDrawer({ p, onClose, onToast, onMarkInvoiced }: { p: Project; onClose: () => void; onToast: (msg: string, tone?: "success" | "danger") => void; onMarkInvoiced: (projectId: string, coId: string) => void }) {
  const l = laborFor(p);
  const varV = variance(p);
  const or = overrun(p);
  const ub = unbilled(p);
  const atRisk = marginAtRisk(p);
  const hrsOver = p.actualHours - p.estHours;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] overlay-in" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl drawer-in">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">{p.icon}</span>
            <div>
              <h3 className="text-[15px] font-bold leading-tight">{p.name}</h3>
              <p className="text-[11px] text-slate-500">{p.client} · {p.tag}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Close breakdown">
            <X size={16} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center justify-between">
            <HealthBadge health={p.health} pulse={p.health !== "healthy"} />
            <span className="text-[11px] text-slate-400">Contract {usd(p.contract)}</span>
          </div>

          <div className={"rounded-xl border p-3.5 " + (p.health === "critical" ? "border-rose-200 bg-rose-50/70" : p.health === "warning" ? "border-amber-200 bg-amber-50/70" : "border-emerald-200 bg-emerald-50/70")}>
            <div className="flex items-center justify-between">
              <span className={"text-[11px] font-semibold uppercase tracking-wide " + (p.health === "critical" ? "text-rose-600" : p.health === "warning" ? "text-amber-600" : "text-emerald-600")}>
                {p.health === "healthy" ? "On track" : "Margin at risk"}
              </span>
              <span className={"text-lg font-extrabold tabular-nums " + HEALTH_META[p.health].text}>{usd(atRisk)}</span>
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
                <p className="text-sm font-bold tabular-nums">{p.estHours}h <span className="text-slate-400">→</span> {p.actualHours}h</p>
              </div>
              <DeltaChip v={varV.$} />
            </div>
            <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-full">
                <div className="h-full bg-slate-400/70" style={{ width: (p.estHours / Math.max(p.estHours, p.actualHours)) * 50 + "%" }} />
                <div className={"h-full rounded-r-full " + HEALTH_META[p.health].bar} style={{ width: (p.actualHours / Math.max(p.estHours, p.actualHours)) * 50 + "%" }} />
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
                <p className={"text-[12px] font-bold tabular-nums " + (varV.$ > 0 ? "text-rose-600" : "text-emerald-600")}>{varV.$ > 0 ? "+" : ""}{Math.round(varV.pct)}%</p>
              </div>
            </div>
            {hrsOver > 0 && (
              <p className="mt-2.5 text-[11px] text-slate-500">
                <span className="font-semibold text-rose-600">+{hoursFmt(hrsOver)}</span> beyond the estimate — at {usd(LABOR_RATE)}/hr blended this is the largest labor leak on the job.
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
                <p className="text-sm font-bold tabular-nums">{usd(p.materialBudget)} <span className="text-slate-400">→</span> {usd(p.materialActual)}</p>
              </div>
              <DeltaChip v={or.$} />
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={"h-full rounded-r-full " + (or.$ > 0 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: Math.min(100, (p.materialActual / Math.max(p.materialBudget, 1)) * 100) + "%" }} />
            </div>
            {or.$ > 0 && (
              <p className="mt-2.5 text-[11px] text-slate-500"><span className="font-semibold text-amber-600">{usd(or.$)}</span> over budget ({Math.round(or.pct)}%). Check whether overages are billable scope or plan error.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Icon icon={FilePlus} size={13} className="text-slate-400" /> Change orders
              <span className={"ml-auto rounded-md px-1.5 py-0.5 text-[10px] " + (ub > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{usd(ub)} unbilled</span>
            </h4>
            {p.changeOrders.length === 0 && <p className="text-[11.5px] text-slate-400">No change orders on this job.</p>}
            <div className="space-y-2">
              {p.changeOrders.map((co) => {
                const meta = CO_STATUS_META[co.status];
                return (
                  <div key={co.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-slate-700">{co.title}</p>
                      <Pill className={"mt-0.5 " + meta.chip}>{co.id} · {meta.label}</Pill>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[12px] font-bold tabular-nums text-slate-800">{usd(co.amount)}</span>
                      {co.status !== "invoiced" && (
                           <button onClick={() => void onMarkInvoiced(p.id, co.id)}
                          className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-slate-700">
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

function HoursChart({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
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
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-slate-400"></span>Estimated</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-500"></span>Actual</span>
        </div>
      </div>
      <div className="space-y-2">
        {projects.map((p) => {
          const over = p.actualHours - p.estHours;
          return (
            <button key={p.id} onClick={() => onOpen(p)}
              className="group grid w-full grid-cols-[86px_1fr_46px] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50">
              <span className={"truncate text-[11px] font-semibold " + (over > 0 ? "text-ink" : "text-slate-500")}>{p.name}</span>
              <span className="space-y-1">
                <span className="flex items-center gap-1">
                  <span className="h-2 overflow-hidden rounded-sm bg-slate-100">
                    <span className="block h-full rounded-sm bg-slate-400/80 bar-grow" style={{ width: (p.estHours / maxHrs) * 100 + "%" }} />
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 overflow-hidden rounded-sm bg-slate-100">
                    <span className={"block h-full rounded-sm bar-grow " + HEALTH_META[p.health].bar} style={{ width: (p.actualHours / maxHrs) * 100 + "%" }} />
                  </span>
                </span>
              </span>
              <span className={"text-right text-[11px] font-bold tabular-nums " + (over > 0 ? "text-rose-600" : "text-slate-500")}>
                {over !== 0 ? (over > 0 ? "+" : "") + over + "h" : "on budget"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActionItems({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  const items = useMemo(() => {
    const rank = { healthy: 0, warning: 1, critical: 2 };
    return projects
      .map((p) => {
        const v = variance(p); const or = overrun(p); const ub = unbilled(p);
        const score = (v.$ > 0 ? v.$ : 0) + (or.$ > 0 ? or.$ : 0) + ub;
        const detail =
          v.$ > 0 && ub > 0 ? usd(v.$) + " labor over · " + usd(ub) + " unbilled"
          : v.$ > 0 ? usd(v.$) + " labor over budget"
          : or.$ > 0 && ub > 0 ? usd(or.$) + " materials over · " + usd(ub) + " unbilled"
          : ub > 0 ? usd(ub) + " unbilled change orders"
          : or.$ > 0 ? usd(or.$) + " materials over budget"
          : "tracking clean";
        return { p, score, detail, rank: rank[p.health] };
      })
      .filter((x) => x.score > 0 || x.rank > 0)
      .sort((a, b) => b.rank - a.rank || b.score - a.score);
  }, [projects]);

  const toneMap = {
    critical: "border-rose-200 bg-rose-50/70 text-rose-700",
    warning: "border-amber-200 bg-amber-50/70 text-amber-700",
    healthy: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-ink">
        <Icon icon={Zap} size={14} className="text-amber-500" /> Action Items · Immediate Fixes
      </h3>
      <p className="mb-4 text-[11px] text-slate-500">Shortlisted by urgency and dollar impact — open a job for the full breakdown.</p>
      <div className="space-y-2.5">
        {items.map(({ p, detail, rank }) => (
          <button key={p.id} onClick={() => onOpen(p)}
            className={"group w-full rounded-xl border p-3 text-left transition-transform hover:-translate-y-px " + toneMap[rank === 2 ? "critical" : rank === 1 ? "warning" : "healthy"]}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold">{p.name}</span>
              <ChevronRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{detail}</p>
            <p className="mt-1.5 text-[11px] font-medium">{fixFor(p)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Mode Toggle ──────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="mb-5 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Data source</p>
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.75">
        {MODE_OPTIONS.map((opt) => {
          const active = mode === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all " +
                (active
                  ? "bg-white text-ink shadow-sm"
                  : "text-slate-500 hover:text-ink")
              }
            >
              <opt.icon size={12} />
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        {MODE_OPTIONS.find((o) => o.key === mode)?.sub}
      </p>
    </div>
  );
}

function ModeStatus({ mode, source }: { mode: Mode; source: "sample" | "airtable" | "loading" | "error" | "empty" }) {
  const opt = MODE_OPTIONS.find((o) => o.key === mode)!;
  const style =
    mode === "demo"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : source === "loading"
      ? "bg-slate-100 text-slate-600 ring-slate-200"
      : source === "error"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : source === "empty"
      ? "bg-slate-100 text-slate-600 ring-slate-200"
      : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  const label =
    mode === "demo"
      ? "Demo Mode · Sample Data"
      : source === "loading"
      ? "Connecting…"
      : source === "error"
      ? "Connection error"
      : source === "empty"
      ? "No data found"
      : "Live from Airtable";
  return (
    <div
      className={
        "mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium ring-1 " +
        style
      }
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 " +
            (mode === "demo" ? "bg-amber-400" : source === "error" ? "bg-rose-400" : "bg-emerald-400")
          }
        />
        <span
          className={
            "relative inline-flex h-1.5 w-1.5 rounded-full " +
            (mode === "demo" ? "bg-amber-500" : source === "error" ? "bg-rose-500" : source === "loading" ? "bg-slate-400" : "bg-emerald-500")
          }
        />
      </span>
      <opt.icon size={10} />
      <span>{label}</span>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ mode }: { mode: Mode }) {
  if (mode === "demo") {
    return null;
  }
  const opt = MODE_OPTIONS.find((o) => o.key === mode)!;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
          <opt.icon size={20} />
        </div>
        <h3 className="mb-1 text-[15px] font-bold text-slate-700">No live data yet</h3>
        <p className="max-w-sm text-[12px] text-slate-500">
          Live mode is enabled but no data was returned. Check that your Airtable
          base is configured and contains projects with the expected fields, or
          switch to Demo Mode to preview the dashboard with sample data.
        </p>
      </div>
    </div>
  );
}

// ═══════════ MAIN COMPONENT ═══════════

function MarginLeakReport() {
  const [mode, setMode] = useState<Mode>(() => getStoredMode());
  const [invoicedCoIds, setInvoicedCoIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | Health>("all");
  const [sortKey, setSortKey] = useState<SortKey>("leak");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "danger" } | null>(null);
  const [liveProjects, setLiveProjects] = useState<ProjectApiResponse[] | null>(null);
  const [source, setSource] = useState<"sample" | "airtable" | "loading" | "error" | "empty">("sample");
  const [airtableError, setAirtableError] = useState<string | null>(null);

  // Persist mode to localStorage
  useEffect(() => {
    setStoredMode(mode);
  }, [mode]);

  // Fetch live data when mode switches to live
  useEffect(() => {
    if (mode === "demo") {
      setSource("sample");
      return;
    }
    // Live mode: fetch from local API route (Next.js app in margin-leak-report/)
    setSource("loading");
    setAirtableError(null);
    fetch("/api/projects")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ProjectApiResponse[]) => {
        setLiveProjects(data);
        setSource(data.length === 0 ? "empty" : "airtable");
      })
      .catch((err) => {
        setLiveProjects(null);
        setSource("error");
        setAirtableError(err.message ?? String(err));
      });
  }, [mode]);

  // Compute projects based on mode
  const baseProjects: Project[] = useMemo(() => {
    if (mode === "demo") return SEED_PROJECTS;
    if (source !== "airtable" || !liveProjects) return [];
    // Merge live data with SEED_PROJECTS for fields not in Airtable
    return liveProjects.map((api) => {
      const seed = SEED_PROJECTS.find((s) => s.id === api.id);
      const iconName = api.icon || seed?.icon || "droplet";
      return {
        ...api,
        icon: iconName,
        changeOrders: api.changeOrders?.length ? api.changeOrders : seed?.changeOrders || [],
      };
    });
  }, [mode, source, liveProjects]);

  // Apply optimistic invoiced overrides
  const projects: Project[] = useMemo(() => {
    if (invoicedCoIds.size === 0) return baseProjects;
    return baseProjects.map((p) => ({
      ...p,
      changeOrders: p.changeOrders.map((c) =>
        invoicedCoIds.has(c.id) ? { ...c, status: "invoiced" as ChangeOrderStatus } : c,
      ),
    }));
  }, [baseProjects, invoicedCoIds]);

  // Show empty state for live mode when no data
  if (mode === "live" && (source === "loading" || source === "error")) {
    // fall through — table will show empty rows
  } else if (mode === "live" && source === "empty") {
    // fall through — EmptyState handles this
  }

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const notify = (msg: string, tone: "success" | "danger" = "success") => setToast({ msg, tone });

  const markInvoiced = async (projectId: string, coId: string) => {
    if (mode === "demo") {
      const wasAdded = !invoicedCoIds.has(coId);
      setInvoicedCoIds((prev) => {
        const next = new Set(prev);
        if (wasAdded) next.add(coId);
        else next.delete(coId);
        return next;
      });
      notify("Change order " + coId + " marked as invoiced.");
      return;
    }

    // Live mode: optimistic update + API call
    const wasAdded = !invoicedCoIds.has(coId);
    setInvoicedCoIds((prev) => {
      const next = new Set(prev);
      if (wasAdded) next.add(coId);
      else next.delete(coId);
      return next;
    });

    try {
      const res = await fetch(`/api/change-orders/${coId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invoiced" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      notify("Change order " + coId + " marked as invoiced.");
    } catch {
      // Revert optimistic update
      setInvoicedCoIds((prev) => {
        const next = new Set(prev);
        if (wasAdded) next.delete(coId);
        else next.add(coId);
        return next;
      });
      notify("Could not update in Airtable - reverted local change.", "danger");
    }
  };

  const metrics: Metrics = useMemo(() => {
    const activeCount = projects.length;
    const revenueBooked = projects.reduce((s, p) => s + p.contract, 0);
    const revenueTarget = 200000;
    const laborVariance = projects.reduce((s, p) => s + variance(p).$, 0);
    const laborHoursEst = projects.reduce((s, p) => s + p.estHours, 0);
    const laborHoursAct = projects.reduce((s, p) => s + p.actualHours, 0);
    const unbilledChangeOrders = projects.reduce((s, p) => s + unbilled(p), 0);
    const openCoCount = projects.reduce((s, p) => s + coCount(p), 0);
    const marginWeighted = projects.reduce((s, p) => s + p.contract * p.currentMargin, 0);
    const targetWeighted = projects.reduce((s, p) => s + p.contract * p.targetMargin, 0);
    return {
      activeCount, revenueBooked, revenueTarget, laborVariance,
      laborHrsDelta: laborHoursAct - laborHoursEst,
      laborVarPct: laborHoursEst ? ((laborHoursAct - laborHoursEst) / laborHoursEst) * 100 : 0,
      unbilledChangeOrders, coCount: openCoCount,
      avgMargin: marginWeighted / (revenueBooked || 1),
      avgTargetMargin: targetWeighted / (revenueBooked || 1),
    };
  }, [projects]);

  const rows = useMemo(() => {
    const filtered = projects.filter((p) => statusFilter === "all" || p.health === statusFilter);
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name": return a.name.localeCompare(b.name);
        case "margin": return a.currentMargin - b.currentMargin;
        case "unbilled": return unbilled(b) - unbilled(a);
        default: {
          const rank = { critical: 3, warning: 2, healthy: 1 };
          return (rank[b.health] - rank[a.health]) || (marginAtRisk(b) - marginAtRisk(a));
        }
      }
    });
  }, [projects, statusFilter, sortKey]);

  const counts = useMemo(() => ({
    all: projects.length,
    healthy: projects.filter((p) => p.health === "healthy").length,
    warning: projects.filter((p) => p.health === "warning").length,
    critical: projects.filter((p) => p.health === "critical").length,
  }), [projects]);

  const exportCsv = () => {
    const head = ["Project", "Client", "Est Labor", "Actual Labor", "Labor Variance $", "Labor Variance %", "Material Overrun $", "Unbilled CO $", "Margin %", "Health", "Contract $"];
    const lines = rows.map((p) => {
      const v = variance(p); const o = overrun(p);
      return [p.name, p.client, laborFor(p).est, laborFor(p).act, v.$, v.pct.toFixed(1), o.$, unbilled(p), p.currentMargin.toFixed(1), p.health, p.contract].join(",");
    });
    const blob = new Blob(["\ufeff" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "margin-leak-report.csv"; a.click();
    notify("Exported " + rows.length + " rows to CSV.");
  };

  const filterTabs = [
    { key: "all" as const, label: "All", n: counts.all, dot: "bg-slate-500", ring: "data-[on=true]:ring-slate-200 data-[on=true]:bg-slate-50 data-[on=true]:text-ink" },
    { key: "critical" as const, label: "Critical", n: counts.critical, dot: "bg-rose-500", ring: "data-[on=true]:ring-rose-200 data-[on=true]:bg-rose-50 data-[on=true]:text-rose-700" },
    { key: "warning" as const, label: "Warning", n: counts.warning, dot: "bg-amber-500", ring: "data-[on=true]:ring-amber-200 data-[on=true]:bg-amber-50 data-[on=true]:text-amber-700" },
    { key: "healthy" as const, label: "Healthy", n: counts.healthy, dot: "bg-emerald-500", ring: "data-[on=true]:ring-emerald-200 data-[on=true]:bg-emerald-50 data-[on=true]:text-emerald-700" },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-950 text-slate-300 lg:flex">
        <a href="index.html" className="flex items-center gap-2 border-b border-slate-800/70 px-5 py-5 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-300">
          <ArrowLeft size={13} /> Back to work
        </a>
        <div className="px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-rose-400 ring-1 ring-white/10">
              <Droplet size={17} className="text-rose-400" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-white">Margin Leak</p>
              <p className="-mt-0.5 text-[10px] text-slate-500">Field Ops · Week 34</p>
            </div>
          </div>
        </div>
        <nav className="mt-6 flex-1 space-y-0.5 px-3">
          {NAV.map((n) => (
            <button key={n.label} className={"flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors " + (n.active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200")}>
              <n.icon size={15} className={n.active ? "text-rose-400" : ""} />
              {n.label}
              {n.label === "Active Projects" && <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">{projects.length}</span>}
              {n.label === "Change Orders" && <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">{metrics.coCount}</span>}
            </button>
          ))}
        </nav>
        <div className="m-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <ModeToggle mode={mode} onChange={setMode} />
          <ModeStatus mode={mode} source={source} />
          {airtableError && (
            <p className="mt-2 text-[9.5px] leading-relaxed text-rose-400/80">
              {airtableError}
            </p>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-center gap-3">
            <a href="index.html" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm transition-colors hover:text-ink lg:hidden">
              <ArrowLeft size={12} /> Portfolio
            </a>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-[19px] font-extrabold tracking-tight text-ink">
                <Droplet size={19} className="text-rose-500 lg:hidden" />
                Margin Leak Report
              </h1>
              <p className="mt-0.5 text-[12px] text-slate-500">Track where estimated profit leaks on {metrics.activeCount} active jobs — labor, materials &amp; unbilled change orders.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm sm:inline-flex sm:items-center sm:gap-1.5">
                <Calendar size={12} /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <button onClick={exportCsv} disabled={mode === "live" && source !== "airtable"} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-50">
                <Download size={12} /> Export CSV
              </button>
            </div>
          </header>

          {(mode === "live" && (source === "loading" || source === "error" || source === "empty")) ? (
            <EmptyState mode={mode} />
          ) : (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {KPIS.map((k) => (
              <article key={k.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <k.icon size={13} className="text-slate-400" /> {k.label}
                  </span>
                  {k.id === "labor" && metrics.laborVariance > 0 && (
                    <Pill className="bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" /> Over
                    </Pill>
                  )}
                </div>
                <p className={"mt-2 text-[26px] font-extrabold tracking-tight tabular-nums " + (k.id === "labor" && metrics.laborVariance > 0 ? "text-rose-600" : "text-ink")}>{k.value(metrics)}</p>
                <p className="text-[11px] text-slate-500">{k.sub(metrics)}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={"h-full rounded-full bar-grow " + k.barColor} style={{ width: k.bar(metrics) + "%" }} />
                </div>
                <p className="mt-1.5 text-[10.5px] font-medium text-slate-400">{k.extra(metrics)}</p>
              </article>
            ))}
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
              <h2 className="text-[13px] font-bold text-ink">Active Project Margin Leaks</h2>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                  {filterTabs.map((t) => (
                    <button key={t.key} data-on={statusFilter === t.key} onClick={() => setStatusFilter(t.key)}
                      className={"flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-ink data-[on=true]:bg-white data-[on=true]:shadow-sm data-[on=true]:text-ink " + t.ring}>
                      {t.dot && <span className={"h-1.5 w-1.5 rounded-full " + t.dot} />}{t.label}<span className="tabular-nums text-slate-400">{t.n}</span>
                    </button>
                  ))}
                </div>
                <div className="ml-1 hidden items-center gap-1 rounded-lg bg-slate-100 p-0.5 sm:flex">
                  <ArrowDownWideNarrow size={12} className="pl-1 text-slate-400" />
                  {SORTS.map((s) => (
                    <button key={s.key} onClick={() => setSortKey(s.key)}
                      className={"rounded-md px-2 py-1 text-[11px] font-semibold transition-colors " + (sortKey === s.key ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
                    const v = variance(p); const o = overrun(p); const ub = unbilled(p); const l = laborFor(p);
                    const sel = selectedId === p.id;
                    return (
                      <tr key={p.id} onClick={() => setSelectedId(p.id)}
                        className={"cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/80 " + (sel ? "bg-rose-50/60" : "")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg " + (p.health === "critical" ? "bg-rose-100 text-rose-600" : p.health === "warning" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500")}>
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
                            <span className={"text-[12px] font-bold tabular-nums " + (v.$ > 0 ? "text-rose-600" : "text-emerald-600")}>{v.$ > 0 ? "+" : ""}{usd(v.$)}</span>
                            <span className={"text-[10.5px] tabular-nums " + (v.$ > 0 ? "text-rose-400" : "text-emerald-500")}>{v.$ > 0 ? "+" : ""}{Math.round(v.pct)}%</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {o.$ === 0 ? <span className="text-[11px] text-slate-400">—</span> : (
                            <span className={"inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums " + (o.$ > 0 ? "text-amber-600" : "text-emerald-600")}>
                              {o.$ > 0 ? "+" : ""}{usd(o.$)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {ub === 0 ? <span className="text-[11px] text-slate-400">—</span> : (
                            <span className="inline-flex items-center gap-1 text-[12px] font-bold tabular-nums text-amber-600">
                              {usd(ub)}
                              {coCount(p) > 0 && <span className="rounded bg-amber-100 px-1 py-px text-[9.5px] font-bold text-amber-700">{coCount(p)}</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={"hidden text-[10px] font-bold tabular-nums sm:inline " + HEALTH_META[p.health].text}>{p.currentMargin}%</span>
                            <HealthBadge health={p.health} pulse={p.health === "critical"} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-slate-400">No projects match the current filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
              <span>Showing <span className="font-semibold text-slate-600">{rows.length}</span> of {projects.length} active projects · click a row for the detail breakdown.</span>
              <span>Biggest leak first</span>
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

          <footer className="mt-8 text-center text-[11px] text-slate-400">
            <span>
              {mode === "demo"
                ? "Margin Leak Report · prototype with hardcoded sample data · click any project to open the live breakdown panel."
                : "Margin Leak Report · connected to Airtable · click any project to open the live breakdown panel."}
            </span>
          </footer>
          </>
        )}
      </div>
    </main>

    {projects.find((p) => p.id === selectedId) &&
        <ProjectDrawer p={projects.find((p) => p.id === selectedId)!} onClose={() => setSelectedId(null)} onToast={notify} onMarkInvoiced={markInvoiced} />}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div className={"flex items-center gap-2 rounded-xl border bg-white/95 px-4 py-2.5 text-[12px] font-medium shadow-2xl backdrop-blur " +
            (toast.tone === "danger" ? "border-rose-300 text-rose-700" : "border-emerald-300 text-emerald-700")}>
            {toast.tone === "danger" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

function getProjectIcon(icon: string): LucideIcon {
  return ICONS[icon] || Droplet;
}

const ICONS: Record<string, LucideIcon> = {
  leaf: Leaf, store: Store, hammer: Hammer, droplet: Droplet,
  fence: Fence, "layout-grid": LayoutGrid, "paint-roller": PaintRoller, waves: Waves,
};

export default MarginLeakReport;