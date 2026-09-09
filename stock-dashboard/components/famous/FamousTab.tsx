"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crown, Pause, Play, Plus, Zap } from "lucide-react";
import { computeTotal } from "@/lib/autopilot";
import {
  FAMOUS_PERSONAS,
  planPersona,
  type FamousPersona,
  type FamousSide,
} from "@/lib/famous";
import { buy as paperBuy, createAccount, DEFAULT_START_CASH, sell as paperSell } from "@/lib/paper";
import type { PaperAccount, PaperSnapshot } from "@/lib/paper";
import { useQuotes } from "@/hooks/useQuotes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import AccountChart from "@/components/simulator/AccountChart";
import {
  Button,
  Card,
  CardTitle,
  FieldLabel,
  NumberInput,
  OrderBadge,
  Spinner,
  Stat,
} from "@/components/ui";
import { cls, fmtCurrency, fmtDateTime, fmtSignedValue } from "@/lib/format";

const TICK_MS = 60_000;

interface FamousLogEntry {
  at: number;
  personaId: string;
  personaName: string;
  side: FamousSide;
  symbol: string;
  shares: number;
  price: number;
  value: number;
  note: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function FamousSim({
  persona,
  live,
  onSetLive,
}: {
  persona: FamousPersona;
  live: boolean;
  onSetLive: (v: boolean) => void;
}) {
  const key = `at:famous-${persona.id}`;
  const [startCash, setStartCash] = useLocalStorage<number>(`${key}-cash`, DEFAULT_START_CASH);
  const [account, setAccount] = useLocalStorage<PaperAccount>(`${key}-account`, () => createAccount(startCash));
  const [snaps, setSnaps] = useLocalStorage<PaperSnapshot[]>(`${key}-snaps`, () => [{ t: Date.now(), v: startCash }]);
  const [log, setLog] = useLocalStorage<FamousLogEntry[]>(`${key}-log`, []);
  const [budgetInput, setBudgetInput] = useState(() => String(startCash));
  const [runNonce, setRunNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const { quotes } = useQuotes(persona.universe);

  const liveRef = useRef({ account, budgetInput });
  useEffect(() => {
    liveRef.current = { account, budgetInput };
  });

  const tickRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    tickRef.current = async () => {
      if (busy) return;
      setBusy(true);
      try {
        const s = liveRef.current;
        const priceMap = new Map(quotes.map((q) => [q.symbol, q.price]));
        const actions = planPersona(persona, s.account, quotes);
        if (actions.length === 0) {
          setLastRun(`No move at ${new Date().toLocaleTimeString()}`);
          return;
        }
        let acc = s.account;
        const entries: FamousLogEntry[] = [];
        for (const a of actions) {
          const res =
            a.side === "BUY"
              ? paperBuy(acc, a.symbol, a.shares, a.price)
              : paperSell(acc, a.symbol, a.shares, a.price);
          if (res.error) {
            entries.unshift({
              at: Date.now(),
              personaId: persona.id,
              personaName: persona.name,
              side: "SELL",
              symbol: a.symbol,
              shares: a.shares,
              price: a.price,
              value: 0,
              note: `Skipped: ${res.error}`,
            });
            continue;
          }
          acc = res.account;
          priceMap.set(a.symbol, a.price);
          entries.unshift({
            at: Date.now(),
            personaId: persona.id,
            personaName: persona.name,
            side: a.side,
            symbol: a.symbol,
            shares: a.shares,
            price: a.price,
            value: a.shares * a.price,
            note: a.note,
          });
        }
        setAccount(acc);
        setLog((prev) => [...(entries as FamousLogEntry[]), ...prev].slice(0, 40));
        setSnaps((prev) => [...prev, { t: Date.now(), v: computeTotal(acc, priceMap) }].slice(-240));
        setError(null);
        setLastRun(
          `${persona.name} made ${entries.length} move${entries.length === 1 ? "" : "s"} at ${new Date().toLocaleTimeString()}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Simulation tick failed.");
      } finally {
        setBusy(false);
      }
    };
  }, [busy, persona, quotes, setAccount, setLog, setSnaps]);

  useEffect(() => {
    if (!live) return;
    const t0 = setTimeout(() => void tickRef.current(), 100);
    const timer = setInterval(() => void tickRef.current(), TICK_MS);
    return () => {
      clearTimeout(t0);
      clearInterval(timer);
    };
  }, [live, runNonce]);

  const start = () => {
    const budget = Math.round(Number(budgetInput));
    if (!Number.isFinite(budget) || budget <= 0) {
      setError("Enter a budget greater than 0.");
      return;
    }
    if (account.holdings.length || account.trades.length || budget !== account.startCash) {
      const ok = window.confirm(
        `Start following ${persona.name} with ${fmtCurrency(budget)}? This rebuilds their copy account and clears the feed.`,
      );
      if (!ok) return;
    }
    setStartCash(budget);
    setAccount(createAccount(budget));
    setSnaps([{ t: Date.now(), v: budget }]);
    setLog([]);
    setBudgetInput(String(budget));
    setError(null);
    setLastRun(null);
    onSetLive(true);
    setRunNonce((n) => n + 1);
  };

  const priceBySymbol = new Map(quotes.map((q) => [q.symbol, q.price]));
  const total = computeTotal(account, priceBySymbol);
  const pnl = total - account.startCash;

  return (
    <>
      <Card>
        <CardTitle
          title={persona.name}
          subtitle={persona.title}
          right={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => onSetLive(!live)} disabled={busy}>
                {live ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {live ? "Pause" : "Resume"}
              </Button>
              <Button variant="primary" onClick={start}>
                <Play className="h-3.5 w-3.5" /> Start following
              </Button>
            </div>
          }
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm font-semibold text-accent">
              {initials(persona.name)}
            </div>
            <div>
              <p className="text-sm text-foreground">{persona.tagline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {persona.universe.map((s) => (
                  <span key={s} className="rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-64">
            <div>
              <FieldLabel>Budget</FieldLabel>
              <NumberInput value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="100000" />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => void tickRef.current()} disabled={!live || busy}>
                {busy ? <Spinner className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />} Run now
              </Button>
            </div>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-md border border-red-800/60 bg-red-500/10 p-2 text-xs text-sell">{error}</div>
        ) : null}
        {lastRun ? (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-line bg-panel-2/50 px-3 py-2 text-xs text-muted">
            {busy ? <Spinner className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5 text-accent" />}
            {lastRun}
          </div>
        ) : null}
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          <Crown className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
          Simulated moves inspired by {persona.name}&rsquo;s publicly known investing style — not their actual trades.
          For education &amp; entertainment, not investment advice.
        </p>
      </Card>

      <Card>
        <CardTitle
          title={`Copy account — following ${persona.name}`}
          subtitle={live ? "Live · re-evaluates every minute while this tab is open" : "Paused"}
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

      <Card>
        <CardTitle
          title="Trade feed"
          subtitle={log.length ? `Last ${log.length} moves` : "Their moves will appear here while you follow"}
        />
        {log.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted">No moves yet — resumes will show here with a reason.</div>
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
      </Card>
    </>
  );
}

export default function FamousTab() {
  const [viewing, setViewing] = useLocalStorage<string>("at:famous-selected", FAMOUS_PERSONAS[0].id);
  const [following, setFollowing] = useLocalStorage<string[]>("at:famous-following", []);
  const [claimed, setClaimed] = useLocalStorage<string[]>("at:famous-claimed", []);
  const persona = FAMOUS_PERSONAS.find((p) => p.id === viewing) ?? FAMOUS_PERSONAS[0];

  const toggleFollow = (id: string) => {
    setClaimed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setFollowing((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const mountedIds = Array.from(new Set([...following, ...claimed, persona.id]));
  const mounted = FAMOUS_PERSONAS.filter((p) => mountedIds.includes(p.id));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 text-sm font-semibold tracking-tight">
            Choose who to follow <span className="font-normal text-muted">· each keeps its own account</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {FAMOUS_PERSONAS.map((p) => {
              const isFollowing = following.includes(p.id);
              const isViewing = p.id === persona.id;
              return (
                <div
                  key={p.id}
                  className={cls(
                    "flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
                    isViewing
                      ? "border-accent/60 bg-accent/10"
                      : isFollowing
                        ? "border-accent/30 bg-panel"
                        : "border-line bg-panel hover:border-accent/40",
                  )}
                >
                  <button type="button" onClick={() => setViewing(p.id)} className="text-left">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] font-semibold text-accent">
                        {initials(p.name)}
                      </div>
                      <div className="text-sm font-medium">{p.name}</div>
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-muted">{p.title}</div>
                  </button>
                  {isViewing ? (
                    <button
                      type="button"
                      onClick={() => toggleFollow(p.id)}
                      className={cls(
                        "inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                        isFollowing
                          ? "border-accent/50 bg-accent/15 text-accent"
                          : "border-line bg-panel-2 text-muted hover:text-foreground",
                      )}
                    >
                      {isFollowing ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-1 rounded-md border border-line bg-panel-2 px-2 py-1.5 text-[11px] text-muted">
                      {isFollowing ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-buy" />
                          <span>Following</span>
                        </>
                      ) : (
                        <span>Click to view</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {mounted.map((p) => (
          <div key={p.id} className={p.id === persona.id ? "" : "hidden"}>
            <FamousSim
              persona={p}
              live={following.includes(p.id)}
              onSetLive={(v) => {
                setClaimed((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
                setFollowing((prev) => (v ? (prev.includes(p.id) ? prev : [...prev, p.id]) : prev.filter((x) => x !== p.id)));
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
