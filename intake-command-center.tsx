"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Inbox,
  LayoutDashboard,
  Layers,
  AlertTriangle,
  Timer,
  TrendingUp,
  Workflow,
  Heart,
  Server,
  Send,
  Play,
  Flag,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  X,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Hourglass,
  Activity,
  AlertOctagon,
  Crosshair,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   Cross-Functional Intake & Strategic Alignment Dashboard
   ───────────────────────────────────────────────────────────────────────────
   A single-file React component for a Chief of Staff:

   1. INTAKE PORTAL  — cross-departmental teams file new dependency/request
      intake forms straight into the shared backlog (status: Pending Triage).
   2. COMMAND CENTER — executive triage board. KPI summary cards + a
      drag-and-drop Kanban board / filterable data table with status
      quick-actions, all backed by one shared React state.

   Design: enterprise dark · slate base · indigo brand · full Tailwind CSS.
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Domain types ────────────────────────────────────────────────────────────

type Department =
  | "Sales"
  | "Product"
  | "Marketing"
  | "Operations"
  | "Customer Success";

type Pillar =
  | "Revenue Acceleration"
  | "Operational Efficiency"
  | "Customer Retention"
  | "Tech Infrastructure";

type Urgency = "Low" | "Medium" | "High" | "Critical";

type Status = "pending-triage" | "in-progress" | "blocked" | "completed";

interface AppRequest {
  id: string;
  title: string;
  description: string;
  from: Department;
  to: Department;
  pillar: Pillar;
  urgency: Urgency;
  status: Status;
  createdAt: number; // epoch ms
  completedAt: number | null;
  blockedAt: number | null;
}

type ToastTone = "success" | "danger" | "info";

// ─── Static vocab ────────────────────────────────────────────────────────────

const DEPARTMENTS: Department[] = [
  "Sales",
  "Product",
  "Marketing",
  "Operations",
  "Customer Success",
];

const PILLARS: Pillar[] = [
  "Revenue Acceleration",
  "Operational Efficiency",
  "Customer Retention",
  "Tech Infrastructure",
];

const URGENCIES: Urgency[] = ["Low", "Medium", "High", "Critical"];

const STATUS_ORDER: Status[] = [
  "pending-triage",
  "in-progress",
  "blocked",
  "completed",
];

/* Color / icon metadata lives in full class strings (not concatenated) so the
   Tailwind JIT / Play CDN can statically resolve every utility. */
const STATUS_META: Record<
  Status,
  {
    label: string;
    icon: LucideIcon;
    dot: string;
    chip: string; // pill used in the table / card footer
    col: string; // accent used on the kanban column
  }
> = {
  "pending-triage": {
    label: "Pending Triage",
    icon: Hourglass,
    dot: "bg-amber-400",
    chip: "bg-amber-400/10 text-amber-300 border border-amber-400/30",
    col: "border-t-amber-400/60",
  },
  "in-progress": {
    label: "In Progress",
    icon: Activity,
    dot: "bg-sky-400",
    chip: "bg-sky-400/10 text-sky-300 border border-sky-400/30",
    col: "border-t-sky-400/60",
  },
  blocked: {
    label: "Blocked",
    icon: AlertOctagon,
    dot: "bg-rose-400",
    chip: "bg-rose-400/10 text-rose-300 border border-rose-400/30",
    col: "border-t-rose-400/70",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    dot: "bg-emerald-400",
    chip: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30",
    col: "border-t-emerald-400/60",
  },
};

const PILLAR_META: Record<
  Pillar,
  { icon: LucideIcon; chip: string; bar: string; blurb: string }
> = {
  "Revenue Acceleration": {
    icon: TrendingUp,
    chip: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/25",
    bar: "from-emerald-500 to-emerald-300",
    blurb: "Grow pipeline, win rates, pricing power and quota attainment.",
  },
  "Operational Efficiency": {
    icon: Workflow,
    chip: "bg-sky-400/10 text-sky-300 border border-sky-400/25",
    bar: "from-sky-500 to-sky-300",
    blurb: "Remove drag: deal desk, handoffs, data pipelines, cycle time.",
  },
  "Customer Retention": {
    icon: Heart,
    chip: "bg-violet-400/10 text-violet-300 border border-violet-400/25",
    bar: "from-violet-500 to-violet-300",
    blurb: "Protect renewal risk, health scores and expansion revenue.",
  },
  "Tech Infrastructure": {
    icon: Server,
    chip: "bg-indigo-400/10 text-indigo-300 border border-indigo-400/25",
    bar: "from-indigo-500 to-indigo-300",
    blurb: "Platform, security, integrations and the tools our teams run on.",
  },
};

