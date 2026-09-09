import type { Quote } from "./types";
import type { PaperAccount } from "./paper";

export interface AutopilotCandidate {
  symbol: string;
  price: number;
  score: number;
  conditions: string[];
}

export type AutopilotSide = "BUY" | "SELL";

export interface AutopilotLogEntry {
  at: number;
  side: AutopilotSide;
  symbol: string;
  shares: number;
  price: number;
  value: number;
  note: string;
}

export interface AutopilotRules {
  targetPct: number;
  stopPct: number;
  maxHoldDays: number;
  maxPositions: number;
}

export interface AutopilotAction {
  side: AutopilotSide;
  symbol: string;
  shares: number;
  price: number;
  note: string;
}

const DIP_CODES = new Set(["big-drop", "near-52w-low", "selloff", "oversold"]);

export function isDipCandidate(candidate: AutopilotCandidate): boolean {
  return candidate.conditions.some((c) => DIP_CODES.has(c));
}

export function dipReason(candidate: AutopilotCandidate): string {
  if (candidate.conditions.includes("big-drop")) return "big single-day drop";
  if (candidate.conditions.includes("oversold")) return "oversold (RSI < 30)";
  if (candidate.conditions.includes("near-52w-low")) return "near 52-week low";
  if (candidate.conditions.includes("selloff")) return "multi-week sell-off";
  return "dip signal";
}

export function computeTotal(account: PaperAccount, priceBySymbol: Map<string, number>): number {
  let value = account.cash;
  for (const h of account.holdings) {
    value += (priceBySymbol.get(h.symbol) ?? h.avgCost) * h.shares;
  }
  return value;
}

export function planAutopilot(
  account: PaperAccount,
  quotes: Quote[],
  candidates: AutopilotCandidate[],
  rules: AutopilotRules,
): AutopilotAction[] {
  const actions: AutopilotAction[] = [];
  const held = new Set(account.holdings.map((h) => h.symbol));
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q.price]));
  const now = Date.now();

  for (const h of account.holdings) {
    const buys = account.trades
      .filter((t) => t.side === "BUY" && t.symbol === h.symbol)
      .sort((a, b) => a.at - b.at);
    const entryAt = buys[0]?.at ?? account.createdAt;
    const days = (now - entryAt) / 86_400_000;
    const price = quoteMap.get(h.symbol) ?? h.avgCost;
    if (price <= 0) continue;
    const entry = h.avgCost;
    if (price <= entry * (1 - rules.stopPct / 100)) {
      actions.push({
        side: "SELL",
        symbol: h.symbol,
        shares: h.shares,
        price,
        note: `Stop-loss hit (−${rules.stopPct}% from ${entry.toFixed(2)})`,
      });
    } else if (price >= entry * (1 + rules.targetPct / 100)) {
      actions.push({
        side: "SELL",
        symbol: h.symbol,
        shares: h.shares,
        price,
        note: `Target hit (+${rules.targetPct}% from ${entry.toFixed(2)})`,
      });
    } else if (days >= rules.maxHoldDays) {
      actions.push({
        side: "SELL",
        symbol: h.symbol,
        shares: h.shares,
        price,
        note: `Max hold of ${rules.maxHoldDays} days reached`,
      });
    }
  }

  const busy = new Set(actions.map((a) => a.symbol));
  const slots = rules.maxPositions - held.size;
  if (slots > 0 && account.cash > 0) {
    const picks = candidates
      .filter((c) => !held.has(c.symbol) && !busy.has(c.symbol) && isDipCandidate(c))
      .sort((a, b) => b.score - a.score)
      .slice(0, slots);
    let remainingCash = account.cash;
    let remainingSlots = slots;
    for (const pick of picks) {
      if (remainingCash <= 0 || remainingSlots <= 0) break;
      const per = remainingCash / remainingSlots;
      const shares = Math.floor(per / pick.price);
      if (shares < 1) continue;
      actions.push({
        side: "BUY",
        symbol: pick.symbol,
        shares,
        price: pick.price,
        note: `Bought dip signal: ${dipReason(pick)}`,
      });
      remainingCash -= shares * pick.price;
      remainingSlots -= 1;
    }
  }

  return actions;
}