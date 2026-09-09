import type { Quote } from "./types";
import type { PaperAccount } from "./paper";

export type FamousStyle = "value" | "momentum" | "growth-dip" | "contrarian" | "hype";

export interface FamousPersona {
  id: string;
  name: string;
  title: string;
  tagline: string;
  universe: string[];
  style: FamousStyle;
  /** 0..1 — how often a symbol is considered in a tick */
  activity: number;
  /** fraction of available cash deployed per buy */
  positionShare: number;
  maxPositions: number;
}

export type FamousSide = "BUY" | "SELL";

export interface FamousAction {
  side: FamousSide;
  symbol: string;
  shares: number;
  price: number;
  note: string;
}

export const FAMOUS_PERSONAS: FamousPersona[] = [
  {
    id: "buffett",
    name: "Warren Buffett",
    title: "Berkshire Hathaway — value investor",
    tagline: "Buys quality when it's cheap and holds for years. Not interested in the noise.",
    universe: ["AAPL", "KO", "BAC", "AXP", "JPM", "CVX", "OXY", "META", "AON", "KHC"],
    style: "value",
    activity: 0.5,
    positionShare: 0.12,
    maxPositions: 8,
  },
  {
    id: "pelosi",
    name: "Nancy Pelosi",
    title: "Congress — famously active in tech options",
    tagline: "Rides tech momentum and takes profits into strength.",
    universe: ["NVDA", "MSFT", "META", "GOOGL", "AVGO", "TSLA", "PLTR", "COIN", "AMZN", "AAPL"],
    style: "momentum",
    activity: 0.6,
    positionShare: 0.1,
    maxPositions: 6,
  },
  {
    id: "cathie-wood",
    name: "Cathie Wood",
    title: "ARK Invest — disruptive innovation",
    tagline: "Buys the blood in the street for growth names she believes in. Volatile by design.",
    universe: ["TSLA", "ROKU", "COIN", "ZM", "PLTR", "CRSP", "MDB", "RBLX", "SQ", "HOOD"],
    style: "growth-dip",
    activity: 0.55,
    positionShare: 0.12,
    maxPositions: 6,
  },
  {
    id: "burry",
    name: "Michael Burry",
    title: "Scion Capital — contrarian, deep value",
    tagline: "Fades the crowd. Sizes up when everyone else is selling. Not afraid of being early.",
    universe: ["BAC", "C", "JPM", "GDX", "XOM", "CVX", "PFE", "MRK", "T", "KHC"],
    style: "contrarian",
    activity: 0.3,
    positionShare: 0.18,
    maxPositions: 5,
  },
  {
    id: "chamath",
    name: "Chamath Palihapitiya",
    title: "Growth & SPAC-era momentum",
    tagline: "Buys momentum hype early and exits into the pop.",
    universe: ["SOFI", "OPEN", "RIVN", "PLTR", "SPCE", "RBLX", "COIN", "HOOD", "NU", "DKNG"],
    style: "hype",
    activity: 0.65,
    positionShare: 0.1,
    maxPositions: 5,
  },
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Deterministic 0..1 per (persona, symbol, time bucket) so ticks don't flap. */
function roll(personaId: string, symbol: string, now: number): number {
  const bucket = Math.floor(now / 120_000);
  return hash(`${personaId}:${symbol}:${bucket}`);
}

export function styleSignals(style: FamousStyle, price: number, prevClose: number, avgCost?: number): {
  buy?: string;
  sell?: string;
} {
  const pct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
  const cost = avgCost && avgCost > 0 ? avgCost : price;
  const gainPct = ((price - cost) / cost) * 100;

  switch (style) {
    case "value": {
      const basis = avgCost && avgCost > 0 ? avgCost : prevClose;
      if (basis > 0 && price <= basis * 0.98) {
        const discount = ((basis - price) / basis) * 100;
        return {
          buy: `quality at a discount (−${Math.abs(discount).toFixed(1)}% vs ${avgCost && avgCost > 0 ? "cost" : "yesterday's close"})`,
        };
      }
      if (gainPct >= 10) return { sell: `took profit after a ${gainPct.toFixed(1)}% run-up` };
      return {};
    }
    case "momentum":
      if (pct >= 1) return { buy: `momentum is on (+${pct.toFixed(1)}%)` };
      if (gainPct <= -3) return { sell: `momentum broke down (${gainPct.toFixed(1)}% vs cost)` };
      if (gainPct >= 15) return { sell: `banked gains after +${gainPct.toFixed(1)}%` };
      return {};
    case "growth-dip":
      if (pct <= -2) return { buy: `dip-buying the innovation story (−${Math.abs(pct).toFixed(1)}% today)` };
      if (gainPct >= 25) return { sell: `trimmed a big winner (+${gainPct.toFixed(1)}%)` };
      if (gainPct <= -15) return { sell: `cut losses before they compound (−${Math.abs(gainPct).toFixed(1)}%)` };
      return {};
    case "contrarian":
      if (pct <= -2.5) return { buy: `fear is overdone (−${Math.abs(pct).toFixed(1)}% today)` };
      if (gainPct >= 20) return { sell: `the crowd came back — faded into strength (+${gainPct.toFixed(1)}%)` };
      return {};
    case "hype":
      if (pct >= 2) return { buy: `momentum is hot (+${pct.toFixed(1)}% today)` };
      if (gainPct >= 30) return { sell: `exited into the hype (+${gainPct.toFixed(1)}%)` };
      if (gainPct <= -10) return { sell: `the story broke — out at −${Math.abs(gainPct).toFixed(1)}%` };
      return {};
  }
}

export function planPersona(
  persona: FamousPersona,
  account: PaperAccount,
  quotes: Quote[],
  now = Date.now(),
): FamousAction[] {
  const actions: FamousAction[] = [];
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
  const held = new Set(account.holdings.map((h) => h.symbol));
  const busy = new Set<string>();

  for (const h of account.holdings) {
    const q = quoteMap.get(h.symbol);
    if (!q || q.price <= 0) continue;
    if (roll(persona.id, h.symbol, now) >= persona.activity) continue;
    const signals = styleSignals(persona.style, q.price, q.previousClose, h.avgCost);
    if (signals.sell) {
      actions.push({ side: "SELL", symbol: h.symbol, shares: h.shares, price: q.price, note: signals.sell });
      busy.add(h.symbol);
    }
  }

  const slots = Math.max(0, persona.maxPositions - held.size + busy.size);
  if (slots > 0 && account.cash > 0) {
    const candidates = persona.universe
      .filter((s) => !held.has(s) && !busy.has(s))
      .map((s) => {
        const q = quoteMap.get(s);
        if (!q || q.price <= 0) return null;
        const r = roll(persona.id, s, now);
        const signals = r < persona.activity ? styleSignals(persona.style, q.price, q.previousClose) : {};
        if (!signals.buy) return null;
        return { symbol: s, price: q.price, note: signals.buy, weight: r };
      })
      .filter((x): x is { symbol: string; price: number; note: string; weight: number } => x !== null)
      .sort((a, b) => a.weight - b.weight)
      .slice(0, slots);

    let remainingCash = account.cash;
    let remainingSlots = slots;
    for (const c of candidates) {
      if (remainingCash <= 0 || remainingSlots <= 0) break;
      const per = remainingCash * persona.positionShare;
      const shares = Math.max(1, Math.floor(per / c.price));
      if (shares * c.price > remainingCash) continue;
      actions.push({ side: "BUY", symbol: c.symbol, shares, price: c.price, note: c.note });
      remainingCash -= shares * c.price;
      remainingSlots -= 1;
    }
  }

  return actions;
}
