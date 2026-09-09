import type { InsiderTrade, InsiderCategory, OrderType } from "./types";
import { DEMO_INSIDER_TRADES } from "./data/insiderTrades";

const SEC_UA = "StockDashboard contact@example.com";

const EDGAR_API = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE = "https://www.sec.gov/Archives/edgar/data";

const HOT_TICKERS = [
  "NVDA",
  "META",
  "AMZN",
  "TSLA",
  "MSFT",
  "AAPL",
  "PLTR",
  "COIN",
  "SOFI",
  "F",
  "MU",
  "LLY",
  "BAC",
  "GS",
  "CVX",
  "COST",
  "WMT",
  "NIO",
];

const SEARCH_WINDOW_DAYS = 45;
const MAX_FILINGS = 28;
const CONCURRENCY = 4;
const FEED_TTL_MS = 15 * 60 * 1000;

interface SearchHit {
  id?: string;
  adsh?: string;
  file_date?: string;
  display_names?: string[];
}

interface SearchResponse {
  hits?: {
    hits?: Array<{ _id?: string; _source?: SearchHit }>;
  };
}

interface FetchableHit {
  ticker: string;
  adsh: string;
  primaryDoc: string;
}

const xml = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

function textBetween(input: string, start: string, end: string): string | null {
  const i = input.indexOf(start);
  if (i === -1) return null;
  const j = input.indexOf(end, i + start.length);
  return j === -1 ? null : input.slice(i + start.length, j);
}

/** Form 4 XML wraps numeric/date values in a nested <value> element. */
function innerValue(input: string, tag: string): string {
  const outer = textBetween(input, `<${tag}>`, `</${tag}>`);
  if (outer == null) return "";
  const v = textBetween(outer, "<value>", "</value>");
  return v == null ? outer : v;
}

interface ParsedForm4 {
  issuerName: string;
  issuerSymbol: string;
  reporter: string;
  title: string;
  category: InsiderCategory;
  transactions: Array<{ type: OrderType; shares: number; price: number; date: string }>;
}

function parseForm4(body: string): ParsedForm4 | null {
  const issuerName = textBetween(body, "<issuerName>", "</issuerName>");
  const issuerSymbol = textBetween(body, "<issuerTradingSymbol>", "</issuerTradingSymbol>");
  const reporter = textBetween(body, "<rptOwnerName>", "</rptOwnerName>");
  if (!issuerSymbol || !reporter) return null;

  const officerTitle = textBetween(body, "<officerTitle>", "</officerTitle>");
  const isDirector = textBetween(body, "<isDirector>", "</isDirector>") === "1";
  const isOfficer = textBetween(body, "<isOfficer>", "</isOfficer>") === "1";
  const isTenPercent = textBetween(body, "<isTenPercentOwner>", "</isTenPercentOwner>") === "1";
  let title = "Reporting Owner";
  if (officerTitle) title = xml(officerTitle);
  else if (isOfficer) title = "Officer";
  else if (isDirector) title = "Director";
  else if (isTenPercent) title = "10% Owner";

  const transactions: ParsedForm4["transactions"] = [];
  const chunks = body.split("<nonDerivativeTransaction>").slice(1);
  for (const chunk of chunks) {
    const code = textBetween(chunk, "<transactionCode>", "</transactionCode>");
    if (code !== "P" && code !== "S" && code !== "F") continue;
    const type: OrderType = code === "P" ? "BUY" : "SELL";
    const shares = parseFloat(innerValue(chunk, "transactionShares"));
    const price = parseFloat(innerValue(chunk, "transactionPricePerShare"));
    const date = innerValue(chunk, "transactionDate");
    if (!shares || !date) continue;
    transactions.push({ type, shares, price, date });
  }

  return {
    issuerName: xml(issuerName ?? ""),
    issuerSymbol: xml(issuerSymbol),
    reporter: xml(reporter),
    title,
    category: "corporate",
    transactions,
  };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": SEC_UA, Accept: "*/*" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function searchForm4s(ticker: string, days: number): Promise<FetchableHit[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const url =
    `${EDGAR_API}?q=${encodeURIComponent(`"${ticker}"`)}&forms=4` +
    `&dateRange=custom&startdt=${start.toISOString().slice(0, 10)}&enddt=${end.toISOString().slice(0, 10)}`;
  const res = await fetchText(url);
  const data = JSON.parse(res) as SearchResponse;
  const hits: FetchableHit[] = [];
  for (const h of data.hits?.hits ?? []) {
    const src = h._source ?? {};
    const adsh = src.adsh ?? h._id?.split(":")[0];
    const primaryDoc = h._id?.split(":")[1];
    if (!adsh || !primaryDoc) continue;
    hits.push({ ticker, adsh, primaryDoc });
    if (hits.length >= MAX_FILINGS) break;
  }
  return hits;
}

function filingUrl(hit: FetchableHit): string {
  const cik = hit.adsh.split("-")[0].replace(/^0+/, "");
  return `${EDGAR_ARCHIVE}/${cik}/${hit.adsh.replace(/-/g, "")}/${hit.primaryDoc}`;
}

let feedCache: { trades: InsiderTrade[]; expiresAt: number } | null = null;

export async function fetchEdgarFeed(): Promise<InsiderTrade[]> {
  if (feedCache && Date.now() < feedCache.expiresAt) return feedCache.trades;
  const trades = await buildEdgarFeed();
  feedCache = { trades, expiresAt: Date.now() + FEED_TTL_MS };
  return trades;
}

async function buildEdgarFeed(): Promise<InsiderTrade[]> {
  const jobs: FetchableHit[] = [];
  for (const ticker of HOT_TICKERS) {
    try {
      const hits = await searchForm4s(ticker, SEARCH_WINDOW_DAYS);
      for (const h of hits) {
        jobs.push(h);
        if (jobs.length >= MAX_FILINGS) break;
      }
    } catch {
      /* ignore ticker-level search failures */
    }
    if (jobs.length >= MAX_FILINGS) break;
  }

  const trades: InsiderTrade[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        const body = await fetchText(filingUrl(job));
        const parsed = parseForm4(body);
        if (!parsed) continue;
        for (const t of parsed.transactions) {
          trades.push({
            id: `edgar-${job.adsh}-${t.date}-${t.type}-${t.shares}`,
            ticker: parsed.issuerSymbol || job.ticker,
            company: parsed.issuerName || job.ticker,
            reporter: parsed.reporter,
            title: parsed.title,
            type: t.type,
            shares: t.shares,
            price: t.price,
            value: t.price * t.shares,
            date: t.date,
            month: t.date.slice(0, 7),
            category: parsed.category,
            source: "edgar",
            accession: job.adsh,
          });
        }
      } catch {
        /* skip malformed filings */
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const buyCount = trades.filter((t) => t.type === "BUY").length;
  if (buyCount < 2) {
    trades.push(...DEMO_INSIDER_TRADES.filter((t) => t.type === "BUY").slice(0, 10).map((t) => ({ ...t })));
  }

  if (trades.length === 0) return DEMO_INSIDER_TRADES.map((t) => ({ ...t }));
  return trades
    .filter((t) => t.shares > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 140);
}