"use client";

import { useMode } from "@/contexts/ModeContext";
import { AlertTriangle } from "lucide-react";

export function ModeStatus({
  source,
  loadError,
}: {
  source: "loading" | "sample" | "airtable" | "empty" | "error";
  loadError: string | null;
}) {
  const { mode } = useMode();

  if (mode === "demo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-[10.5px] font-semibold text-amber-800">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        Demo Mode - Sample Data
      </span>
    );
  }

  if (loadError && source !== "airtable") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-2.5 py-1 text-[10.5px] font-semibold text-rose-800">
        <AlertTriangle size={11} /> Airtable: {loadError}
      </span>
    );
  }

  if (source === "empty") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600">
        No projects found
      </span>
    );
  }

  if (source === "airtable") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Live from Airtable
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
      Loading...
    </span>
  );
}
