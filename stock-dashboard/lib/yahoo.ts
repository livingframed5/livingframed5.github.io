import type { Candle, Quote, TimeRange } from "./types";

const YAHOO_HOST = "query1.finance.yahoo.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const RANGE_MAP: Record<TimeRange, { range: string; interval: string }> = {
  "1d": { range: "1d", interval: "5m" },
  "1wk": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1d" },
  "3mo": { range: "3mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "5y": { range: "5y", interval: "1wk" },
};

export interface StockPayload {
  quote: Quote;
  candles: Candle[];
  timestamps: number[];
}

interface TTLBox<T> {
  expiresAt: number;
  value: T;
}

const cache = new Map<string, TTLBox<unknown>>();

function getCached<T>(key: string): T | undefined {
  const box = cache.get(key);
  if (!box) return undefined;
  if (Date.now() > box.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return box.value as T;
}

function setCached(key: string, value: unknown, ttlMs = 60_000): void {
  cache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return (await res.json()) as T;
}

interface ChartMeta {
  currency?: string;
  symbol?: string;
  exchangeName?: string;
  instrumentType?: string;
  regularMarketPrice?: number;
  regularMarketTime?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  currentTradingPeriod?: {
    pre?: { timezone?: string };
    regular?: { timezone?: string };
    post?: { timezone?: string };
  };
}

interface ChartQuoteSeries {
  open?: (number | null)[];
  high?: (number | null)[];
  low?: (number | null)[];
  close?: (number | null)[];
  volume?: (number | null)[];
}

interface ChartResult {
  chart?: {
    result?: Array<{
      meta?: ChartMeta;
      timestamp?: number[];
      indicators?: {
        quote?: ChartQuoteSeries[];
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
}

function toCandles(timestamps: number[] | undefined, quoteArr: ChartQuoteSeries | undefined): Candle[] {
  const candles: Candle[] = [];
  (timestamps ?? []).forEach((t, i) => {
    const close = quoteArr?.close?.[i];
    if (close == null || close <= 0) return;
    candles.push({
      date: new Date(t * 1000).toISOString(),
      open: quoteArr?.open?.[i] ?? close,
      high: quoteArr?.high?.[i] ?? close,
      low: quoteArr?.low?.[i] ?? close,
      close,
      volume: quoteArr?.volume?.[i] ?? 0,
    });
  });
  return candles;
}

export async function fetchChart(
  symbol: string,
  range: TimeRange,
  ttlMs = 60_000,
): Promise<StockPayload | null> {
  const key = `chart:${symbol.toUpperCase()}:${range}`;
  const cached = getCached<StockPayload>(key);
  if (cached) return cached;

  const { range: r, interval } = RANGE_MAP[range];
  const url = `https://${YAHOO_HOST}/v8/finance/chart/${encodeURIComponent(
    symbol.toUpperCase(),
  )}?range=${r}&interval=${interval}&includePrePost=false&events=div`;
  let data: ChartResult;
  try {
    data = await fetchJson<ChartResult>(url);
  } catch {
    return null;
  }
  const result = data.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta ?? {};
  const candles = toCandles(result.timestamp, result.indicators?.quote?.[0]);
  const last = candles[candles.length - 1];
  const price = meta.regularMarketPrice ?? last?.close ?? candles[0]?.close ?? 0;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? candles[0]?.open ?? price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const quote: Quote = {
    symbol: (meta.symbol ?? symbol).toUpperCase(),
    name: symbol.toUpperCase(),
    price,
    change,
    changePercent,
    previousClose: prevClose,
    open: meta.regularMarketOpen ?? candles[0]?.open ?? price,
    high: meta.regularMarketDayHigh ?? (highs.length ? Math.max(...highs, price) : price),
    low: meta.regularMarketDayLow ?? (lows.length ? Math.min(...lows, price) : price),
    volume: meta.regularMarketVolume ?? last?.volume ?? 0,
    marketState: "REGULAR",
    regularMarketTime:
      ((meta.regularMarketTime ?? result.timestamp?.[result.timestamp.length - 1]) ?? Date.now() / 1000) * 1000,
    currency: meta.currency ?? "USD",
  };

  const payload: StockPayload = { quote, candles, timestamps: result.timestamp ?? [] };
  setCached(key, payload, ttlMs);
  return payload;
}

const nameCache = new Map<string, string>();

export async function fetchName(symbol: string): Promise<string> {
  const upper = symbol.toUpperCase();
  const cached = nameCache.get(upper);
  if (cached) return cached;
  try {
    const url = `https://${YAHOO_HOST}/v1/finance/search?q=${encodeURIComponent(upper)}&quotesCount=1&newsCount=0`;
    const data = await fetchJson<{
      quotes?: Array<{ symbol?: string; shortname?: string; longname?: string }>;
    }>(url);
    const hit = data.quotes?.find(
      (q) => q.symbol?.toUpperCase() === upper && (q.shortname || q.longname),
    );
    const name = hit?.shortname || hit?.longname || upper;
    nameCache.set(upper, name);
    return name;
  } catch {
    return upper;
  }
}