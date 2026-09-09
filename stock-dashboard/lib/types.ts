export type TradingMode = "all" | "watchlist";

export type TimeRange = "1d" | "1wk" | "1mo" | "3mo" | "6mo" | "1y" | "5y";

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketState: string;
  regularMarketTime: number;
  currency: string;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockPayload {
  quote: Quote;
  history: Candle[];
  timestamps: number[];
}

export type OrderType = "BUY" | "SELL";

export type InsiderCategory = "corporate" | "congressional" | "public";

export interface InsiderTrade {
  id: string;
  ticker: string;
  company: string;
  reporter: string;
  title: string;
  type: OrderType;
  shares: number;
  price: number;
  value: number;
  date: string;
  month: string;
  category: InsiderCategory;
  source: "edgar" | "demo";
  accession?: string;
}

export interface InsiderFeedResponse {
  trades: InsiderTrade[];
  source: "edgar" | "demo" | "mixed";
  fetchedAt: string;
}

export interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
}

export interface MoversResponse {
  gainers: Mover[];
  losers: Mover[];
  fetchedAt: string;
}