const URGENCY_META: Record<Urgency, { dot: string; chip: string }> = {
  Low: {
    dot: "bg-slate-400",
    chip: "bg-slate-400/10 text-slate-300 border border-slate-400/20",
  },
  Medium: {
    dot: "bg-sky-400",
    chip: "bg-sky-400/10 text-sky-300 border border-sky-400/25",
  },
  High: {
    dot: "bg-amber-400",
    chip: "bg-amber-400/10 text-amber-300 border border-amber-400/25",
  },
  Critical: {
    dot: "bg-rose-500",
    chip: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
  },
};

// ─── Seed data (keeps the dashboard populated on load) ───────────────────────

const DAY = 86_400_000;
const daysAgo = (n: number) => Date.now() - n * DAY;

const SEED_REQUESTS: AppRequest[] = [
  {
    id: "REQ-0001",
    title: "Migrate enterprise pricing to the new CPQ engine",
    description:
      "Sales is holding $1.8M of negotiated deals in spreadsheets because the current quoting tool can't express our tiered license + services bundles. CPQ is time-boxed to ship by quarter end — we need Product to prioritize the migration sprint so we stop leaking margin in the field.",
    from: "Sales",
    to: "Product",
    pillar: "Revenue Acceleration",
    urgency: "Critical",
    status: "blocked",
    createdAt: daysAgo(6),
    completedAt: null,
    blockedAt: daysAgo(2),
  },
  {
    id: "REQ-0002",
    title: "SOC 2 evidence collection freeze",
    description:
      "Renewal audit is in flight and two customer requests for our SOC 2 / ISO 27001 evidence pack are blocked on a missing access-policy export. Ops needs Engineering to stand up the export job and refresh the artifacts before the 14-day window closes.",
    from: "Operations",
    to: "Product",
    pillar: "Tech Infrastructure",
    urgency: "Critical",
    status: "blocked",
    createdAt: daysAgo(7),
    completedAt: null,
    blockedAt: daysAgo(3),
  },
  {
    id: "REQ-0003",
    title: "Zero-touch onboarding flow for sub-50-seat accounts",
    description:
      "Customer Success triages every small account by hand today. Ship guided setup + a live health dashboard for smaller seats so CSMs can spend cycles on expansion instead of hand-holding — projected 12% churn reduction in the SMB cohort.",
    from: "Customer Success",
    to: "Product",
    pillar: "Customer Retention",
    urgency: "High",
    status: "in-progress",
    createdAt: daysAgo(5),
    completedAt: null,
    blockedAt: null,
  },
  {
    id: "REQ-0004",
    title: "Unified customer health-score API for renewal risk",
    description:
      "Two competing health-score implementations live in Salesforce and the product analytics stack. Consolidate on one API surfaced to both so renewal risk is visible before it becomes a customer call. Ops will own the data mapping if Product provides the endpoint.",
    from: "Operations",
    to: "Product",
    pillar: "Customer Retention",
    urgency: "High",
    status: "in-progress",
    createdAt: daysAgo(4),
    completedAt: null,
    blockedAt: null,
  },
  {
    id: "REQ-0005",
    title: "Q3 win-rate data pipeline into marketing signal feeds",
    description:
      "Weekly pipeline review found Marketing campaigns are optimizing on outdated win-rate data. Wire the deals won/lost feed into the marketing analytics stack so spend follows evidence, not intuition.",
    from: "Sales",
    to: "Marketing",
    pillar: "Revenue Acceleration",
    urgency: "Medium",
    status: "pending-triage",
    createdAt: daysAgo(2),
    completedAt: null,
    blockedAt: null,
  },
  {
    id: "REQ-0006",
    title: "Renewal calendar sync into CS daily workflows",
    description:
      "Account managers are missing renewal touchpoints because renewal dates live outside their working calendar. Build the two-way sync so every renewal shows up with a pre-built task sequence.",
    from: "Operations",
    to: "Customer Success",
    pillar: "Operational Efficiency",
    urgency: "High",
    status: "pending-triage",
    createdAt: daysAgo(3),
    completedAt: null,
    blockedAt: null,
  },
  {
    id: "REQ-0007",
    title: "Self-serve contract addendum generator for standard terms",
    description:
      "Legal and Sales burn cycles on routine addenda. A guided generator for standard terms would cut turnaround from 4 days to under 1, and let Sales close standard deals without waiting on legal review.",
    from: "Product",
    to: "Operations",
    pillar: "Operational Efficiency",
    urgency: "Low",
    status: "pending-triage",
    createdAt: daysAgo(1),
    completedAt: null,
    blockedAt: null,
  },
  {
    id: "REQ-0008",
    title: "SSO + role-based access for the customer portal",
    description:
      "Enterprise buyers require SSO before go-live. Complete RBAC and SSO rollout unblocking the final cohort of named accounts to migrate this quarter.",
    from: "Marketing",
    to: "Product",
    pillar: "Tech Infrastructure",
    urgency: "Critical",
    status: "completed",
    createdAt: daysAgo(9.2),
    completedAt: daysAgo(5.0),
    blockedAt: null,
  },
  {
    id: "REQ-0009",
    title: "Deal desk turnaround time audit",
    description:
      "Quoted vs. actual turnaround audit for all deals over $250k. Found the median 5.3-day lag; proposed a same-day SLA for standard quotes and an SLA guardrail for exceptions.",
    from: "Operations",
    to: "Sales",
    pillar: "Operational Efficiency",
    urgency: "Medium",
    status: "completed",
    createdAt: daysAgo(7.6),
    completedAt: daysAgo(2.6),
    blockedAt: null,
  },
  {
    id: "REQ-0010",
    title: "Field quoting margin guardrails rollout",
    description:
      "Shipped floor-price guardrails in the quoting tool so reps can't quote below approved margin without escalation — protecting ~4pts of ACV margin on discounted deals.",
    from: "Sales",
    to: "Operations",
    pillar: "Revenue Acceleration",
    urgency: "High",
    status: "completed",
    createdAt: daysAgo(6.3),
    completedAt: daysAgo(3.2),
    blockedAt: null,
  },
  {
    id: "REQ-0011",
    title: "Churn-driver segmentation cohort study",
    description:
      "Delivered a segmented churn study across 8 cohorts to target the top-3 cancellation drivers for the renewal playbook — now feeding the CS nudges roadmap.",
    from: "Customer Success",
    to: "Marketing",
    pillar: "Customer Retention",
    urgency: "Medium",
    status: "completed",
    createdAt: daysAgo(8.0),
    completedAt: daysAgo(3.5),
    blockedAt: null,
  },
];

