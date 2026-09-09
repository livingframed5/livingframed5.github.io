"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CircleStop, Play, RotateCcw, Zap } from "lucide-react";
import {
  computeTotal,
  planAutopilot,
  type AutopilotCandidate,
  type AutopilotLogEntry,
} from "@/lib/autopilot";
import { buy as paperBuy, createAccount, DEFAULT_START_CASH, sell as paperSell } from "@/lib/paper";
import type { PaperAccount, PaperHolding, PaperSnapshot } from "@/lib/paper";
import { useQuotes } from "@/hooks/useQuotes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePortfolio } from "@/hooks/usePortfolio";
import AccountChart from "@/components/simulator/AccountChart";
import {
  Button,
  Card,
  CardTitle,
  FieldLabel,
  NumberInput,
  OrderBadge,
  Segmented,
  Spinner,
  Stat,
} from "@/components/ui";
import { cls, fmtCurrency, fmtDateTime, fmtSignedValue } from "@/lib/format";

const ACCOUNT_KEY = "at:autopilot-account";
const SNAPS_KEY = "at:autopilot-snaps";
const START_CASH_KEY = "at:autopilot-start-cash";
const LOG_KEY = "at:autopilot-log";
const RUNNING_KEY = "at:autopilot-running";

const TICK_MS = 5 * 60_000;

type AutopilotMode = "daily" | "intraday";

interface QuoteState {
  account: PaperAccount;
  quotes: ReturnType<typeof useQuotes>["quotes"];
  budgetInput: string;
  target: string;
  stop: string;
  maxHold: string;
  maxPositions: string;
}

