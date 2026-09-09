import type { LucideIcon } from "lucide-react";
import type { Project, Health, ChangeOrderStatus, Metrics, Variance, Overrun, KpiCard, SortDef, HealthMeta, CoStatusMeta, NavItem } from "@/lib/types";
import {
  Droplet,
  LayoutDashboard,
  ClipboardList,
  FileText,
  Timer,
  Settings,
  Receipt,
  Gauge,
  Leaf,
  Store,
  Hammer,
  Fence,
  LayoutGrid,
  PaintRoller,
  Waves,
} from "lucide-react";

/** Blended shop labor rate ($/hr) used to convert labor hours into dollars. */
export const LABOR_RATE = 62;

export const DASHBOARD_TITLE = "Margin Leak Report";
export const DASHBOARD_SUBTITLE = "Track where estimated profit leaks on active jobs - labor, materials & unbilled change orders.";
export const DASHBOARD_FOOTER = "Margin Leak Report - prototype. Connect your job-cost data and the same layout will run on your numbers.";

export const HEALTH_META: Record<Health, HealthMeta> = {
  healthy: {
    label: "Healthy",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  warning: {
    label: "Warning",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  critical: {
    label: "Critical Leak",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    bar: "bg-rose-500",
    text: "text-rose-600",
  },
};

export const CO_STATUS_META: Record<ChangeOrderStatus, CoStatusMeta> = {
  unsigned: { label: "Unsigned", chip: "bg-slate-100 text-slate-500 ring-1 ring-slate-300" },
  pending: { label: "Signed · not invoiced", chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  invoiced: { label: "Invoiced", chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
};

export const ICONS: Record<string, LucideIcon> = {
  leaf: Leaf,
  store: Store,
  hammer: Hammer,
  droplet: Droplet,
  fence: Fence,
  "layout-grid": LayoutGrid,
  "paint-roller": PaintRoller,
  waves: Waves,
};

export const NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: ClipboardList, label: "Active Projects" },
  { icon: FileText, label: "Change Orders" },
  { icon: Timer, label: "Labor & Hours" },
  { icon: Settings, label: "Settings" },
];

export const SORTS: SortDef[] = [
  { key: "leak", label: "Biggest leak" },
  { key: "margin", label: "Margin %" },
  { key: "unbilled", label: "Unbilled $" },
  { key: "name", label: "Project" },
];

export function getProjectIcon(icon: string): LucideIcon {
  return ICONS[icon] || Droplet;
}

/** Derived value: labor cost $ for a project (estimated vs actual). */
export function laborFor(p: Project) {
  return { est: p.estHours * LABOR_RATE, act: p.actualHours * LABOR_RATE };
}

/** Derived value: labor variance for a project. */
export function variance(p: Project): Variance {
  const { est, act } = laborFor(p);
  return { $: act - est, pct: est ? ((act - est) / est) * 100 : 0 };
}

/** Derived value: material overrun for a project. */
export function overrun(p: Project): Overrun {
  return {
    $: p.materialActual - p.materialBudget,
    pct: p.materialBudget ? ((p.materialActual - p.materialBudget) / p.materialBudget) * 100 : 0,
  };
}

/** Derived value: total unbilled change orders on a project. */
export function unbilled(p: Project): number {
  return p.changeOrders.filter((c) => c.status !== "invoiced").reduce((s, c) => s + c.amount, 0);
}

/** Derived value: count of unbilled change orders on a project. */
export function coCount(p: Project): number {
  return p.changeOrders.filter((c) => c.status !== "invoiced").length;
}

/** Derived value: total margin at risk on a project. */
export function marginAtRisk(p: Project): number {
  return Math.max(0, variance(p).$) + Math.max(0, overrun(p).$) + unbilled(p);
}

export function fixFor(p: Project): string {
  const v = variance(p);
  const or = overrun(p);
  const ub = unbilled(p);
  const bits: string[] = [];
  if (ub > 0) bits.push("invoice " + usd(ub) + " in signed/unsigned change orders now");
  if (v.$ > 0) bits.push("freeze overtime until the estimator re-prices");
  if (or.$ > 0) bits.push("verify " + usd(or.$) + " in material overruns against billable scope");
  return bits.length ? "Get the money owed first: " + bits.join(" · ") + "." : "Monitor — job is tracking clean.";
}

/** Formatting helpers */
export const usd = (v: number) =>
  (v < 0 ? "-" : "") + "$" + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const hoursFmt = (v: number) => v.toLocaleString("en-US") + "h";

export const marginFmt = (v: number) => v.toFixed(1) + "%";

export const KPIS: KpiCard[] = [
  {
    id: "revenue",
    icon: Receipt,
    label: "Revenue Booked",
    value: (m) => usd(m.revenueBooked),
    sub: (m) => "of " + usd(m.revenueTarget) + " quarterly target",
    bar: (m) => Math.min(100, (m.revenueBooked / m.revenueTarget) * 100),
    barColor: "bg-emerald-500",
    extra: (m) => "OK " + Math.round((m.revenueBooked / m.revenueTarget) * 100) + "% of goal",
  },
  {
    id: "labor",
    icon: Timer,
    label: "Labor Variance",
    value: (m) => usd(m.laborVariance),
    sub: (m) =>
      m.laborHrsDelta >= 0 ? hoursFmt(m.laborHrsDelta) + " over estimate" : hoursFmt(Math.abs(m.laborHrsDelta)) + " under estimate",
    bar: (m) => Math.min(100, Math.abs(m.laborVarPct)),
    barColor: "bg-rose-500",
    extra: (m) => (m.laborVariance > 0 ? "Leaking to overtime & rework" : "Crews running lean"),
  },
  {
    id: "unbilled",
    icon: FileText,
    label: "Unbilled Change Orders",
    value: (m) => usd(m.unbilledChangeOrders),
    sub: (m) => m.coCount + " change order" + (m.coCount === 1 ? "" : "s") + " waiting to be invoiced",
    bar: (m) => Math.min(100, (m.unbilledChangeOrders / (m.revenueBooked || 1)) * 100),
    barColor: "bg-amber-500",
    extra: () => "Hidden money not yet billed",
  },
  {
    id: "margin",
    icon: Gauge,
    label: "Avg Gross Margin",
    value: (m) => marginFmt(m.avgMargin),
    sub: (m) => "across " + m.activeCount + " active jobs",
    bar: (m) => Math.min(100, (m.avgMargin / m.avgTargetMargin) * 100),
    barColor: "bg-violet-500",
    extra: (m) => "Target " + marginFmt(m.avgTargetMargin) + " · " + marginFmt(Math.max(0, m.avgTargetMargin - m.avgMargin)) + " pts at risk",
  },
];

/** Mock data — used as fallback when Airtable is not configured. */
export const SEED_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Oak Street Landscaping",
    client: "W. Marcus Property Mgmt",
    icon: "leaf",
    tag: "Landscaping",
    estHours: 86,
    actualHours: 100,
    materialBudget: 3400,
    materialActual: 4020,
    contract: 18500,
    targetMargin: 34,
    currentMargin: 27,
    health: "critical",
    changeOrders: [{ id: "CO-104", title: "Retaining wall +100 sq ft", amount: 1950, status: "unsigned" }],
  },
  {
    id: "p2",
    name: "Downtown Retail Remodel",
    client: "Alder & Stone Retail",
    icon: "store",
    tag: "Remodel",
    estHours: 240,
    actualHours: 296,
    materialBudget: 21500,
    materialActual: 26875,
    contract: 78400,
    targetMargin: 38,
    currentMargin: 30,
    health: "critical",
    changeOrders: [
      { id: "CO-207", title: "Mezzanine stair + fireproofing", amount: 7200, status: "pending" },
      { id: "CO-208", title: "Casework for back-of-house", amount: 3200, status: "unsigned" },
      { id: "CO-209", title: "Client-selected fixtures", amount: 2000, status: "pending" },
    ],
  },
  {
    id: "p3",
    name: "Hillsdale Deck Build",
    client: "R. Covington",
    icon: "hammer",
    tag: "Deck",
    estHours: 64,
    actualHours: 61,
    materialBudget: 4800,
    materialActual: 4655,
    contract: 22600,
    targetMargin: 39,
    currentMargin: 41,
    health: "healthy",
    changeOrders: [],
  },
  {
    id: "p4",
    name: "Commercial Irrigation Fix",
    client: "W. Marcus Property Mgmt",
    icon: "droplet",
    tag: "Irrigation",
    estHours: 30,
    actualHours: 36,
    materialBudget: 1150,
    materialActual: 1310,
    contract: 7400,
    targetMargin: 44,
    currentMargin: 40,
    health: "warning",
    changeOrders: [{ id: "CO-118", title: "Zone 4 valve replacement", amount: 760, status: "unsigned" }],
  },
  {
    id: "p5",
    name: "Northfield Fence Replacement",
    client: "Hearthstone HOA",
    icon: "fence",
    tag: "Fence",
    estHours: 58,
    actualHours: 55,
    materialBudget: 2900,
    materialActual: 2880,
    contract: 14900,
    targetMargin: 36,
    currentMargin: 37,
    health: "healthy",
    changeOrders: [],
  },
  {
    id: "p6",
    name: "Cherry Grove Paver Patio",
    client: "D. & M. Okonkwo",
    icon: "layout-grid",
    tag: "Hardscape",
    estHours: 95,
    actualHours: 104,
    materialBudget: 6200,
    materialActual: 6820,
    contract: 19300,
    targetMargin: 42,
    currentMargin: 38,
    health: "warning",
    changeOrders: [{ id: "CO-212", title: "Extra paver accent border", amount: 1200, status: "unsigned" }],
  },
  {
    id: "p7",
    name: "Lincoln Ave Interior Paint",
    client: "B. Hayes",
    icon: "paint-roller",
    tag: "Paint",
    estHours: 140,
    actualHours: 138,
    materialBudget: 2350,
    materialActual: 2305,
    contract: 17850,
    targetMargin: 45,
    currentMargin: 46,
    health: "healthy",
    changeOrders: [],
  },
  {
    id: "p8",
    name: "Sunset St. Pool Resurface",
    client: "Harborview Realty",
    icon: "waves",
    tag: "Pool",
    estHours: 160,
    actualHours: 192,
    materialBudget: 15800,
    materialActual: 18140,
    contract: 41200,
    targetMargin: 40,
    currentMargin: 33,
    health: "critical",
    changeOrders: [
      { id: "CO-301", title: "Coping tile upgrade", amount: 3300, status: "pending" },
      { id: "CO-302", title: "Extra coating allowance", amount: 2550, status: "pending" },
    ],
  },
];

