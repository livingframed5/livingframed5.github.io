"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FlaskConical, Play, RotateCcw, Wallet } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buy as paperBuy, createAccount, DEFAULT_START_CASH, sell as paperSell } from "@/lib/paper";
import type { PaperAccount, PaperSnapshot } from "@/lib/paper";
import { BUY_RULES, type BacktestPoint, type BacktestResult, type BuyRule } from "@/lib/backtest";
import { useQuotes } from "@/hooks/useQuotes";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import AccountChart from "@/components/simulator/AccountChart";
import {
  Button,
  Card,
  CardTitle,
  FieldLabel,
  NumberInput,
  OrderBadge,
  Segmented,
  Select,
  Spinner,
  Stat,
  TextInput,
} from "@/components/ui";
import { cls, fmtCurrency, fmtDateTime, fmtSignedValue } from "@/lib/format";

const ACCOUNT_KEY = "at:paper-account";
const SNAPS_KEY = "at:paper-snaps";
const START_CASH_KEY = "at:paper-start-cash";

type Mode = "paper" | "backtest";

function EquityTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: BacktestPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <div className="rounded-md border border-line bg-panel-2 px-3 py-2 text-xs shadow-lg">
      <div className="text-muted">{p.t}</div>
      <div className="flex flex-col gap-0.5">
        <div>
          Strategy <span className="font-mono tabular-nums">{p.strategy.toFixed(3)}×</span>
        </div>
        <div>
          Buy &amp; hold <span className="font-mono tabular-nums">{p.buyHold.toFixed(3)}×</span>
        </div>
      </div>
    </div>
  );
}

export default function SimulatorTab() {
  const [mode, setMode] = useState<Mode>("paper");
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "paper", label: "Paper Trading", icon: <Wallet className="h-3.5 w-3.5" /> },
          { value: "backtest", label: "Backtester", icon: <FlaskConical className="h-3.5 w-3.5" /> },
        ]}
      />
      {mode === "paper" ? <PaperTrading /> : <Backtester />}
    </div>
  );
}

