import { NextRequest, NextResponse } from "next/server";
import { fetchEdgarFeed } from "@/lib/edgar";
import type { InsiderTrade, OrderType, InsiderCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Filters {
  ticker?: string;
  reporter?: string;
  type?: OrderType;
  category?: InsiderCategory;
  dateFrom?: string;
  dateTo?: string;
  clusterOnly?: boolean;
  clusterWindowDays: number;
  clusterMinBuys: number;
}

function parseFilters(searchParams: URLSearchParams): Filters {
  return {
    ticker: searchParams.get("ticker")?.toString().trim().toUpperCase() || undefined,
    reporter: searchParams.get("reporter")?.toString().trim().toLowerCase() || undefined,
    type: (searchParams.get("type") as OrderType) || undefined,
    category: (searchParams.get("category") as InsiderCategory) || undefined,
    dateFrom: searchParams.get("dateFrom")?.toString() || undefined,
    dateTo: searchParams.get("dateTo")?.toString() || undefined,
    clusterOnly: searchParams.get("cluster") === "true",
    clusterWindowDays: num(searchParams.get("window"), 30),
    clusterMinBuys: num(searchParams.get("minBuys"), 2),
  };
}

function num(v: string | null, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

function within(days: number, a: string, b: string): boolean {
  const diff = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return diff <= days * 86_400_000;
}

function applyFilters(all: InsiderTrade[], f: Filters): InsiderTrade[] {
  let out = all.filter((t) => {
    if (f.ticker && t.ticker !== f.ticker) return false;
    if (f.reporter && !t.reporter.toLowerCase().includes(f.reporter)) return false;
    if (f.type && t.type !== f.type) return false;
    if (f.category && t.category !== f.category) return false;
    if (f.dateFrom && t.date < f.dateFrom) return false;
    if (f.dateTo && t.date > f.dateTo) return false;
    return true;
  });

  if (f.clusterOnly) {
    const buys = out.filter((t) => t.type === "BUY");
    const tickerDates = new Map<string, string[]>();
    for (const t of buys) {
      const arr = tickerDates.get(t.ticker) ?? [];
      arr.push(t.date);
      tickerDates.set(t.ticker, arr);
    }
    const clusteredTickers = new Set<string>();
    for (const [ticker, dates] of tickerDates) {
      let found = false;
      for (const anchor of dates) {
        const neighbors = dates.filter((d) => within(f.clusterWindowDays, d, anchor)).length;
        if (neighbors >= f.clusterMinBuys) {
          found = true;
          break;
        }
      }
      if (found) clusteredTickers.add(ticker);
    }
    out = out.filter((t) => clusteredTickers.has(t.ticker));
  }

  return out.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 300);
}

export async function GET(request: NextRequest) {
  const f = parseFilters(request.nextUrl.searchParams);
  const feed = await fetchEdgarFeed();
  const trades = applyFilters(feed, f);
  const hasEdgar = feed.some((t) => t.source === "edgar");
  const hasDemo = feed.some((t) => t.source === "demo");
  const source = hasEdgar && hasDemo ? "mixed" : hasEdgar ? "edgar" : "demo";
  return NextResponse.json(
    {
      trades,
      count: trades.length,
      source,
      fetchedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
  );
}