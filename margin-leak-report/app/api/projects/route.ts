import { NextResponse } from "next/server";
import { fetchProjects } from "@/lib/airtable";
import type { Project } from "@/lib/types";
import { SEED_PROJECTS } from "@/lib/constants";
import { getIsConfigured } from "@/lib/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sample = searchParams.get("sample") === "true";

  if (sample) {
    return NextResponse.json({ projects: SEED_PROJECTS, source: "sample" });
  }

  if (!getIsConfigured()) {
    return NextResponse.json(
      { error: "Airtable not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID, or use ?sample=true." },
      { status: 503 },
    );
  }

  try {
    const projects: Project[] = await fetchProjects();
    if (projects.length === 0) {
      return NextResponse.json({ projects: SEED_PROJECTS, source: "fallback" }, { status: 200 });
    }
    return NextResponse.json({ projects, source: "airtable" });
  } catch (err) {
    console.error("[margin-leak-report] GET /api/projects error:", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
