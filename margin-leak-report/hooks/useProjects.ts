import { useEffect, useState, useRef } from "react";
import type { Project, ChangeOrderStatus } from "@/lib/types";
import { SEED_PROJECTS } from "@/lib/constants";
import type { Mode } from "@/contexts/ModeContext";

export interface ProjectsState {
  projects: Project[];
  source: "loading" | "sample" | "airtable" | "empty" | "error";
  error: string | null;
}

export function useProjects(mode: Mode, sample = false): ProjectsState {
  const [state, setState] = useState<ProjectsState>(() => {
    if (mode === "demo" || sample) {
      return { projects: SEED_PROJECTS, source: "sample", error: null };
    }
    return { projects: [], source: "loading", error: null };
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (mode === "demo" || sample) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ projects: SEED_PROJECTS, source: "sample", error: null });
      return;
    }

    const url = new URL("/api/projects", window.location.origin);
    if (sample) url.searchParams.set("sample", "true");

    fetch(url.toString())
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const msg = data?.error ?? `HTTP ${res.status}`;
          setState({ projects: [], source: "error", error: msg });
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.projects && data.projects.length === 0) {
          setState({ projects: [], source: "empty", error: null });
        } else {
          setState({ projects: data.projects, source: data.source ?? "airtable", error: null });
        }
      })
      .catch((err) => {
        setState({ projects: [], source: "error", error: String(err) });
      });
  }, [mode, sample]);

  return state;
}

export async function markChangeOrderInvoiced(
  recordId: string,
  status: ChangeOrderStatus,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/change-orders/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
