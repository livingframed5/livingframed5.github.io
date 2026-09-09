"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NAV } from "@/lib/constants";
import type { Project, Metrics } from "@/lib/types";
import type { Mode } from "@/contexts/ModeContext";
import { ModeToggle } from "@/components/ModeToggle";

export function MobileHeader({ onBack }: { onBack: () => void }) {
  return (
    <Link
      href="/"
      onClick={onBack}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm transition-colors hover:text-ink lg:hidden"
    >
      <ArrowLeft size={12} /> Portfolio
    </Link>
  );
}

export function DesktopSidebar({
  projects,
  metrics,
  mode,
}: {
  projects: Project[];
  metrics: Metrics;
  mode: Mode;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-slate-300 lg:flex">
      <Link
        href="/"
        className="flex items-center gap-2 border-b border-slate-800/70 px-5 py-5 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-300"
      >
        <ArrowLeft size={13} /> Back to portfolio
      </Link>
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
            <span className="text-rose-400">~</span>
          </span>
          <div>
            <p className="text-[13px] font-bold text-white">Margin Leak</p>
            <p className="-mt-0.5 text-[10px] text-slate-500">Field Ops | Week 34</p>
          </div>
        </div>
      </div>
      <nav className="mt-6 flex-1 space-y-0.5 px-3">
        {NAV.map((n) => (
          <button
            key={n.label}
            className={
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors " +
              (n.active
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200")
            }
          >
            <n.icon size={15} className={n.active ? "text-rose-400" : ""} />
            {n.label}
            {n.label === "Active Projects" && (
              <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                {projects.length}
              </span>
            )}
            {n.label === "Change Orders" && (
              <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                {metrics.coCount}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="m-3">
        <ModeToggle />
      </div>
      <div className="m-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p className="text-[11px] font-semibold text-slate-300">
            {mode === "demo" ? "Demo mode (sample data)" : "Connected to Airtable"}
          </p>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
          {mode === "demo"
            ? "Toggle to Live Data for real project data."
            : "Toggle to Demo Mode for sample data."}
        </p>
      </div>
    </aside>
  );
}