function PaperTrading() {
  const [startCash, setStartCash] = useLocalStorage<number>(START_CASH_KEY, DEFAULT_START_CASH);
  const [account, setAccount] = useLocalStorage<PaperAccount>(ACCOUNT_KEY, () => createAccount(startCash));
  const [snaps, setSnaps] = useLocalStorage<PaperSnapshot[]>(SNAPS_KEY, () => [{ t: Date.now(), v: startCash }]);
  const [buySymbol, setBuySymbol] = useState("");
  const [buyShares, setBuyShares] = useState("");
  const [buyError, setBuyError] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
  const [sellQty, setSellQty] = useState<Record<string, string>>({});
  const [sellFor, setSellFor] = useState<string | null>(null);
  const [capInput, setCapInput] = useState(() => String(startCash));
  const [notice, setNotice] = useState<string | null>(null);

  const heldSymbols = useMemo(() => account.holdings.map((h) => h.symbol), [account.holdings]);
  const { quotes } = useQuotes(heldSymbols);

  const buySym = buySymbol.trim().toUpperCase();
  const { quote: buyQuote } = useLiveQuote(buySym || null);

  const totals = useMemo(() => {
    let holdingsValue = 0;
    let dayPnl = 0;
    let unrealized = 0;
    for (const h of account.holdings) {
      const q = quotes.find((x) => x.symbol === h.symbol);
      const price = q?.price ?? h.avgCost;
      holdingsValue += price * h.shares;
      if (q) dayPnl += (price - q.previousClose) * h.shares;
      unrealized += (price - h.avgCost) * h.shares;
    }
    return {
      holdingsValue,
      dayPnl,
      unrealized,
      total: holdingsValue + account.cash,
      pnl: holdingsValue + account.cash - account.startCash,
    };
  }, [account, quotes]);

  const lastTotal = useRef(totals.total);
  useEffect(() => {
    lastTotal.current = totals.total;
  }, [totals.total]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSnaps((prev) => [...prev, { t: Date.now(), v: lastTotal.current }].slice(-240));
    }, 60_000);
    return () => clearInterval(timer);
  }, [setSnaps]);

  const placeBuy = (e: FormEvent) => {
    e.preventDefault();
    const price = buyQuote?.price;
    if (!buySym || !price || price <= 0) {
      setBuyError("Enter a valid ticker and wait for its price to load.");
      return;
    }
    const shares = Number(buyShares);
    const res = paperBuy(account, buySym, shares, price);
    if (res.error) {
      setBuyError(res.error);
      return;
    }
    setAccount(res.account);
    setBuyError(null);
    setSellError(null);
    setNotice(null);
    setBuySymbol("");
    setBuyShares("");
  };

  const placeSell = (symbol: string) => {
    const holding = account.holdings.find((h) => h.symbol === symbol);
    const q = quotes.find((x) => x.symbol === symbol);
    const price = q?.price ?? holding?.avgCost ?? 0;
    const shares = Number(sellQty[symbol]);
    const res = paperSell(account, symbol, shares, price);
    if (res.error) {
      setSellError(res.error);
      return;
    }
    setAccount(res.account);
    setSellQty((prev) => ({ ...prev, [symbol]: "" }));
    setSellFor(null);
    setSellError(null);
    setNotice(null);
  };

  const applyStartCash = () => {
    const cash = Math.round(Number(capInput));
    if (!Number.isFinite(cash) || cash <= 0) {
      setNotice("Enter a starting capital greater than 0.");
      return;
    }
    if (cash === account.startCash) {
      setNotice(`Account is already sized at ${fmtCurrency(cash)}.`);
      return;
    }
    if (account.holdings.length || account.trades.length) {
      if (
        !window.confirm(
          `Rebuild the account with ${fmtCurrency(cash)} starting capital? Current holdings and trade history will be cleared.`,
        )
      ) {
        return;
      }
    }
    setAccount(createAccount(cash));
    setSnaps([{ t: Date.now(), v: cash }]);
    setStartCash(cash);
    setCapInput(String(cash));
    setSellFor(null);
    setSellQty({});
    setBuyError(null);
    setSellError(null);
    setNotice(`Rebuilt account with ${fmtCurrency(cash)} starting capital.`);
  };

  const reset = () => {
    if (!window.confirm("Reset the paper account? Cash, holdings, and trade history will be cleared.")) return;
    setAccount(createAccount(startCash));
    setSnaps([{ t: Date.now(), v: startCash }]);
    setSellFor(null);
    setSellQty({});
    setNotice(null);
  };

  return (
    <>
      <Card>
        <CardTitle
          title="Paper Trading"
          subtitle="Virtual account at live market prices — practice without real money"
          right={
            <Button variant="secondary" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          }
        />
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-line bg-panel-2/40 p-3">
          <div className="w-44">
            <FieldLabel>Starting capital</FieldLabel>
            <NumberInput
              value={capInput}
              onChange={(e) => setCapInput(e.target.value)}
              placeholder="1000"
            />
          </div>
          <Button variant="secondary" onClick={applyStartCash}>
            Apply
          </Button>
          <p className="w-full text-[11px] leading-relaxed text-muted">
            Size the simulated account to your budget — applying rebuilds the account with fresh cash.
          </p>
        </div>
        {notice ? (
          <div className="mb-3 rounded-md border border-accent/40 bg-accent/5 p-2 text-xs text-accent">{notice}</div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Cash" value={fmtCurrency(account.cash)} />
          <Stat label="Holdings" value={fmtCurrency(totals.holdingsValue)} />
          <Stat label="Account value" value={fmtCurrency(totals.total)} />
          <Stat
            label="Total P&L"
            value={fmtSignedValue(totals.pnl)}
            tone={totals.pnl >= 0 ? "up" : "down"}
          />
          <Stat
            label="P&L %"
            value={`${((totals.pnl / account.startCash) * 100).toFixed(2)}%`}
            tone={totals.pnl >= 0 ? "up" : "down"}
          />
          <Stat
            label="Day P&L"
            value={fmtSignedValue(totals.dayPnl)}
            tone={totals.dayPnl >= 0 ? "up" : "down"}
          />
        </div>

        <div className="mt-5">
          <div className="mb-1.5 text-xs font-medium text-muted">Account value over time</div>
          <AccountChart snaps={snaps} />
        </div>

        <form onSubmit={placeBuy} className="mt-5 grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <div>
            <FieldLabel hint={buyQuote?.price ? `live ${fmtCurrency(buyQuote.price)}` : "waiting…"}>
              Buy ticker
            </FieldLabel>
            <TextInput
              value={buySymbol}
              onChange={(e) => setBuySymbol(e.target.value)}
              placeholder="NVDA"
              className="font-mono"
            />
          </div>
          <div>
            <FieldLabel>Shares</FieldLabel>
            <NumberInput
              value={buyShares}
              onChange={(e) => setBuyShares(e.target.value)}
              placeholder="10"
            />
          </div>
          <Button variant="primary" type="submit">
            Buy
          </Button>
          <Button variant="secondary" onClick={() => setBuyError(null)} className="hidden sm:inline-flex">
            Clear
          </Button>
        </form>
        {buyError ? (
          <div className="mt-2 rounded-md border border-red-800/60 bg-red-500/10 p-2 text-xs text-sell">{buyError}</div>
        ) : null}
        {sellError ? (
          <div className="mt-2 rounded-md border border-red-800/60 bg-red-500/10 p-2 text-xs text-sell">{sellError}</div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-1 py-2">Symbol</th>
                <th className="px-1 py-2 text-right">Shares</th>
                <th className="px-1 py-2 text-right">Avg cost</th>
                <th className="px-1 py-2 text-right">Last</th>
                <th className="px-1 py-2 text-right">Value</th>
                <th className="px-1 py-2 text-right">Unrealized</th>
                <th className="px-1 py-2 text-right">Day</th>
                <th className="px-1 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {account.holdings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-1 py-6 text-center text-xs text-muted">
                    No positions. Buy something above to start.
                  </td>
                </tr>
              ) : (
                account.holdings.map((h) => {
                  const q = quotes.find((x) => x.symbol === h.symbol);
                  const price = q?.price ?? h.avgCost;
                  const value = price * h.shares;
                  const unreal = (price - h.avgCost) * h.shares;
                  const day = q ? (price - q.previousClose) * h.shares : 0;
                  return (
                    <tr key={h.symbol} className="border-b border-line/50 last:border-0">
                      <td className="px-1 py-2 font-mono font-medium">{h.symbol}</td>
                      <td className="px-1 py-2 text-right font-mono tabular-nums">{h.shares}</td>
                      <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(h.avgCost)}</td>
                      <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(price)}</td>
                      <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(value)}</td>
                      <td className={cls("px-1 py-2 text-right font-mono tabular-nums", unreal >= 0 ? "text-buy" : "text-sell")}>
                        {fmtSignedValue(unreal)}
                      </td>
                      <td className="px-1 py-2 text-right font-mono tabular-nums text-muted">{fmtSignedValue(day)}</td>
                      <td className="px-1 py-2 text-right">
                        {sellFor === h.symbol ? (
                          <span className="inline-flex items-center gap-1.5">
                            <NumberInput
                              value={sellQty[h.symbol] ?? ""}
                              onChange={(e) => setSellQty((prev) => ({ ...prev, [h.symbol]: e.target.value }))}
                              placeholder={`≤ ${h.shares}`}
                              className="w-20 px-2 py-1 text-xs"
                            />
                            <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => placeSell(h.symbol)}>
                              Sell
                            </Button>
                          </span>
                        ) : (
                          <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => setSellFor(h.symbol)}>
                            Sell
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle title="Trade log" subtitle={`${account.trades.length} trades`} />
        {account.trades.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted">No trades yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-1 py-2">Time</th>
                  <th className="px-1 py-2">Side</th>
                  <th className="px-1 py-2">Symbol</th>
                  <th className="px-1 py-2 text-right">Shares</th>
                  <th className="px-1 py-2 text-right">Price</th>
                  <th className="px-1 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {account.trades.slice(0, 25).map((t) => (
                  <tr key={t.id} className="border-b border-line/50 last:border-0">
                    <td className="px-1 py-2 text-xs text-muted">{fmtDateTime(t.at)}</td>
                    <td className="px-1 py-2">
                      <OrderBadge type={t.side} />
                    </td>
                    <td className="px-1 py-2 font-mono font-medium">{t.symbol}</td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">{t.shares}</td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(t.price)}</td>
                    <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(t.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Backtester() {
  const [symbol, setSymbol] = useState("NVDA");
  const [rule, setRule] = useState<BuyRule>("oversold");
  const [target, setTarget] = useState("10");
  const [stop, setStop] = useState("8");
  const [maxHold, setMaxHold] = useState("30");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (e?: FormEvent) => {
    e?.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/backtest?symbol=${encodeURIComponent(sym)}&rule=${rule}&target=${target || 10}&stop=${stop || 8}&maxHold=${maxHold || 30}`,
      );
      const data = await res.json();
      if (!res.ok || !data.result) throw new Error(data.error ?? "No history");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardTitle
          title="Historical Backtester"
          subtitle="Replay a buy rule over the last year of real daily prices — your conditions, simulated fills"
        />
        <form onSubmit={run} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <FieldLabel>Ticker</FieldLabel>
            <TextInput value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="NVDA" className="font-mono" />
          </div>
          <div>
            <FieldLabel>Entry rule</FieldLabel>
            <Select value={rule} onChange={(e) => setRule(e.target.value as BuyRule)}>
              {BUY_RULES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel hint="%">Sell target</FieldLabel>
            <NumberInput value={target} onChange={(e) => setTarget(e.target.value)} placeholder="10" />
          </div>
          <div>
            <FieldLabel hint="%">Stop loss</FieldLabel>
            <NumberInput value={stop} onChange={(e) => setStop(e.target.value)} placeholder="8" />
          </div>
          <div>
            <FieldLabel hint="days">Max hold</FieldLabel>
            <NumberInput value={maxHold} onChange={(e) => setMaxHold(e.target.value)} placeholder="30" />
          </div>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} Run backtest
          </Button>
        </form>
        {error ? (
          <div className="mt-3 rounded-md border border-red-800/60 bg-red-500/10 p-2 text-xs text-sell">{error}</div>
        ) : null}
      </Card>

      {result ? <BacktestResults result={result} /> : null}
    </>
  );
}

function BacktestResults({ result }: { result: BacktestResult }) {
  return (
    <>
      <Card>
        <CardTitle
          title={`${result.symbol} — ${BUY_RULES.find((r) => r.code === result.buyRule)?.label}`}
          subtitle={`Sell at +${result.targetPct}% · stop at −${result.stopPct}% · max hold ${result.maxHoldDays} days · ${result.trades.length} trades`}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label="Win rate"
            value={
              <span>
                {result.winRate.toFixed(0)}% <span className="text-[10px] text-muted"> ({result.trades.filter((t) => t.retPct > 0).length}W/{result.trades.filter((t) => t.retPct <= 0).length}L)</span>
              </span>
            }
          />
          <Stat
            label="Strategy return"
            value={`${result.totalReturnPct.toFixed(2)}%`}
            tone={result.totalReturnPct >= 0 ? "up" : "down"}
          />
          <Stat
            label="Buy &amp; hold"
            value={`${result.buyHoldPct.toFixed(2)}%`}
            tone={result.buyHoldPct >= 0 ? "up" : "down"}
          />
          <Stat label="Max drawdown" value={`${result.maxDrawdownPct.toFixed(2)}%`} tone="down" />
          <Stat label="Best trade" value={`${Math.max(...result.trades.map((t) => t.retPct)).toFixed(2)}%`} tone="up" />
          <Stat label="Worst trade" value={`${Math.min(...result.trades.map((t) => t.retPct)).toFixed(2)}%`} tone="down" />
        </div>
        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.equity}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                axisLine={{ stroke: "var(--line)" }}
                tickLine={false}
                tickFormatter={(v) => v.slice(5)}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toFixed(2)}
                width={40}
              />
              <Tooltip content={<EquityTooltip />} />
              <Line type="monotone" dataKey="strategy" stroke="var(--accent)" strokeWidth={1.5} dot={false} name="strategy" isAnimationActive={false} />
              <Line type="monotone" dataKey="buyHold" stroke="var(--muted)" strokeWidth={1.5} dot={false} name="buyHold" strokeDasharray="4 4" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1 w-4 rounded bg-accent" /> Strategy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1 w-4 rounded bg-muted" /> Buy &amp; hold
          </span>
        </div>
      </Card>

      <Card>
        <CardTitle title="Trades" subtitle="Simulated fills at that day's close" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-1 py-2">Entry</th>
                <th className="px-1 py-2">Exit</th>
                <th className="px-1 py-2 text-right">Entry</th>
                <th className="px-1 py-2 text-right">Exit</th>
                <th className="px-1 py-2 text-right">Return</th>
              </tr>
            </thead>
            <tbody>
              {result.trades.map((t, i) => (
                <tr key={`${t.entryDate}-${i}`} className="border-b border-line/50 last:border-0">
                  <td className="px-1 py-2 text-xs text-muted">{t.entryDate}</td>
                  <td className="px-1 py-2 text-xs text-muted">{t.exitDate}</td>
                  <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(t.entry)}</td>
                  <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(t.exit)}</td>
                  <td className={cls("px-1 py-2 text-right font-mono tabular-nums", t.retPct >= 0 ? "text-buy" : "text-sell")}>
                    {t.retPct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}