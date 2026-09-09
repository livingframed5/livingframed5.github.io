import { useMemo } from "react";
import type { Project, Health } from "@/lib/types";
import { unbilled, marginAtRisk } from "@/lib/constants";
import type { SortKey } from "@/components/ProjectsTable";

export function useSortedRows(
  projects: Project[],
  statusFilter: "all" | Health,
  sortKey: SortKey,
) {
  return useMemo(() => {
    const filtered = projects.filter((p) => statusFilter === "all" || p.health === statusFilter);
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "margin":
          return a.currentMargin - b.currentMargin;
        case "unbilled":
          return unbilled(b) - unbilled(a);
        default: {
          const rank = { critical: 3, warning: 2, healthy: 1 };
          return rank[b.health] - rank[a.health] || marginAtRisk(b) - marginAtRisk(a);
        }
      }
    });
  }, [projects, statusFilter, sortKey]);
}

export const FILTER_TABS = [
  { key: "all" as const, label: "All", dot: "bg-slate-500" },
  { key: "critical" as const, label: "Critical", dot: "bg-rose-500" },
  { key: "warning" as const, label: "Warning", dot: "bg-amber-500" },
  { key: "healthy" as const, label: "Healthy", dot: "bg-emerald-500" },
] as const;

export const SORT_LABELS: Record<SortKey, string> = {
  leak: "Biggest leak",
  margin: "Margin %",
  unbilled: "Unbilled $",
  name: "Project",
};
