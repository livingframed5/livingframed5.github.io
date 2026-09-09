import { NextResponse } from "next/server";
import { updateChangeOrderStatus } from "@/lib/airtable";
import type { ChangeOrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, ctx: PatchParams) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  if (!body || !body.status) {
    return NextResponse.json({ error: "Missing 'status' in request body" }, { status: 400 });
  }

  const validStatuses: ChangeOrderStatus[] = ["unsigned", "pending", "invoiced"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const ok = await updateChangeOrderStatus(id, body.status);
    if (!ok) {
      return NextResponse.json({ error: "Airtable not configured or update failed" }, { status: 503 });
    }
    return NextResponse.json({ success: true, id, status: body.status });
  } catch (err) {
    console.error(`[margin-leak-report] PATCH /api/change-orders/${id} error:`, err);
    return NextResponse.json({ error: "Failed to update change order" }, { status: 500 });
  }
}
