import { NextResponse } from "next/server";
import { scanSymbols, type ScannerResponse } from "@/lib/scanner";
import { UNIVERSE } from "@/lib/data/universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

let cache: { hits: ScannerResponse["hits"] | null; expiresAt: number } = {
  hits: null,
  expiresAt: 0,
};

function symbolsFromQuery(searchParams: URLSearchParams): string[] | null {
  const q = searchParams.get("symbols");
  return q ? q.split(",").map((s) => s.trim()).filter(Boolean) : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const custom = symbolsFromQuery(searchParams);

  if (!custom && cache.hits && Date.now() < cache.expiresAt) {
    return respond(cache.hits);
  }

  const symbols = custom ?? UNIVERSE.map((u) => u.symbol);
  const hits = await scanSymbols(symbols);
  if (!custom) cache = { hits, expiresAt: Date.now() + 4 * 60_000 };
  return respond(hits);
}

function respond(hits: ScannerResponse["hits"]) {
  return NextResponse.json(
    { hits, scannedAt: new Date().toISOString() } satisfies ScannerResponse,
    {
      headers: {
        "Cache-Control": "public, s-maxage=240, stale-while-revalidate=60",
      },
    },
  );
}