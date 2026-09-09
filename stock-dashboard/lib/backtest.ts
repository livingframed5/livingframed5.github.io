import { fetchChart } from "./yahoo";
import { rsi } from "./indicators";

export type BuyRule = "oversold" | "near-low" | "big-drop" | "selloff";

export const BUY_RULES: Array<{ code: BuyRule; label: string }> = [
  { code: "oversold", label: "Buy oversold (RSI < 30)" },
  { code: "near-low", label: "Buy near 52-week low" },
  { code: "big-drop", label: "Buy big single-day drop (≤ −4%)" },
  { code: "selloff", label: "Buy multi-week sell-off (≤ −12%/14d)" },
];

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entry: number;
  exit: number;
  retPct: number;
}

export interface BacktestPoint {
  t: string;
  strategy: number;
  buyHold: number;
}

export interface BacktestResult {
  symbol: string;
  buyRule: BuyRule;
  targetPct: number;
  stopPct: number;
  maxHoldDays: number;
  trades: BacktestTrade[];
  winRate: number;
  totalReturnPct: number;
  buyHoldPct: number;
  maxDrawdownPct: number;
  equity: BacktestPoint[];
}

function pct(a: number, b: number): number {
  return b ? ((a - b) / b) * 100 : 0;
}

function buySignal(rule: BuyRule, closes: number[], lows: number[], i: number): boolean {
  if (i < 20) return false;
  const close = closes[i];
  if (i >= closes.length - 1) return false;
  switch (rule) {
    case "oversold": {
      const r = rsi(closes.slice(0, i + 1), 14);
      return (r[r.length - 1] ?? 100) < 30;
    }
    case "near-low": {
      const low52 = Math.min(...lows.slice(0, i - 250));
      return low52 > 0 && close <= low52 * 1.03;
    }
    case "big-drop":
      return pct(close, closes[i - 1]) <= -4;
    case "selloff":
      return pct(close, closes[i - 14]) <= -12;
  }
}

export async function backtest(
  symbol: string,
  buyRule: BuyRule,
  targetPct: number,
  stopPct: number,
  maxHoldDays: number,
): Promise<BacktestResult | null> {
  const payload = await fetchChart(symbol, "1y", 15 * 60_000);
  if (!payload || payload.candles.length < 80) return null;

  const closes = payload.candles.map((c) => c.close);
  const lows = payload.candles.map((c) => c.low);
  const dates = payload.candles.map((c) => c.date.slice(0, 10));

  const trades: BacktestTrade[] = [];
  let entryDay = -1;
  let entryPrice = 0;

  for (let i = 1; i < closes.length; i++) {
    if (entryDay === -1) {
      if (buySignal(buyRule, closes, lows, i)) {
        entryDay = i;
        entryPrice = closes[i];
      }
      continue;
    }

    const held = i - entryDay;
    const ret = pct(closes[i], entryPrice);
    if (ret <= -stopPct || ret >= targetPct || held >= maxHoldDays) {
      trades.push({
        entryDate: dates[entryDay],
        exitDate: dates[i],
        entry: entryPrice,
        exit: closes[i],
        retPct: ret,
      });
      entryDay = -1;
    }
  }
  if (entryDay !== -1 && entryDay < closes.length - 1) {
    trades.push({
      entryDate: dates[entryDay],
      exitDate: dates[closes.length - 1],
      entry: entryPrice,
      exit: closes[closes.length - 1],
      retPct: pct(closes[closes.length - 1], entryPrice),
    });
  }

  const wins = trades.filter((t) => t.retPct > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  const factorByDate = new Map<string, number>();
  for (const t of trades) factorByDate.set(t.exitDate, 1 + t.retPct / 100);

  const start = closes[0];
  const end = closes[closes.length - 1];
  const buyHoldPct = pct(end, start);
  const equity: BacktestPoint[] = [];
  let running = 1;
  let peak = 1;
  let maxDrawdown = 0;
  for (let i = 0; i < dates.length; i++) {
    const factor = factorByDate.get(dates[i]);
    if (factor) running *= factor;
    if (running > peak) peak = running;
    maxDrawdown = Math.max(maxDrawdown, (peak - running) / peak);
    equity.push({
      t: dates[i],
      strategy: running,
      buyHold: 1 + pct(closes[i], start),
    });
  }

  return {
    symbol,
    buyRule,
    targetPct,
    stopPct,
    maxHoldDays,
    trades,
    winRate,
    totalReturnPct: (running - 1) * 100,
    buyHoldPct,
    maxDrawdownPct: maxDrawdown * 100,
    equity,
  };
}