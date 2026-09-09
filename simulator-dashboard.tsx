"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  ChevronDown,
  TrendingDown,
  DollarSign,
  PieChart,
  Scale,
  Users,
  Server,
  Megaphone,
  Building2,
  Flame,
  Clock,
  Activity,
  BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Params {
  // Commercial
  price: number;
  impl: number;
  // Operational drag
  onb: number;
  cap: number;
  // Market friction
  cac: number;
  churnAnnual: number;
  sigs: number;
  // People costs
  avgSalary: number;
  benefitsPct: number;
  seedHeadcount: number;
  employeesPerCustomer: number;
  // Infrastructure
  infraPerCustomer: number;
  infraBase: number;
  // Sales & Marketing
  smBudget: number;
  smGrowthPct: number;
  // G&A Overhead
  gaFixed: number;
  // Runway
  startingCash: number;
}

interface MonthData {
  month: number;
  label: string;
  // Revenue
  revenue: number;
  mrr: number;
  implRevenue: number;
  // Costs — broken out
  costOnboarding: number;
  costPeople: number;
  costInfra: number;
  costSM: number;
  costGA: number;
  costCAC: number;
  totalCost: number;
  // Derived
  netCashFlow: number;
  cumulativeCash: number;
  ebitda: number;
  ebitdaMargin: number;
  activeSubscribers: number;
  totalHeadcount: number;
  runway: number; // months remaining from this month
  burnRate: number; // avg monthly spend last 3 months (negative = spending)
}

// ─── Math Engine ──────────────────────────────────────────────────────────────

function runModel(p: Params): MonthData[] {
  const monthlyChurn = p.churnAnnual / 100 / 12;
  const results: MonthData[] = [];
  const pipeline: { remaining: number; count: number }[] = [];
  let activeSubscribers = 0;
  let cumulativeCash = p.startingCash;

  for (let m = 1; m <= 36; m++) {
    // ── Onboarding pipeline ──
    pipeline.push({ remaining: p.onb, count: p.sigs });
    const newlyActive = pipeline
      .filter((b) => b.remaining === 1)
      .reduce((s, b) => s + b.count, 0);
    pipeline.forEach((b) => b.remaining--);
    const alive = pipeline.filter((b) => b.remaining > 0);
    pipeline.length = 0;
    pipeline.push(...alive);

    // ── Subscribers ──
    activeSubscribers = Math.max(0, activeSubscribers * (1 - monthlyChurn));
    activeSubscribers += newlyActive;
    const inOnboarding = pipeline.reduce((s, b) => s + b.count, 0);
    const totalClients = activeSubscribers + inOnboarding;

    // ── Revenue ──
    const implRevenue = p.sigs * p.impl;
    const mrr = activeSubscribers * p.price;
    const revenue = implRevenue + mrr;

    // ── Costs ──
    // 1. Onboarding staff (dedicated, scales with pipeline)
    const onboardingStaff = Math.ceil(inOnboarding / p.cap);
    const costOnboarding = onboardingStaff * 6000;

    // 2. People — seed headcount + auto-scale 1 employee per N customers
    const scaledStaff = Math.ceil(totalClients / p.employeesPerCustomer);
    const totalStaff = p.seedHeadcount + scaledStaff + onboardingStaff;
    const costPeople =
      p.seedHeadcount * p.avgSalary * (1 + p.benefitsPct / 100) +
      scaledStaff * p.avgSalary * (1 + p.benefitsPct / 100);

    // 3. Infrastructure — base + per-customer
    const costInfra = p.infraBase + totalClients * p.infraPerCustomer;

    // 4. Sales & Marketing — grows by smGrowthPct% per month
    const costSM = p.smBudget * Math.pow(1 + p.smGrowthPct / 100, m - 1);

    // 5. G&A overhead (fixed)
    const costGA = p.gaFixed;

    // 6. CAC spend
    const costCAC = p.sigs * p.cac;

    const totalCost =
      costOnboarding + costPeople + costInfra + costSM + costGA + costCAC;

    const netCashFlow = revenue - totalCost;
    cumulativeCash += netCashFlow;

    const ebitda = revenue - totalCost;
    const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : -100;

    // Burn rate = avg monthly net over last 3 months (negative = burning)
    const burnRate =
      results.length >= 2
        ? (netCashFlow +
            results[results.length - 1].netCashFlow +
            results[results.length - 2].netCashFlow) /
          3
        : netCashFlow;

    // Runway = how many months until cash runs out at current burn
    const runway =
      burnRate >= 0
        ? 999 // profitable — infinite runway
        : Math.max(0, Math.floor(cumulativeCash / Math.abs(burnRate)));

    results.push({
      month: m,
      label: `M${m}`,
      revenue: Math.round(revenue),
      mrr: Math.round(mrr),
      implRevenue: Math.round(implRevenue),
      costOnboarding: Math.round(costOnboarding),
      costPeople: Math.round(costPeople),
      costInfra: Math.round(costInfra),
      costSM: Math.round(costSM),
      costGA: Math.round(costGA),
      costCAC: Math.round(costCAC),
      totalCost: Math.round(totalCost),
      netCashFlow: Math.round(netCashFlow),
      cumulativeCash: Math.round(cumulativeCash),
      ebitda: Math.round(ebitda),
      ebitdaMargin: Math.round(ebitdaMargin * 10) / 10,
      activeSubscribers: Math.round(activeSubscribers),
      totalHeadcount: Math.round(totalStaff),
      runway,
      burnRate: Math.round(burnRate),
    });
  }
  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}
