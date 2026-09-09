import type { OrderType } from "./types";

export interface PaperHolding {
  symbol: string;
  shares: number;
  avgCost: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  side: OrderType;
  shares: number;
  price: number;
  value: number;
  at: number;
}

export interface PaperAccount {
  cash: number;
  startCash: number;
  holdings: PaperHolding[];
  trades: PaperTrade[];
  createdAt: number;
}

export interface PaperSnapshot {
  t: number;
  v: number;
}

export const DEFAULT_START_CASH = 100_000;

export function createAccount(startCash = DEFAULT_START_CASH): PaperAccount {
  return {
    cash: startCash,
    startCash,
    holdings: [],
    trades: [],
    createdAt: Date.now(),
  };
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buy(
  acc: PaperAccount,
  symbol: string,
  shares: number,
  price: number,
): { account: PaperAccount; error?: string } {
  if (!Number.isFinite(price) || price <= 0) return { account: acc, error: "Invalid price." };
  if (!Number.isFinite(shares) || shares <= 0) return { account: acc, error: "Invalid share count." };
  const cost = shares * price;
  if (cost > acc.cash + 1e-6) {
    return { account: acc, error: `Insufficient cash — need ${cost.toFixed(2)} but have ${acc.cash.toFixed(2)}.` };
  }

  const existing = acc.holdings.find((h) => h.symbol === symbol);
  const holdings = existing
    ? acc.holdings.map((h) =>
        h.symbol === symbol
          ? {
              ...h,
              shares: h.shares + shares,
              avgCost: (h.shares * h.avgCost + shares * price) / (h.shares + shares),
            }
          : h,
      )
    : [...acc.holdings, { symbol, shares, avgCost: price }];

  const trade: PaperTrade = {
    id: nextId("trade"),
    symbol,
    side: "BUY",
    shares,
    price,
    value: cost,
    at: Date.now(),
  };
  return { account: { ...acc, cash: acc.cash - cost, holdings, trades: [trade, ...acc.trades] } };
}

export function sell(
  acc: PaperAccount,
  symbol: string,
  shares: number,
  price: number,
): { account: PaperAccount; error?: string } {
  const holding = acc.holdings.find((h) => h.symbol === symbol);
  if (!holding) return { account: acc, error: "You don't hold this symbol." };
  if (!Number.isFinite(shares) || shares <= 0) return { account: acc, error: "Invalid share count." };
  if (shares > holding.shares + 1e-6) {
    return { account: acc, error: `Only ${holding.shares} shares held.` };
  }

  const value = shares * price;
  const holdings = acc.holdings
    .map((h) => (h.symbol === symbol ? { ...h, shares: h.shares - shares } : h))
    .filter((h) => h.shares > 1e-6);

  const trade: PaperTrade = {
    id: nextId("trade"),
    symbol,
    side: "SELL",
    shares,
    price,
    value,
    at: Date.now(),
  };
  return { account: { ...acc, cash: acc.cash + value, holdings, trades: [trade, ...acc.trades] } };
}