/** Pure derivation — given a list of projects, compute aggregate metrics. */
export function computeMetrics(projects: Project[]): Metrics {
  const revenueBooked = projects.reduce((s, p) => s + p.contract, 0);
  const revenueTarget = 200000;
  const laborVariance = projects.reduce((s, p) => s + variance(p).$, 0);
  const laborHoursEst = projects.reduce((s, p) => s + p.estHours, 0);
  const laborHoursAct = projects.reduce((s, p) => s + p.actualHours, 0);
  const marginWeighted = projects.reduce((s, p) => s + p.contract * p.currentMargin, 0);
  const targetWeighted = projects.reduce((s, p) => s + p.contract * p.targetMargin, 0);
  return {
    activeCount: projects.length,
    revenueBooked,
    revenueTarget,
    laborVariance,
    laborHrsDelta: laborHoursAct - laborHoursEst,
    laborVarPct: laborHoursEst ? ((laborHoursAct - laborHoursEst) / laborHoursEst) * 100 : 0,
    unbilledChangeOrders: projects.reduce((s, p) => s + unbilled(p), 0),
    coCount: projects.reduce((s, p) => s + coCount(p), 0),
    avgMargin: marginWeighted / (revenueBooked || 1),
    avgTargetMargin: targetWeighted / (revenueBooked || 1),
  };
}