export default function Autopilot() {
  const [startCash, setStartCash] = useLocalStorage<number>(START_CASH_KEY, DEFAULT_START_CASH);
  const [account, setAccount] = useLocalStorage<PaperAccount>(ACCOUNT_KEY, () => createAccount(startCash));
  const [snaps, setSnaps] = useLocalStorage<PaperSnapshot[]>(SNAPS_KEY, () => [{ t: Date.now(), v: startCash }]);
  const [log, setLog] = useLocalStorage<AutopilotLogEntry[]>(LOG_KEY, []);
  const [budgetInput, setBudgetInput] = useState(() => String(startCash));
  const [target, setTarget] = useState("12");
  const [stop, setStop] = useState("10");
  const [maxHold, setMaxHold] = useState("20");
  const [maxPositions, setMaxPositions] = useState("5");
  const [running, setRunning] = useLocalStorage<boolean>(RUNNING_KEY, true);
  const [mode, setMode] = useLocalStorage<AutopilotMode>("at:autopilot-mode", "daily");
  const [lastRoundDay, setLastRoundDay] = useLocalStorage<string>("at:autopilot-last-round-day", "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const { mergedHoldings } = usePortfolio();
  const portfolioSymbols = mergedHoldings.map((h) => h.symbol);
  const heldSymbols = mode === "daily" ? portfolioSymbols : account.holdings.map((h) => h.symbol);
  const { quotes } = useQuotes(heldSymbols);

  const live = useRef<QuoteState>({
    account,
    quotes,
    budgetInput,
    target,
    stop,
    maxHold,
    maxPositions,
  });
  useEffect(() => {
    live.current = { account, quotes, budgetInput, target, stop, maxHold, maxPositions };
  });

  const rulesOf = (s: QuoteState) => ({
    targetPct: Number(s.target) || 12,
    stopPct: Number(s.stop) || 10,
    maxHoldDays: Number(s.maxHold) || 20,
    maxPositions: Math.max(1, Math.floor(Number(s.maxPositions) || 5)),
  });

  /** Rebuilds the paper account from your imported portfolio + the day's trading cash. */
  const buildDailyAccount = (budget: number): PaperAccount => {
    const holdings: PaperHolding[] = mergedHoldings
      .filter((h) => h.quantity > 0)
      .map((h) => ({
        symbol: h.symbol,
        shares: h.quantity,
        avgCost: h.costBasis && h.costBasis > 0 ? h.costBasis : h.price && h.price > 0 ? h.price : 0,
      }))
      .filter((h) => h.avgCost > 0);
    const holdingsValue = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
    return {
      cash: budget,
      startCash: budget + holdingsValue,
      holdings,
      trades: [],
      createdAt: Date.now(),
    };
  };

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const tick = async (seed?: PaperAccount) => {
    if (busy) return;
    setBusy(true);
    try {
      const s = live.current;
      const acc0 = seed ?? s.account;
      const quotesBySymbol = new Map(s.quotes.map((q) => [q.symbol, q.price]));

      let candidates: AutopilotCandidate[] = [];
      try {
        const res = await fetch("/api/scanner");
        const data = await res.json();
        candidates = (data.hits ?? []).map((h: AutopilotCandidate) => ({
          symbol: h.symbol,
          price: h.price,
          score: h.score,
          conditions: h.conditions,
        }));
      } catch {
        /* keep empty candidates */
      }

      const plan = planAutopilot(acc0, s.quotes, candidates, rulesOf(s));
      if (plan.length === 0) {
        setLastRun(`No action at ${new Date().toLocaleTimeString()}`);
        return;
      }

      let acc = acc0;
      const entries: AutopilotLogEntry[] = [];
      for (const a of plan) {
        let price = a.price;
        if (a.side === "BUY") {
          try {
            const res = await fetch(`/api/stocks?symbol=${encodeURIComponent(a.symbol)}&range=1d`);
            const d = await res.json();
            if (d?.quote?.price > 0) price = d.quote.price;
          } catch {
            /* fall back to scanner price */
          }
        }
        const res =
          a.side === "BUY"
            ? paperBuy(acc, a.symbol, a.shares, price)
            : paperSell(acc, a.symbol, a.shares, price);
        if (res.error) {
          entries.unshift({
            at: Date.now(),
            side: "SELL",
            symbol: a.symbol,
            shares: a.shares,
            price,
            value: 0,
            note: `Skipped: ${res.error}`,
          });
          continue;
        }
        acc = res.account;
        quotesBySymbol.set(a.symbol, price);
        entries.unshift({
          at: Date.now(),
          side: a.side,
          symbol: a.symbol,
          shares: a.shares,
          price,
          value: a.shares * price,
          note: a.note,
        });
      }
      setAccount(acc);
      setLog((prev) => [...(entries as AutopilotLogEntry[]), ...prev].slice(0, 40));
      setSnaps((prev) => [...prev, { t: Date.now(), v: computeTotal(acc, quotesBySymbol) }].slice(-240));
      setLastRun(
        mode === "daily"
          ? `${today()}: executed ${entries.length} move${entries.length === 1 ? "" : "s"} at ${new Date().toLocaleTimeString()}`
          : `Executed ${entries.length} action${entries.length === 1 ? "" : "s"} at ${new Date().toLocaleTimeString()}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  });

  const runDailyRound = async () => {
    const budget = Math.max(0, Math.round(Number(live.current.budgetInput)) || 0);
    const seed = buildDailyAccount(budget);
    setLastRoundDay(today());
    setSnaps([{ t: Date.now(), v: seed.startCash }]);
    await tickRef.current(seed);
  };
  const dailyRef = useRef(runDailyRound);
  useEffect(() => {
    dailyRef.current = runDailyRound;
  });

  useEffect(() => {
    if (!running) return;
    if (mode === "daily") {
      if (lastRoundDay !== today()) void dailyRef.current();
      const dayCheck = setInterval(() => {
        if (lastRoundDay !== today()) void dailyRef.current();
      }, 60_000);
      return () => clearInterval(dayCheck);
    }
    const t0 = setTimeout(() => void tickRef.current(), 0);
    const timer = setInterval(() => void tickRef.current(), TICK_MS);
    return () => {
      clearTimeout(t0);
      clearInterval(timer);
    };
  }, [running, mode, lastRoundDay]);

  const start = () => {
    const budget = Math.round(Number(budgetInput));
    if (!Number.isFinite(budget) || budget <= 0) {
      setError("Enter a budget greater than 0.");
      return;
    }
    if (account.holdings.length || account.trades.length || budget !== account.startCash) {
      const ok = window.confirm(
        mode === "daily"
          ? `Start today's run with ${fmtCurrency(budget)} of trading cash? This rebuilds the account from your imported portfolio and clears the decision log.`
          : `Start autopilot with ${fmtCurrency(budget)}? This rebuilds the paper account and clears the decision log.`,
      );
      if (!ok) return;
    }
    setStartCash(budget);
    setAccount(createAccount(budget));
    setSnaps([{ t: Date.now(), v: budget }]);
    setLog([]);
    setError(null);
    setLastRun(null);
    setRunning(true);
    if (mode === "daily") {
      setLastRoundDay("");
      void dailyRef.current();
    }
  };

  const pause = () => {
    setRunning(false);
    setLastRun("Autopilot paused.");
  };

  const manualReset = () => {
    const ok = window.confirm(
      mode === "daily"
        ? "Rebuild the account from your current imported portfolio and clear the log?"
        : "Clear the autopilot log and rebuild the account?",
    );
    if (!ok) return;
    if (mode === "daily") {
      const budget = Math.max(0, Math.round(Number(budgetInput)) || 0);
      const seed = buildDailyAccount(budget);
      setAccount(seed);
      setSnaps([{ t: Date.now(), v: seed.startCash }]);
      setLog([]);
      setLastRoundDay(today());
      setError(null);
      setLastRun("Rebuilt from portfolio — run a fresh round when ready.");
      return;
    }
    const budget = account.startCash;
    setAccount(createAccount(budget));
    setSnaps([{ t: Date.now(), v: budget }]);
    setLog([]);
    setError(null);
  };

  const priceBySymbol = new Map(quotes.map((q) => [q.symbol, q.price]));
  const total = computeTotal(account, priceBySymbol);
  const pnl = total - account.startCash;

  return (
    <>
      <Card>
        <CardTitle
          title="Autopilot"
          subtitle={
            mode === "daily"
              ? "I run your portfolio for the day — sells anything at target/stop, then buys the day's best dips with your trading cash"
              : "I manage this paper account for you — transparent dip-buying rules, real prices, logged decisions"
          }
          right={
            <>
              <div className="mr-2">
                <Segmented<AutopilotMode>
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "daily", label: "Daily · my portfolio" },
                    { value: "intraday", label: "Intraday · paper account" },
                  ]}
                />
              </div>
              {running ? (
                <Button variant="danger" onClick={pause}>
                  <CircleStop className="h-4 w-4" /> Stop
                </Button>
              ) : (
                <Button variant="primary" onClick={start}>
                  <Play className="h-4 w-4" /> Start autopilot
                </Button>
              )}
            </>
          }
        />
        <div className="mb-4 grid grid-cols-2 items-end gap-2 rounded-md border border-dashed border-line bg-panel-2/40 p-3 sm:grid-cols-6">
          <div className="col-span-2">
            <FieldLabel>{mode === "daily" ? "Trading cash" : "Budget"}</FieldLabel>
            <NumberInput
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder={mode === "daily" ? "5000" : "1000"}
            />
          </div>
          <div>
            <FieldLabel hint="%">Target</FieldLabel>
            <NumberInput value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div>
            <FieldLabel hint="%">Stop</FieldLabel>
            <NumberInput value={stop} onChange={(e) => setStop(e.target.value)} />
          </div>
          <div>
            <FieldLabel hint="days">Hold</FieldLabel>
            <NumberInput value={maxHold} onChange={(e) => setMaxHold(e.target.value)} />
          </div>
          <div>
            <FieldLabel hint="max">Positions</FieldLabel>
            <NumberInput value={maxPositions} onChange={(e) => setMaxPositions(e.target.value)} />
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {mode === "daily" ? (
            <Button variant="secondary" onClick={() => void dailyRef.current()} disabled={busy}>
              {busy ? <Spinner className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />} Run today&rsquo;s round
            </Button>
          ) : null}
        </div>
        {error ? (
          <div className="mb-3 rounded-md border border-red-800/60 bg-red-500/10 p-2 text-xs text-sell">{error}</div>
        ) : null}
        {lastRun ? (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-line bg-panel-2/50 px-3 py-2 text-xs text-muted">
            {busy ? <Spinner className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5 text-accent" />}
            {lastRun}
          </div>
        ) : null}
        {mode === "daily" ? (
          <p className="text-[11px] leading-relaxed text-muted">
            Daily mode: starts with your imported holdings (at cost basis from your CSV) plus your trading cash.
            Each day it sells anything that hit +{lime(target)}%, −{lime(stop)}%, or the {lime(maxHold)}-day hold, then
            buys today&rsquo;s scanner dips with the freed cash. A fresh round runs automatically each new day — including
            right now when you load the page. Not investment advice.
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed text-muted">
            Strategy: when the Scanner flags a dip (big drop, near 52-week low, oversold, sell-off), buy with spare
            cash; sell at +{lime(target)}%, −{lime(stop)}%, or after {lime(maxHold)} days. Runs every 5 minutes
            automatically — even while you browse other tabs. Rules-based — not a market prediction, not investment
            advice.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle
          title="Performance"
          subtitle={running ? "Autopilot is live" : "Autopilot paused"}
          right={
            <Button variant="secondary" onClick={manualReset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Cash" value={fmtCurrency(account.cash)} />
          <Stat label="Account value" value={fmtCurrency(total)} />
          <Stat label="P&L" value={fmtSignedValue(pnl)} tone={pnl >= 0 ? "up" : "down"} />
          <Stat label="P&L %" value={`${((pnl / account.startCash) * 100).toFixed(2)}%`} tone={pnl >= 0 ? "up" : "down"} />
        </div>
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium text-muted">Account value over time</div>
          <AccountChart snaps={snaps} />
        </div>
      </Card>

      {mode === "daily" ? (
        <Card>
          <CardTitle
            title="Daily holdings"
            subtitle={
              mergedHoldings.length
                ? `${mergedHoldings.length} positions from your imported portfolio · valued at last close`
                : "No imported positions — add one in the Portfolio tab"
            }
          />
          {mergedHoldings.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted">
              Nothing to trade yet. Import your broker&rsquo;s Positions CSV in the Portfolio tab, then this daily run
              will use those holdings as its starting book.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-1 py-2">Symbol</th>
                    <th className="px-1 py-2 text-right">Shares</th>
                    <th className="px-1 py-2 text-right">Est. cost</th>
                    <th className="px-1 py-2 text-right">Last price</th>
                    <th className="px-1 py-2 text-right">Est. value</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedHoldings.map((h) => {
                    const q = quotes.find((x) => x.symbol === h.symbol);
                    const last = q?.price ?? h.price ?? 0;
                    const value = last * h.quantity;
                    return (
                      <tr key={h.symbol} className="border-b border-line/50 last:border-0">
                        <td className="px-1 py-2">
                          <div className="font-mono font-medium">{h.symbol}</div>
                          <div className="truncate text-[10px] text-muted">{h.description || h.symbol}</div>
                        </td>
                        <td className="px-1 py-2 text-right font-mono tabular-nums">{h.quantity}</td>
                        <td className="px-1 py-2 text-right font-mono tabular-nums">
                          {h.costBasis ? fmtCurrency(h.costBasis) : h.price ? fmtCurrency(h.price) : "—"}
                        </td>
                        <td className="px-1 py-2 text-right font-mono tabular-nums">{last > 0 ? fmtCurrency(last) : "—"}</td>
                        <td className="px-1 py-2 text-right font-mono tabular-nums">{value > 0 ? fmtCurrency(value) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      <Card>
        <CardTitle
          title="Decision log"
          subtitle={log.length ? `Last ${log.length} moves` : "Decisions will appear here once autopilot trades"}
          right={log.length ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (window.confirm("Clear the decision log?")) setLog([]);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </Button>
          ) : null}
        />
        {log.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted">No autopilot decisions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-1 py-2">Time</th>
                  <th className="px-1 py-2">Side</th>
                  <th className="px-1 py-2">Symbol</th>
                  <th className="px-1 py-2 text-right">Shares</th>
                  <th className="px-1 py-2 text-right">Price</th>
                  <th className="px-1 py-2 text-right">Value</th>
                  <th className="px-1 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {log.map((e, i) => (
                  <tr key={`${e.at}-${i}`} className="border-b border-line/50 last:border-0">
                    <td className="px-1 py-2 text-xs text-muted">{fmtDateTime(e.at)}</td>
                    <td className="px-1 py-2">
                      <OrderBadge type={e.side} />
                    </td>
                    <td className="px-1 py-2 font-mono font-medium">{e.symbol}</td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">{e.shares}</td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(e.price)}</td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">{e.value ? fmtCurrency(e.value) : "—"}</td>
                    <td className={cls("px-1 py-2 text-xs text-muted", e.note.startsWith("Skipped") && "text-sell")}>
                      {e.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          <Bot className="h-3.5 w-3.5" /> Plumbing: scanner (Yahoo) → rules → simulated fills at the latest price.
        </div>
      </Card>
    </>
  );
}

function lime(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}