import { NextResponse } from "next/server";
import { fetchChart } from "@/lib/yahoo";
import { UNIVERSE } from "@/lib/data/universe";
import type { Mover } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CONCURRENCY = 6;
let cache: { movers: { gainers: Mover[]; losers: Mover[] } | null; expiresAt: number } = {
  movers: null,
  expiresAt: 0,
};

export async function GET() {
  if (cache.movers && Date.now() < cache.expiresAt) {
    return respond(cache.movers);
  }

  const rows: Array<Mover | null> = [];
  let cursor = 0;

  async function worker() {
    while (cursor < UNIVERSE.length) {
      const item = UNIVERSE[cursor++];
      try {
        const payload = await fetchChart(item.symbol, "1d", 60_000);
        if (!payload) continue;
        const q = payload.quote;
        if (q.price <= 0) continue;
        rows.push({
          symbol: q.symbol,
          name: item.name,
          price: q.price,
          changePercent: q.changePercent,
          change: q.change,
          volume: q.volume,
        });
      } catch {
        /* skip symbols that fail */
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const movers = (rows.filter((r): r is Mover => r != null).sort((a, b) => b.changePercent - a.changePercent));
  const result = {
    gainers: [...movers].filter((m) => m.changePercent > 0).slice(0, 10),
    losers: movers
      .filter((m) => m.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10),
  };

  cache = { movers: result, expiresAt: Date.now() + 60_000 };
  return respond(result);
}

function respond(movers: { gainers: Mover[]; losers: Mover[] }) {
  return NextResponse.json(
    { ...movers, fetchedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    },
  );
}