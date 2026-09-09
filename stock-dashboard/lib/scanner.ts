import { fetchChart, fetchName } from "./yahoo";
import { rsi, sma } from "./indicators";

export interface ScreenCondition {
  code: string;
  label: string;
}

export interface ScannerHit {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  avgVolume20: number;
  rsi14: number;
  distFromSMA50: number;
  low52w: number;
  conditions: ScreenCondition[];
  score: number;
}

export interface ScannerResponse {
  hits: ScannerHit[];
  scannedAt: string;
}

export const SCREENS: { code: string; label: string; description: string }[] = [
  { code: "big-drop", label: "Big single-day drop", description: "Down −4% or more on the day — often a reaction to news." },
  { code: "near-52w-low", label: "Near 52-week low", description: "Trading within 3% of its 52-week low (oversold zone)." },
  { code: "selloff", label: "Multi-week sell-off", description: "−12% or worse over the last 14 trading days." },
  { code: "oversold", label: "Oversold (RSI < 30)", description: "14-day RSI below 30 — momentum sellers may be exhausted." },
  { code: "vol-spike", label: "Volume spike", description: "Volume ≥ 2× the 20-day average, usually a capitulation or catalyst day." },
  { code: "fast-riser", label: "Fast riser", description: "Up ≥ 10% in 5 days on above-average volume (momentum candidate)." },
];

const MAX = 30;

function pct(a: number, b: number): number {
  return b ? ((a - b) / b) * 100 : 0;
}

export async function scanSymbols(symbols: string[]): Promise<ScannerHit[]> {
  const hits: ScannerHit[] = [];
  const list = [...new Set(symbols.map((s) => s.toUpperCase()))].slice(0, MAX);
  await Promise.all(
    list.map(async (symbol) => {
      try {
        const payload = await fetchChart(symbol, "1y", 15 * 60_000);
        if (!payload || payload.candles.length < 40) return;
        const closes = payload.candles.map((c) => c.close);
        const vols = payload.candles.map((c) => c.volume);
        const last = payload.candles[payload.candles.length - 1];
        const prev = payload.candles[payload.candles.length - 2];
        const lastClose = last.close;
        const dayChange = pct(lastClose, prev.close);

        const low52 = Math.min(...payload.candles.slice(0, -1).map((c) => c.low), last.low);
        const ret5 = pct(lastClose, closes[closes.length - 6]);
        const ret14 = pct(lastClose, closes[closes.length - 15]);

        const sma50Arr = sma(closes, 50);
        const sma50 = sma50Arr[sma50Arr.length - 1];
        const rsiArr = rsi(closes, 14);
        const rsi14 = rsiArr[rsiArr.length - 1] ?? 0;

        const volSlice = vols.slice(-21, -1);
        const avgVol20 = volSlice.length
          ? volSlice.reduce((a, b) => a + b, 0) / volSlice.length
          : last.volume;

        const conditions: ScreenCondition[] = [];
        if (dayChange <= -4) conditions.push({ code: "big-drop", label: SCREENS[0].label });
        if (low52 > 0 && lastClose <= low52 * 1.03)
          conditions.push({ code: "near-52w-low", label: SCREENS[1].label });
        if (ret14 <= -12) conditions.push({ code: "selloff", label: SCREENS[2].label });
        if (rsi14 > 0 && rsi14 < 30) conditions.push({ code: "oversold", label: SCREENS[3].label });
        if (avgVol20 > 0 && last.volume >= avgVol20 * 2)
          conditions.push({ code: "vol-spike", label: SCREENS[4].label });
        if ((ret5 >= 10 || (ret5 >= 5 && dayChange >= 2)) && last.volume >= avgVol20 * 1.2)
          conditions.push({ code: "fast-riser", label: SCREENS[5].label });

        const score = conditions.length * 10 + (rsi14 > 0 && rsi14 < 30 ? 2 : 0) + (dayChange <= -8 ? 3 : 0);
        if (score === 0) return;

        const muted = rsi14 === 0;
        hits.push({
          symbol,
          name: muted ? symbol : (await fetchName(symbol)),
          price: lastClose,
          changePercent: dayChange,
          volume: last.volume,
          avgVolume20: avgVol20,
          rsi14,
          distFromSMA50: sma50 ? pct(lastClose, sma50) : 0,
          low52w: low52,
          conditions,
          score,
        });
      } catch {
        /* skip */
      }
    }),
  );
  return hits.sort((a, b) => b.score - a.score);
}