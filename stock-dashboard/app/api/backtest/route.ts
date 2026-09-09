import { NextResponse } from "next/server";
import { backtest, type BuyRule, type BacktestResult } from "@/lib/backtest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
  const buyRule = (searchParams.get("rule") ?? "oversold") as BuyRule;
  const targetPct = clamp(Number(searchParams.get("target") ?? 10) || 10, 1, 100);
  const stopPct = clamp(Number(searchParams.get("stop") ?? 8) || 8, 0.5, 50);
  const maxHoldDays = clamp(Math.round(Number(searchParams.get("maxHold") ?? 30) || 30), 1, 90);

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const result: BacktestResult | null = await backtest(symbol, buyRule, targetPct, stopPct, maxHoldDays);
  if (!result) {
    return NextResponse.json(
      { error: "Not enough price history for this symbol" },
      { status: 422 },
    );
  }

  return NextResponse.json(
    { result },
    {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    },
  );
}