const fmtY = (v: number) => fmtCurrency(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ─── Slider ───────────────────────────────────────────────────────────────────

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
  color = "sky",
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (v: number) => void;
  color?: string;
}) {
  const thumbColor: Record<string, string> = {
    sky: "#38bdf8",
    emerald: "#34d399",
    amber: "#fbbf24",
    rose: "#fb7185",
    violet: "#a78bfa",
  };
  const c = thumbColor[color] ?? "#38bdf8";
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-400 leading-tight pr-2">{label}</span>
        <span className="text-[11px] font-medium text-slate-100 tabular-nums shrink-0">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: c }}
        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-slate-700"
      />
    </div>
  );
}

function SidebarCard({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  const borderMap: Record<string, string> = {
    sky: "border-sky-500/30",
    emerald: "border-emerald-500/30",
    amber: "border-amber-500/30",
    rose: "border-rose-500/30",
    violet: "border-violet-500/30",
    slate: "border-slate-600/30",
  };
  const iconMap: Record<string, string> = {
    sky: "text-sky-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    violet: "text-violet-400",
    slate: "text-slate-400",
  };
  return (
    <div
      className={`bg-slate-800/50 border rounded-xl p-3.5 ${borderMap[color] ?? "border-slate-700/40"}`}
    >
      <div className={`flex items-center gap-1.5 mb-3 ${iconMap[color] ?? "text-slate-400"}`}>
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type AccentColor = "green" | "red" | "sky" | "amber" | "violet" | "default";

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent = "default",
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: AccentColor;
  badge?: { text: string; color: "green" | "red" | "amber" };
}) {
  const border: Record<AccentColor, string> = {
    green: "border-l-2 border-l-emerald-500",
    red: "border-l-2 border-l-red-500",
    sky: "border-l-2 border-l-sky-500",
    amber: "border-l-2 border-l-amber-400",
    violet: "border-l-2 border-l-violet-500",
    default: "border-l-2 border-l-slate-700",
  };
  const valColor: Record<AccentColor, string> = {
    green: "text-emerald-400",
    red: "text-red-400",
    sky: "text-sky-300",
    amber: "text-amber-400",
    violet: "text-violet-400",
    default: "text-slate-100",
  };
  const badgeStyles = {
    green: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
    red: "bg-red-500/10 text-red-400 border border-red-500/25",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  };
  return (
    <div
      className={`bg-slate-800/60 border border-slate-700/40 rounded-xl p-3.5 ${border[accent]}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5 text-slate-500">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div
        className={`text-xl font-semibold leading-tight ${valColor[accent]} flex items-baseline gap-2 flex-wrap`}
      >
        {value}
        {badge && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeStyles[badge.color]}`}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-500 mt-1 leading-snug">{sub}</p>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TEntry {
  name: string;
  value: number;
  color: string;
}
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2.5 text-xs shadow-2xl max-w-[220px]">
      <p className="text-slate-400 font-medium mb-2">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: e.color }} />
            <span className="text-slate-300 truncate">{e.name}</span>
          </span>
          <span className={`font-semibold tabular-nums ${e.value < 0 ? "text-red-400" : "text-slate-100"}`}>
            {typeof e.value === "number" && Math.abs(e.value) > 10
              ? fmtCurrency(e.value)
              : `${e.value}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        active
          ? "bg-slate-700 text-slate-100"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT: Params = {
  price: 3000,
  impl: 5000,
  onb: 3,
  cap: 4,
  cac: 6000,
  churnAnnual: 15,
  sigs: 10,
  avgSalary: 8500,
  benefitsPct: 25,
  seedHeadcount: 20,
  employeesPerCustomer: 15,
  infraBase: 4000,
  infraPerCustomer: 120,
  smBudget: 15000,
  smGrowthPct: 3,
  gaFixed: 18000,
  startingCash: 500000,
};

type ChartView = "cashflow" | "costs" | "ebitda";

export default function SimulatorPage() {
  const [p, setP] = useState<Params>(DEFAULT);
  const [chartView, setChartView] = useState<ChartView>("cashflow");
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (val: number) =>
        setP((prev) => ({ ...prev, [key]: val })),
    []
  );

  const data = useMemo(() => runModel(p), [p]);
  const last = data[35];

  // ── Profitability KPIs ──
  const peakDeficit = Math.min(...data.map((d) => d.cumulativeCash));
  const breakEvenMonth = data.find((d) => d.cumulativeCash >= 0 && d.month > 1)?.month;
  const firstProfitableMonth = data.find((d) => d.netCashFlow >= 0)?.month;
  const currentRunway = data[data.length - 1].runway;
  const currentBurn = data[data.length - 1].burnRate;
  const monthlyChurnRate = p.churnAnnual > 0 ? p.churnAnnual / 100 / 12 : 0.0001;
  const ltv = p.price / monthlyChurnRate;
  const ltvCac = ltv / p.cac;
  const ltvHealthy = ltvCac >= 3;
  const ebitdaM36 = last.ebitdaMargin;
  const gmM36 =
    last.revenue > 0
      ? ((last.revenue - last.costPeople - last.costOnboarding - last.costInfra) /
          last.revenue) *
        100
      : 0;

  // ── Cost breakdown at M36 ──
  const costBreakdown = [
    { name: "People", value: last.costPeople, color: "#a78bfa" },
    { name: "Sales & Mktg", value: last.costSM, color: "#fb7185" },
    { name: "G&A", value: last.costGA, color: "#fbbf24" },
    { name: "Onboarding Staff", value: last.costOnboarding, color: "#38bdf8" },
    { name: "Infrastructure", value: last.costInfra, color: "#34d399" },
    { name: "CAC Spend", value: last.costCAC, color: "#f97316" },
  ];
  const totalCostM36 = costBreakdown.reduce((s, c) => s + c.value, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="border-b border-slate-800/80 px-5 py-3.5 sticky top-0 z-20 bg-slate-950/90 backdrop-blur">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 tracking-tight">
              B2B SaaS · Full FinOps &amp; OpEx Simulator
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">
              36-month P&amp;L · real-time stress-test across all cost drivers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live model
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-500 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Users size={10} />
              {last.totalHeadcount} headcount at M36
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-5 py-5">
        <div className="flex flex-col xl:flex-row gap-5">

          {/* ══════ SIDEBAR ══════ */}
          <aside className="w-full xl:w-[290px] shrink-0 flex flex-col gap-3">

            <SidebarCard title="Commercial" icon={<DollarSign size={12} />} color="sky">
              <SliderRow label="Monthly subscription price" min={500} max={10000} step={100}
                value={p.price} display={`$${p.price.toLocaleString()}`} onChange={set("price")} color="sky" />
              <SliderRow label="Upfront implementation fee" min={0} max={25000} step={500}
                value={p.impl} display={`$${p.impl.toLocaleString()}`} onChange={set("impl")} color="sky" />
              <SliderRow label="New signups / month" min={1} max={50} step={1}
                value={p.sigs} display={`${p.sigs}`} onChange={set("sigs")} color="sky" />
              <SliderRow label="Annual churn rate" min={0} max={50} step={1}
                value={p.churnAnnual} display={`${p.churnAnnual}%`} onChange={set("churnAnnual")} color="sky" />
            </SidebarCard>

            <SidebarCard title="Operational Drag" icon={<Clock size={12} />} color="amber">
              <SliderRow label="Onboarding duration (months)" min={1} max={12} step={1}
                value={p.onb} display={`${p.onb} mo`} onChange={set("onb")} color="amber" />
              <SliderRow label="Max clients per onboarding employee" min={1} max={10} step={1}
                value={p.cap} display={`${p.cap}`} onChange={set("cap")} color="amber" />
              <SliderRow label="Monthly CAC" min={1000} max={20000} step={500}
                value={p.cac} display={`$${p.cac.toLocaleString()}`} onChange={set("cac")} color="amber" />
            </SidebarCard>

            <SidebarCard title="People Costs" icon={<Users size={12} />} color="violet">
              <SliderRow label="Avg monthly salary per employee" min={3000} max={25000} step={500}
                value={p.avgSalary} display={`$${p.avgSalary.toLocaleString()}`} onChange={set("avgSalary")} color="violet" />
              <SliderRow label="Benefits & employer taxes %" min={10} max={45} step={1}
                value={p.benefitsPct} display={`${p.benefitsPct}%`} onChange={set("benefitsPct")} color="violet" />
              <SliderRow label="Seed team headcount (fixed)" min={1} max={50} step={1}
                value={p.seedHeadcount} display={`${p.seedHeadcount} ppl`} onChange={set("seedHeadcount")} color="violet" />
              <SliderRow label="Customers per additional employee" min={2} max={50} step={1}
                value={p.employeesPerCustomer} display={`${p.employeesPerCustomer}`} onChange={set("employeesPerCustomer")} color="violet" />
            </SidebarCard>

            <SidebarCard title="Infrastructure & Cloud" icon={<Server size={12} />} color="emerald">
              <SliderRow label="Base infrastructure cost / mo" min={500} max={50000} step={500}
                value={p.infraBase} display={`$${p.infraBase.toLocaleString()}`} onChange={set("infraBase")} color="emerald" />
              <SliderRow label="Per-customer infra cost / mo" min={10} max={500} step={10}
                value={p.infraPerCustomer} display={`$${p.infraPerCustomer}`} onChange={set("infraPerCustomer")} color="emerald" />
            </SidebarCard>

            <SidebarCard title="Sales & Marketing" icon={<Megaphone size={12} />} color="rose">
              <SliderRow label="Monthly S&M budget (month 1)" min={1000} max={100000} step={1000}
                value={p.smBudget} display={`$${p.smBudget.toLocaleString()}`} onChange={set("smBudget")} color="rose" />
              <SliderRow label="Monthly S&M budget growth %" min={0} max={15} step={0.5}
                value={p.smGrowthPct} display={`${p.smGrowthPct}%`} onChange={set("smGrowthPct")} color="rose" />
            </SidebarCard>

            <SidebarCard title="G&A Overhead" icon={<Building2 size={12} />} color="slate">
              <SliderRow label="Fixed G&A / month (office, legal, finance)" min={2000} max={100000} step={1000}
                value={p.gaFixed} display={`$${p.gaFixed.toLocaleString()}`} onChange={set("gaFixed")} color="sky" />
              <SliderRow label="Starting cash / runway buffer" min={0} max={5000000} step={25000}
                value={p.startingCash} display={`$${(p.startingCash / 1000).toFixed(0)}K`} onChange={set("startingCash")} color="sky" />
            </SidebarCard>

          </aside>

          {/* ══════ MAIN DASHBOARD ══════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* ── Row 1: Profitability KPIs ── */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2 px-0.5">Profitability &amp; Runway</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <KpiCard
                  icon={<Flame size={12} />}
                  label="Monthly burn rate"
                  value={fmtCurrency(Math.abs(currentBurn))}
                  sub="3-month avg net cash flow (negative = burning)"
                  accent={currentBurn >= 0 ? "green" : "red"}
                  badge={currentBurn >= 0 ? { text: "Cash flow+", color: "green" } : undefined}
                />
                <KpiCard
                  icon={<Clock size={12} />}
                  label="Runway"
                  value={currentRunway >= 999 ? "∞" : `${currentRunway} mo`}
                  sub="Months until cash runs out at current burn"
                  accent={currentRunway >= 18 ? "green" : currentRunway >= 6 ? "amber" : "red"}
                  badge={
                    currentRunway < 6
                      ? { text: "Critical", color: "red" }
                      : currentRunway < 12
                      ? { text: "Low", color: "amber" }
                      : undefined
                  }
                />
                <KpiCard
                  icon={<Activity size={12} />}
                  label="Break-even month"
                  value={breakEvenMonth ? `Month ${breakEvenMonth}` : "Not reached"}
                  sub={`First profitable month: ${firstProfitableMonth ? `M${firstProfitableMonth}` : "N/A"}`}
                  accent={breakEvenMonth && breakEvenMonth <= 24 ? "green" : breakEvenMonth ? "amber" : "red"}
                />
                <KpiCard
                  icon={<BarChart2 size={12} />}
                  label="EBITDA margin · M36"
                  value={fmtPct(ebitdaM36)}
                  sub="Earnings before interest, tax, D&A at month 36"
                  accent={ebitdaM36 >= 20 ? "green" : ebitdaM36 >= 0 ? "amber" : "red"}
                />
              </div>
            </div>

            {/* ── Row 2: Commercial KPIs ── */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2 px-0.5">Commercial Health</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <KpiCard
                  icon={<TrendingDown size={12} />}
                  label="Peak cash deficit"
                  value={fmtCurrency(peakDeficit)}
                  sub="Valley of Death — lowest cumulative cash point"
                  accent={peakDeficit < 0 ? "red" : "green"}
                />
                <KpiCard
                  icon={<DollarSign size={12} />}
                  label="Year 3 MRR"
                  value={fmtCurrency(last.mrr)}
                  sub={`${last.activeSubscribers.toLocaleString()} active subscribers`}
                  accent="sky"
                />
                <KpiCard
                  icon={<PieChart size={12} />}
                  label="Gross margin · M36"
                  value={fmtPct(Math.max(0, Math.min(100, gmM36)))}
                  sub="Revenue minus direct delivery costs"
                  accent={gmM36 >= 60 ? "green" : gmM36 >= 40 ? "amber" : "red"}
                />
                <KpiCard
                  icon={<Scale size={12} />}
                  label="LTV : CAC"
                  value={`${ltvCac.toFixed(1)}×`}
                  sub="Target > 3× for healthy unit economics"
                  accent={ltvHealthy ? "green" : "red"}
                  badge={{ text: ltvHealthy ? "Healthy" : "At risk", color: ltvHealthy ? "green" : "red" }}
                />
              </div>
            </div>

            {/* ── Charts ── */}
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">36-Month Financial Model</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Hover any data point for detail · all figures in USD
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-900/60 rounded-lg p-1">
                  <Tab active={chartView === "cashflow"} onClick={() => setChartView("cashflow")}>
                    Cash flow
                  </Tab>
                  <Tab active={chartView === "costs"} onClick={() => setChartView("costs")}>
                    Cost stack
                  </Tab>
                  <Tab active={chartView === "ebitda"} onClick={() => setChartView("ebitda")}>
                    EBITDA %
                  </Tab>
                </div>
              </div>

              {/* ── Cash Flow Chart ── */}
              {chartView === "cashflow" && (
                <>
                  <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 mb-3">
                    {[
                      { color: "#38bdf8", label: "Cumulative cash", dash: false },
                      { color: "#34d399", label: "Monthly revenue", dash: true },
                      { color: "#a78bfa", label: "Total cost", dash: true },
                    ].map(({ color, label, dash }) => (
                      <span key={label} className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-4 h-0.5"
                          style={{
                            background: dash
                              ? `repeating-linear-gradient(90deg,${color} 0 4px,transparent 4px 7px)`
                              : color,
                          }}
                        />
                        {label}
                      </span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false}
                        axisLine={{ stroke: "#1e293b" }} interval={5} />
                      <YAxis tickFormatter={fmtY} tick={{ fill: "#475569", fontSize: 9 }}
                        tickLine={false} axisLine={false} width={58} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} />
                      <Area type="monotone" dataKey="cumulativeCash" name="Cumulative cash"
                        stroke="#38bdf8" strokeWidth={2} fill="url(#cashGrad)" dot={false}
                        activeDot={{ r: 4, fill: "#38bdf8", strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="revenue" name="Monthly revenue"
                        stroke="#34d399" strokeWidth={1.5} strokeDasharray="5 3" dot={false}
                        activeDot={{ r: 3, fill: "#34d399", strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="totalCost" name="Total cost"
                        stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 3" dot={false}
                        activeDot={{ r: 3, fill: "#a78bfa", strokeWidth: 0 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}

              {/* ── Stacked Cost Chart ── */}
              {chartView === "costs" && (
                <>
                  <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 mb-3">
                    {[
                      { color: "#a78bfa", label: "People" },
                      { color: "#fb7185", label: "Sales & Mktg" },
                      { color: "#fbbf24", label: "G&A" },
                      { color: "#38bdf8", label: "Onboarding staff" },
                      { color: "#34d399", label: "Infrastructure" },
                      { color: "#f97316", label: "CAC spend" },
                    ].map(({ color, label }) => (
                      <span key={label} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                        {label}
                      </span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                      barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false}
                        axisLine={{ stroke: "#1e293b" }} interval={5} />
                      <YAxis tickFormatter={fmtY} tick={{ fill: "#475569", fontSize: 9 }}
                        tickLine={false} axisLine={false} width={58} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="costPeople" name="People" stackId="a" fill="#a78bfa" radius={0} />
                      <Bar dataKey="costSM" name="Sales & Mktg" stackId="a" fill="#fb7185" radius={0} />
                      <Bar dataKey="costGA" name="G&A" stackId="a" fill="#fbbf24" radius={0} />
                      <Bar dataKey="costOnboarding" name="Onboarding staff" stackId="a" fill="#38bdf8" radius={0} />
                      <Bar dataKey="costInfra" name="Infrastructure" stackId="a" fill="#34d399" radius={0} />
                      <Bar dataKey="costCAC" name="CAC spend" stackId="a" fill="#f97316" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}

              {/* ── EBITDA % Chart ── */}
              {chartView === "ebitda" && (
                <>
                  <p className="text-[10px] text-slate-500 mb-3">
                    EBITDA margin % by month · green = profitable · red = loss-making
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false}
                        axisLine={{ stroke: "#1e293b" }} interval={5} />
                      <YAxis tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false}
                        width={40} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.6} />
                      <Bar
                        dataKey="ebitdaMargin"
                        name="EBITDA %"
                        radius={[2, 2, 0, 0]}
                        fill="#34d399"
                        // color each bar based on sign
                        label={false}
                      >
                        {data.map((entry) => (
                          <rect key={entry.month} fill={entry.ebitdaMargin >= 0 ? "#34d399" : "#f87171"} />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="ebitdaMargin" name="EBITDA %"
                        stroke="#34d399" strokeWidth={2} dot={false}
                        activeDot={{ r: 4, fill: "#34d399", strokeWidth: 0 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* ── Cost Breakdown at M36 ── */}
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Cost breakdown at month 36</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Total monthly OpEx: {fmtCurrency(totalCostM36)} · Revenue: {fmtCurrency(last.revenue)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {costBreakdown
                  .sort((a, b) => b.value - a.value)
                  .map(({ name, value, color }) => {
                    const pct = totalCostM36 > 0 ? (value / totalCostM36) * 100 : 0;
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                            {name}
                          </span>
                          <span className="text-xs font-medium text-slate-200 tabular-nums">
                            {fmtCurrency(value)}
                            <span className="text-slate-500 ml-1.5">{pct.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* ── Secondary stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "Total headcount · M36", value: `${last.totalHeadcount} ppl` },
                { label: "Active subscribers · M36", value: last.activeSubscribers.toLocaleString() },
                { label: "Net cash flow · M36", value: fmtCurrency(last.netCashFlow), red: last.netCashFlow < 0 },
                { label: "Cumulative cash · M36", value: fmtCurrency(last.cumulativeCash), red: last.cumulativeCash < 0 },
              ].map(({ label, value, red }) => (
                <div key={label} className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-3.5 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</p>
                  <p className={`text-base font-semibold tabular-nums ${red ? "text-red-400" : "text-slate-100"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Methodology ── */}
            <div className="border border-slate-700/40 rounded-xl overflow-hidden">
              <button
                onClick={() => setMethodologyOpen((v) => !v)}
                aria-expanded={methodologyOpen}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-800/40 hover:bg-slate-800/70 transition-colors text-left"
              >
                <span className="text-sm font-medium text-slate-300">
                  Strategic methodology &amp; model assumptions
                </span>
                <ChevronDown
                  size={15}
                  className={`text-slate-500 shrink-0 transition-transform duration-200 ${methodologyOpen ? "rotate-180" : ""}`}
                />
              </button>
              {methodologyOpen && (
                <div className="px-5 py-4 bg-slate-900/50 border-t border-slate-700/40 grid sm:grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    {
                      title: "People cost auto-scaling",
                      body: `The model adds 1 employee per every N customers (your slider) on top of the fixed seed team, each costing avgSalary × (1 + benefits%). This simulates organic hiring pressure as your customer base grows — a common growth-stage trap where people costs outpace revenue.`,
                    },
                    {
                      title: "Onboarding drag & the Valley of Death",
                      body: `New signups enter a pipeline queue and only begin paying subscription after the onboarding duration. During this time they consume onboarding staff at $6K/mo each but generate zero MRR. Reducing onboarding duration is structurally equivalent to a price increase — it compresses the deficit window.`,
                    },
                    {
                      title: "S&M compound growth",
                      body: `Your S&M budget grows by the monthly growth % you set — modelling the reality that high-growth SaaS companies reinvest an accelerating share of revenue into pipeline generation. Watch how this interacts with churn: high S&M + high churn = a leaky bucket that destroys unit economics.`,
                    },
                    {
                      title: "Runway & burn rate calculation",
                      body: `Runway is calculated from the M36 cumulative cash balance divided by the trailing 3-month average burn rate. Break-even is the first month cumulative cash turns positive. These metrics update live as you adjust levers — the goal is to find the configuration where you reach break-even before runway expires.`,
                    },
                  ].map(({ title, body }) => (
                    <div key={title}>
                      <h3 className="text-xs font-semibold text-slate-300 mb-1">{title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
