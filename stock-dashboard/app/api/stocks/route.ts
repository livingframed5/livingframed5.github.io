import { NextRequest, NextResponse } from "next/server";
import { fetchChart, fetchName } from "@/lib/yahoo";
import type { Quote, TimeRange } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_RANGES: TimeRange[] = ["1d", "1wk", "1mo", "3mo", "6mo", "1y", "5y"];
const RANGE_CACHE_MS: Record<string, number> = {
  "1d": 30_000,
  "1wk": 60_000,
  "1mo": 60_000,
  "3mo": 300_000,
  "6mo": 300_000,
  "1y": 600_000,
  "5y": 600_000,
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
  const range = (searchParams.get("range") ?? "1mo") as TimeRange;

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const payload = await fetchChart(symbol, range, RANGE_CACHE_MS[range]);
  if (!payload) {
    return NextResponse.json({ error: `Could not fetch data for ${symbol}` }, { status: 502 });
  }

  const name = await fetchName(symbol);
  const quote: Quote = { ...payload.quote, name };

  return NextResponse.json(
    { quote, history: payload.candles, timestamps: payload.timestamps },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${Math.floor(RANGE_CACHE_MS[range] / 1000)}, stale-while-revalidate=30`,
      },
    },
  );
}