// ─── Small formatting helpers ─────────────────────────────────────────────────

const timeAgo = (ts: number): string => {
  const d = Math.floor((Date.now() - ts) / DAY);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
};

const dayFmt = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// ─── Reusable pill / button components ───────────────────────────────────────

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 ${className}`}
    >
      {children}
    </span>
  );
}

const BTN_TONES = {
  ghost:
    "border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-500 hover:bg-slate-800/70",
  primary:
    "border-indigo-400/40 text-indigo-300 hover:bg-indigo-500/15 hover:border-indigo-300/60",
  success:
    "border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-300/60",
  danger:
    "border-rose-400/40 text-rose-300 hover:bg-rose-500/10 hover:border-rose-300/60",
} as const;

function ActionButton({
  onClick,
  title,
  tone = "ghost",
  children,
}: {
  onClick: () => void;
  title: string;
  tone?: keyof typeof BTN_TONES;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${BTN_TONES[tone]}`}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function IntakeCommandCenter() {
  /* ── Shared state ─────────────────────────────────────────────── */
  const [requests, setRequests] = useState<AppRequest[]>(SEED_REQUESTS);
  const [view, setView] = useState<"intake" | "command">(
    typeof window !== "undefined" && window.location.hash === "#command"
      ? "command"
      : "intake"
  );

  /* ── Intake form state ────────────────────────────────────────── */
  const [form, setForm] = useState({
    title: "",
    from: "Marketing" as Department,
    to: "Product" as Department,
    pillar: "Revenue Acceleration" as Pillar,
    urgency: "Medium" as Urgency,
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Command-center state ─────────────────────────────────────── */
  const [boardMode, setBoardMode] = useState<"board" | "table">("board");
  const [fStatus, setFStatus] = useState<"all" | Status>("all");
  const [fPillar, setFPillar] = useState<"all" | Pillar>("all");
  const [fUrgency, setFUrgency] = useState<"all" | Urgency>("all");
  const [fFrom, setFFrom] = useState<"all" | Department>("all");
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<number | null>(null);

  /* ── Toast ────────────────────────────────────────────────────── */
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const notify = (msg: string, tone: ToastTone = "success") =>
    setToast({ msg, tone });

  /* ── Derived metrics ──────────────────────────────────────────── */
  const counts = useMemo(() => {
    const by: Record<Status, number> = {
      "pending-triage": 0,
      "in-progress": 0,
      blocked: 0,
      completed: 0,
    };
    requests.forEach((r) => {
      by[r.status] += 1;
    });
    return by;
  }, [requests]);

  const activeRequests = requests.filter((r) => r.status !== "completed");
  const blockers = requests.filter((r) => r.status === "blocked");
  const criticalBlockers = blockers.filter(
    (r) => r.urgency === "Critical" || r.urgency === "High"
  ).length;

  const done = requests.filter(
    (r) => r.status === "completed" && r.completedAt && r.createdAt
  );
  const avgResolutionDays = done.length
    ? done.reduce(
        (sum, r) => sum + ((r.completedAt as number) - r.createdAt) / DAY,
        0
      ) / done.length
    : 0;

  /* ── Filtering (shared by board + table) ──────────────────────── */
  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (fStatus !== "all" && r.status !== fStatus) return false;
        if (fPillar !== "all" && r.pillar !== fPillar) return false;
        if (fUrgency !== "all" && r.urgency !== fUrgency) return false;
        if (fFrom !== "all" && r.from !== fFrom) return false;
        if (query.trim()) {
          const hay = `${r.title} ${r.description} ${r.from} ${r.to} ${r.pillar}`.toLowerCase();
          if (!hay.includes(query.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [requests, fStatus, fPillar, fUrgency, fFrom, query]
  );

  // Per-pillar active counts for the intake side rail.
  const pillarLoad = useMemo(
    () =>
      PILLARS.map((p) => ({
        pillar: p,
        count: activeRequests.filter((r) => r.pillar === p).length,
      })),
    [activeRequests]
  );

  /* ── Mutations ────────────────────────────────────────────────── */
  const moveRequest = (id: string, status: Status) => {
    const now = Date.now();
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          status,
          completedAt: status === "completed" ? now : null,
          blockedAt: status === "blocked" ? (r.blockedAt ?? now) : null,
        };
      })
    );
    const req = requests.find((r) => r.id === id);
    if (req) {
      notify(`${req.title.slice(0, 44)}${req.title.length > 44 ? "…" : ""} → ${STATUS_META[status].label}`, "info");
    }
  };

  const deleteRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setConfirmId(null);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    notify("Request removed from the backlog.", "danger");
  };

  const requestDelete = (id: string) => {
    // Two-step delete: first click arms it, second click confirms (3s window).
    if (confirmId === id) {
      deleteRequest(id);
    } else {
      setConfirmId(id);
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirmId(null), 3000);
    }
  };

  /* ── Form handling ────────────────────────────────────────────── */
  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submitRequest = () => {
    if (!form.title.trim()) {
      setFormError("Give the request a short, descriptive title.");
      return;
    }
    if (!form.description.trim()) {
      setFormError("Add a few lines of detail so triage can act — context matters.");
      return;
    }
    const nextId = `REQ-${String(requests.length + 1).padStart(4, "0")}`;
    const req: AppRequest = {
      id: nextId,
      title: form.title.trim(),
      description: form.description.trim(),
      from: form.from,
      to: form.to,
      pillar: form.pillar,
      urgency: form.urgency,
      status: "pending-triage",
      createdAt: Date.now(),
      completedAt: null,
      blockedAt: null,
    };
    setRequests((prev) => [req, ...prev]);
    setForm({
      title: "",
      from: "Marketing",
      to: "Product",
      pillar: "Revenue Acceleration",
      urgency: "Medium",
      description: "",
    });
    setFormError(null);
    notify(`${req.id} submitted · now awaiting triage.`, "success");
  };

  const statusChip = (status: Status) => {
    const m = STATUS_META[status];
    return (
      <Pill className={m.chip}>
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
        {m.label}
      </Pill>
    );
  };

  const urgencyChip = (u: Urgency) => (
    <Pill className={URGENCY_META[u].chip}>
      <span className={`h-1.5 w-1.5 rounded-full ${URGENCY_META[u].dot} ${u === "Critical" ? "animate-pulse" : ""}`} />
      {u}
    </Pill>
  );

  const pillarChip = (p: Pillar) => {
    const m = PILLAR_META[p];
    const I = m.icon;
    return (
      <Pill className={m.chip}>
        <I size={10} />
        {p}
      </Pill>
    );
  };

  /* ── Request card (used by the Kanban board) ──────────────────── */
  const renderCard = (r: AppRequest) => {
    const isBlocked = r.status === "blocked";
    return (
      <div
        key={r.id}
        draggable
        onDragStart={() => setDragId(r.id)}
        onDragEnd={() => setDragId(null)}
        className={`group cursor-grab rounded-lg border bg-slate-900/80 p-3 transition-all active:cursor-grabbing ${
          isBlocked
            ? "border-rose-500/30 shadow-[0_0_0_1px_rgba(244,63,94,0.06)]"
            : "border-slate-700/50 hover:border-slate-600"
        } ${dragId === r.id ? "opacity-40" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold leading-snug text-slate-100">
            {r.title}
          </p>
          {isBlocked && (
            <AlertOctagon size={14} className="mt-0.5 shrink-0 text-rose-400" />
          )}
        </div>

        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
          <span className="font-medium text-slate-400">{r.from}</span>
          <ArrowRight size={10} className="text-slate-600" />
          <span className="font-medium text-slate-400">{r.to}</span>
        </p>

        <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500">
          {r.description}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {pillarChip(r.pillar)}
          {urgencyChip(r.urgency)}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2">
          <span className="text-[10px] text-slate-600">{timeAgo(r.createdAt)}</span>

          {/* ── Status quick-actions per lifecycle stage ── */}
          <div className="flex items-center gap-1">
            {r.status === "pending-triage" && (
              <ActionButton tone="primary" title="Start triage → In Progress" onClick={() => moveRequest(r.id, "in-progress")}>
                <Play size={11} /> Start
              </ActionButton>
            )}
            {r.status === "in-progress" && (
              <>
                <ActionButton tone="danger" title="Flag as Blocked" onClick={() => moveRequest(r.id, "blocked")}>
                  <Flag size={11} /> Block
                </ActionButton>
                <ActionButton tone="success" title="Mark Complete" onClick={() => moveRequest(r.id, "completed")}>
                  <CheckCircle2 size={11} /> Complete
                </ActionButton>
              </>
            )}
            {r.status === "blocked" && (
              <ActionButton tone="primary" title="Unblock → In Progress" onClick={() => moveRequest(r.id, "in-progress")}>
                <RotateCcw size={11} /> Unblock
              </ActionButton>
            )}
            {r.status === "completed" && (
              <ActionButton title="Reopen → In Progress" onClick={() => moveRequest(r.id, "in-progress")}>
                <RotateCcw size={11} /> Reopen
              </ActionButton>
            )}
            <ActionButton
              title="Delete request"
              tone={confirmId === r.id ? "danger" : "ghost"}
              onClick={() => requestDelete(r.id)}
            >
              <Trash2 size={11} />
              {confirmId === r.id ? "Sure?" : ""}
            </ActionButton>
          </div>
        </div>
      </div>
    );
  };

  /* ── Reusable field chrome for the intake form ────────────────── */
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500";
  const fieldCls =
    "w-full rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-[13px] text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/20";

  const selectChev = (
    <ChevronDown
      size={14}
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
    />
  );

  /* ── Kanban board ─────────────────────────────────────────────── */
  const board = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.filter((s) => fStatus === "all" || s === fStatus).map((status) => {
        const meta = STATUS_META[status];
        const Icon = meta.icon;
        const cards = filtered.filter((r) => r.status === status);
        return (
          <section
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragId && moveRequest(dragId, status)}
            className={`rounded-xl border border-slate-800 bg-slate-900/30 border-t-2 ${meta.col}`}
          >
            <header className="flex items-center gap-2 px-3 py-2.5">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              <Icon size={13} className="text-slate-500" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {meta.label}
              </h3>
              <span className="ml-auto rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-400">
                {cards.length}
              </span>
            </header>

            <div className="flex min-h-[160px] flex-col gap-2 p-2.5 pt-1">
              {cards.length ? (
                cards.map(renderCard)
              ) : (
                <div className="rounded-lg border border-dashed border-slate-800 py-8 text-center text-[11px] text-slate-600">
                  {fStatus === "all" ? "No requests here" : "Nothing matches the filter"}
                </div>
              )}
            </div>

            <footer className="px-3 pb-2 text-[10px] text-slate-600">
              {status === "blocked" && cards.length > 0
                ? "Blocked items surface in the daily digest."
                : "Drop a card here to change status"}
            </footer>
          </section>
        );
      })}
    </div>
  );

  /* ── Filterable data table ────────────────────────────────────── */
  const statusSelect = (r: AppRequest) => (
    <select
      value={r.status}
      onChange={(e) => moveRequest(r.id, e.target.value as Status)}
      className={`rounded-md border bg-slate-900/70 px-1.5 py-1 text-[11px] font-medium outline-none ${STATUS_META[r.status].chip}`}
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s} className="bg-slate-900 text-slate-200">
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );

  const table = (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30">
      <table className="w-full min-w-[840px] border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3 font-semibold">Request</th>
            <th className="px-3 py-3 font-semibold">Teams</th>
            <th className="px-3 py-3 font-semibold">Alignment</th>
            <th className="px-3 py-3 font-semibold">Urgency</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr
              key={r.id}
              className="border-b border-slate-800/70 last:border-0 transition-colors hover:bg-slate-800/30"
            >
              <td className="px-4 py-3 pr-3">
                <p className="font-semibold text-slate-200">{r.title}</p>
                <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-slate-500">
                  {r.description}
                </p>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-400">
                {r.from}
                <ArrowRight size={10} className="mx-1 inline text-slate-600" />
                {r.to}
              </td>
              <td className="whitespace-nowrap px-3 py-3">{pillarChip(r.pillar)}</td>
              <td className="whitespace-nowrap px-3 py-3">{urgencyChip(r.urgency)}</td>
              <td className="whitespace-nowrap px-3 py-3">{statusSelect(r)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-400">
                {dayFmt(r.createdAt)}
                <span className="block text-[10px] text-slate-600">{timeAgo(r.createdAt)}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  {r.status !== "completed" && (
                    <ActionButton
                      tone="success"
                      title="Mark Complete"
                      onClick={() => moveRequest(r.id, "completed")}
                    >
                      <CheckCircle2 size={11} />
                    </ActionButton>
                  )}
                  {r.status !== "blocked" && r.status !== "completed" && (
                    <ActionButton tone="danger" title="Flag as Blocked" onClick={() => moveRequest(r.id, "blocked")}>
                      <Flag size={11} />
                    </ActionButton>
                  )}
                  <ActionButton
                    title="Delete request"
                    tone={confirmId === r.id ? "danger" : "ghost"}
                    onClick={() => requestDelete(r.id)}
                  >
                    <Trash2 size={11} />
                    {confirmId === r.id ? "Sure?" : ""}
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-[12px] text-slate-500">
                No requests match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const statusChips = (
    <div className="flex flex-wrap items-center gap-1.5">
      {(["all", ...STATUS_ORDER] as const).map((s) => {
        const active = fStatus === s;
        const label = s === "all" ? "All" : STATUS_META[s].label;
        const n = s === "all" ? requests.length : counts[s];
        return (
          <button
            key={s}
            onClick={() => setFStatus(s)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              active
                ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-300"
                : "border-slate-700/60 text-slate-500 hover:border-slate-500 hover:text-slate-300"
            }`}
          >
            {s !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />}
            {label}
            <span className="tabular-nums opacity-70">{n}</span>
          </button>
        );
      })}
    </div>
  );

  /* ── Filter bar ───────────────────────────────────────────────── */
  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex-1 min-w-[200px]">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search requests by title, team, or description…"
          className={`${fieldCls} pl-9`}
        />
      </label>

      {(
        [
          ["Pillar", fPillar, setFPillar as (v: never) => void, ["all", ...PILLARS] as const],
          ["Urgency", fUrgency, setFUrgency, ["all", ...URGENCIES] as const],
          ["From", fFrom, setFFrom, ["all", ...DEPARTMENTS] as const],
        ] as const
      ).map(([placeholder, value, setter, options]) => (
        <label key={placeholder} className="relative">
          <Filter size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={value}
            onChange={(e) => setter(e.target.value as never)}
            className="appearance-none rounded-lg border border-slate-700/60 bg-slate-900/70 py-2 pl-7 pr-7 text-[12px] text-slate-300 outline-none transition-colors focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/20"
          >
            {options.map((o) => (
              <option key={o} value={o} className="bg-slate-900 text-slate-200">
                {o === "all" ? placeholder : o}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
        </label>
      ))}

      {(fStatus !== "all" || fPillar !== "all" || fUrgency !== "all" || fFrom !== "all" || query) && (
        <button
          onClick={() => {
            setFStatus("all");
            setFPillar("all");
            setFUrgency("all");
            setFFrom("all");
            setQuery("");
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 px-2.5 py-2 text-[12px] font-medium text-slate-400 transition-colors hover:border-rose-400/50 hover:text-rose-300"
        >
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );

  /* ── Metric cards ─────────────────────────────────────────────── */
  const metricCard = (
    icon: React.ReactNode,
    label: string,
    value: string,
    sub: React.ReactNode,
    accent: string
  ) => (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4 border-l-2 ${accent}`}>
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-100">{value}</p>
      <div className="mt-1 text-[11px] leading-snug text-slate-500">{sub}</div>
    </div>
  );

  const clearFilters = () => {
    setFStatus("all");
    setFPillar("all");
    setFUrgency("all");
    setFFrom("all");
    setQuery("");
    setBoardMode("board");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>
      {/* ══ Background halo ══ */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute right-1/5 top-1/3 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-4 pb-12 sm:px-6">
        {/* ══ Header ══ */}
        <header className="border-b border-slate-800/80 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
                <Layers size={17} />
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-100">
                  Cross-Functional Intake &amp; Strategic Alignment
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    Office of the Chief of Staff
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500">
                  One backlog for cross-team dependencies · triaged against our four strategic pillars · decisions made in the open.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live backlog · {requests.length} total
              </span>
              <button
                onClick={clearFilters}
                className="rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-400 transition-colors hover:border-indigo-400/50 hover:text-indigo-300"
                title="Reset board filters"
              >
                Reset
              </button>
            </div>
          </div>

          {/* ══ Primary tab switch ══ */}
          <nav className="mt-4 flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 sm:w-fit">
            <button
              onClick={() => setView("intake")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all sm:flex-none ${
                view === "intake"
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Inbox size={14} /> Intake Portal
            </button>
            <button
              onClick={() => setView("command")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all sm:flex-none ${
                view === "command"
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard size={14} /> Command Center &amp; Triage
            </button>
          </nav>
        </header>

        {/* ════════════════════════════════════════════════════════════
            1 · INTAKE PORTAL — REQUESTOR VIEW
            ════════════════════════════════════════════════════════════ */}
        {view === "intake" && (
          <main className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* ── Intake form ── */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" />
                <h2 className="text-[14px] font-semibold text-slate-100">
                  Request a cross-team dependency
                </h2>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  becomes a Pending Triage item
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRequest();
                }}
                className="space-y-4"
              >
                <div>
                  <label className={labelCls} htmlFor="req-title">Request title</label>
                  <input
                    id="req-title"
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="e.g. Migrate enterprise pricing to the new CPQ engine"
                    className={fieldCls}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="req-from">Requesting department</label>
                    <div className="relative">
                      <select
                        id="req-from"
                        value={form.from}
                        onChange={(e) => updateForm("from", e.target.value as Department)}
                        className={`${fieldCls} appearance-none pr-8`}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d} className="bg-slate-900 text-slate-200">{d}</option>
                        ))}
                      </select>
                      {selectChev}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="req-to">Target department</label>
                    <div className="relative">
                      <select
                        id="req-to"
                        value={form.to}
                        onChange={(e) => updateForm("to", e.target.value as Department)}
                        className={`${fieldCls} appearance-none pr-8`}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d} className="bg-slate-900 text-slate-200">{d}</option>
                        ))}
                      </select>
                      {selectChev}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="req-pillar">Strategic alignment pillar</label>
                    <div className="relative">
                      <select
                        id="req-pillar"
                        value={form.pillar}
                        onChange={(e) => updateForm("pillar", e.target.value as Pillar)}
                        className={`${fieldCls} appearance-none pr-8`}
                      >
                        {PILLARS.map((p) => (
                          <option key={p} value={p} className="bg-slate-900 text-slate-200">{p}</option>
                        ))}
                      </select>
                      {selectChev}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="req-urgency">Impact &amp; urgency level</label>
                    <div className="relative">
                      <select
                        id="req-urgency"
                        value={form.urgency}
                        onChange={(e) => updateForm("urgency", e.target.value as Urgency)}
                        className={`${fieldCls} appearance-none pr-8`}
                      >
                        {URGENCIES.map((u) => (
                          <option key={u} value={u} className="bg-slate-900 text-slate-200">{u}</option>
                        ))}
                      </select>
                      {selectChev}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label className={labelCls} htmlFor="req-desc">Detailed description</label>
                    <span className="text-[10px] tabular-nums text-slate-600">{form.description.length}/600</span>
                  </div>
                  <textarea
                    id="req-desc"
                    rows={4}
                    maxLength={600}
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="What’s needed, who’s affected, what’s at stake, and when it’s needed. Context is what lets triage act fast."
                    className={`${fieldCls} resize-y`}
                  />
                </div>

                {formError && (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-indigo-500 sm:w-auto"
                >
                  <Send size={14} /> Submit to Triage Backlog
                </button>

                <p className="text-[11px] leading-relaxed text-slate-600">
                  Critical items are surfaced to the Chief of Staff’s daily digest the moment they land.
                  Requests with no clear strategic pillar are returned by the triage desk — choose carefully.
                </p>
              </form>
            </section>

            {/* ── Strategic framing rail ── */}
            <aside className="flex flex-col gap-3">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                  <Crosshair size={13} className="text-slate-500" /> Strategic alignment pillars · live load
                </h3>
                <div className="space-y-2.5">
                  {pillarLoad.map(({ pillar, count }) => {
                    const meta = PILLAR_META[pillar];
                    const I = meta.icon;
                    return (
                      <div key={pillar} className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`flex items-center gap-1.5 text-[12px] font-medium ${meta.chip.split(" ")[1]}`}>
                            <I size={12} /> {pillar}
                          </span>
                          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-400">
                            {count} active
                          </span>
                        </div>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">{meta.blurb}</p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${meta.bar} transition-all duration-500`}
                            style={{ width: `${activeRequests.length ? (count / activeRequests.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <h3 className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-indigo-300">
                  <AlertTriangle size={13} /> Triage rhythm
                </h3>
                <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-500">
                  <li>· <span className="text-slate-400">2× daily</span> — Pending Triage review.</li>
                  <li>· <span className="text-slate-400">Critical</span> blockers interrupt through the Chief of Staff call.</li>
                  <li>· Every request resolves under a named owner before it leaves Pending.</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-400">
                  <Timer size={13} /> What the exec view tracks
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {statusChips}
                </div>
              </section>
            </aside>
          </main>
        )}

        {/* ════════════════════════════════════════════════════════════
            2 · COMMAND CENTER & TRIAGE BOARD — EXECUTIVE VIEW
            ════════════════════════════════════════════════════════════ */}
        {view === "command" && (
          <main className="mt-5 space-y-4">
            {/* ── Metric summary cards ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {metricCard(
                <Layers size={12} />,
                "Total active cross-team requests",
                String(activeRequests.length),
                <>Across the backlog — anything not yet <span className="text-slate-400">Completed</span>.</>,
                "border-l-indigo-500"
              )}
              {metricCard(
                <AlertTriangle size={12} />,
                "Critical blockers flagged",
                String(blockers.length),
                blockerSub(
                  blockers.length,
                  blockers.length
                    ? `of which ${criticalBlockers} carry High/Critical urgency`
                    : "Nothing is blocked right now"
                ),
                blockers.length ? "border-l-rose-500" : "border-l-emerald-500"
              )}
              {metricCard(
                <Timer size={12} />,
                "Average resolution time",
                done.length ? `${avgResolutionDays.toFixed(1)} Days` : "—",
                done.length
                  ? `Across ${done.length} completed requests · target < 5 days`
                  : "Resolve a request to start the clock",
                "border-l-emerald-500"
              )}
            </div>

            {/* ── Board / table controls ── */}
            <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-slate-100">Triage board</h2>
                  <p className="text-[11px] text-slate-500">
                    Drag cards between columns · filter by pillar / urgency / team · or drop to the table for sorting.
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
                  <button
                    onClick={() => setBoardMode("board")}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      boardMode === "board"
                        ? "bg-slate-800 text-slate-100"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Kanban board
                  </button>
                  <button
                    onClick={() => setBoardMode("table")}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      boardMode === "table"
                        ? "bg-slate-800 text-slate-100"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Data table
                  </button>
                </div>
              </div>

              {statusChips}
              {filterBar}
            </section>

            {boardMode === "board" ? board : table}

            <footer className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-600">
              <span>
                Showing <span className="font-semibold text-slate-400">{filtered.length}</span> of {requests.length} requests.
                {fStatus !== "all" || fPillar !== "all" || fUrgency !== "all" || fFrom !== "all" || query
                  ? " · filters active"
                  : ""}
              </span>
              <span>Critical flags surface to the exec digest · status changes are logged here in real time</span>
            </footer>
          </main>
        )}

        {/* ══ Toast ══ */}
        {toast && (
          <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
            <div
              className={`flex items-center gap-2 rounded-xl border bg-slate-900/95 px-4 py-2.5 text-[12px] font-medium shadow-2xl backdrop-blur ${
                toast.tone === "danger"
                  ? "border-rose-500/40 text-rose-200"
                  : toast.tone === "info"
                  ? "border-sky-500/40 text-sky-200"
                  : "border-emerald-500/40 text-emerald-200"
              }`}
            >
              {toast.tone === "danger" ? (
                <AlertTriangle size={13} />
              ) : toast.tone === "info" ? (
                <Activity size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}
              {toast.msg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function blockerSub(total: number, text: string) {
  return (
    <>
      <span className={total ? "font-semibold text-rose-400" : "text-emerald-400"}>
        {text}
      </span>
    </>
  );
}