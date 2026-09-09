"use client";

import { FolderPlus, Copy } from "lucide-react";

export function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-12">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-200">
        <FolderPlus size={24} className="text-slate-400" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-slate-700">No projects found</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Your Airtable base does not have any records in the configured table. Add some projects
          and they will appear here.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
        <span className="font-mono text-[10px] text-slate-400">AIRTABLE_TABLE_PROJECTS=Projects</span>
        <Copy size={12} />
      </div>
    </div>
  );
}
