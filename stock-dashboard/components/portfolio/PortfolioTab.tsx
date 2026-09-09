"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileUp, Plus, ShieldAlert, Trash2, UploadCloud } from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { usePortfolio } from "@/hooks/usePortfolio";
import { parseCsv, parsePositions, type PositionRow } from "@/lib/csv";
import {
  Button,
  Card,
  CardTitle,
  ChangeText,
  EmptyState,
  NumberInput,
  Select,
  TextInput,
} from "@/components/ui";
import { cls, fmtCurrency, fmtDateTime } from "@/lib/format";

const SOURCES = ["Fidelity", "Vanguard", "Schwab", "Fidelity (husband)", "Other"];

export default function PortfolioTab() {
  const {
    accounts,
    mergedHoldings,
    addAccount,
    removeAccount,
    removePosition,
    clearAll,
  } = usePortfolio();
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseInfo, setParseInfo] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("My account");
  const [sourceInput, setSourceInput] = useState("Fidelity");
  const [manualAccount, setManualAccount] = useState<string>("");
  const [manualSymbol, setManualSymbol] = useState("");
  const [manualQty, setManualQty] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const symbols = mergedHoldings.map((h) => h.symbol);
  const { quotes, loading, refreshedAt } = useQuotes(symbols);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = parsePositions(parseCsv(String(reader.result ?? "")));
      if (result.error || result.positions.length === 0) {
        setParseError(result.error ?? "No positions found in this file.");
        setParseInfo(null);
        return;
      }
      const label = labelInput.trim() || `Imported ${new Date().toLocaleDateString()}`;
      addAccount({ label, source: sourceInput, importedAt: Date.now(), positions: result.positions });
      setParseError(null);
      setParseInfo(`Imported ${result.positions.length} position${result.positions.length === 1 ? "" : "s"} into "${label}".`);
    };
    reader.readAsText(file);
  };

  const addManual = (e: FormEvent) => {
    e.preventDefault();
    const sym = manualSymbol.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
    const qty = parseFloat(manualQty);
    if (!sym || !Number.isFinite(qty) || qty <= 0) return;
    const label = manualAccount.trim() || labelInput.trim() || "My account";
    addAccount({
      label,
      source: sourceInput,
      importedAt: Date.now(),
      positions: [{ symbol: sym, description: sym, quantity: qty, price: null, marketValue: null, costBasis: null }],
    });
    setManualSymbol("");
    setManualQty("");
    setParseError(null);
    setParseInfo(`Added ${sym} (${qty} sh) to "${label}".`);
  };

  const quoteOf = (symbol: string) => quotes.find((q) => q.symbol === symbol);

  const rowsOf = (positions: PositionRow[]) =>
    positions.map((p) => {
      const q = quoteOf(p.symbol);
      const qty = p.quantity ?? 0;
      const last = q?.price ?? p.price ?? 0;
      const prev = q?.previousClose ?? last;
      const value = last * qty;
      const dayPnl = q ? (last - prev) * qty : null;
      return { position: p, quote: q, last, prev, value, dayPnl };
    });

  const totals = accounts.reduce(
    (t, acc) => {
      for (const r of rowsOf(acc.positions)) {
        t.value += r.value;
        if (r.dayPnl != null) t.day += r.dayPnl;
      }
      return t;
    },
    { value: 0, day: 0 },
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Card>
        <CardTitle
          title="Portfolio"
          subtitle={
            accounts.length > 0
              ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} · ${mergedHoldings.length} holdings · ${
                  refreshedAt ? "Updated " + fmtDateTime(refreshedAt) : ""
                }`
              : "Track your holdings — import as many accounts as you like"
          }
          right={
            <div className="flex gap-3">
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted">Value</div>
                <div className="font-mono text-lg font-semibold tabular-nums">{fmtCurrency(totals.value)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted">Day P&L</div>
                <div className={cls("font-mono text-lg font-semibold tabular-nums", totals.day >= 0 ? "text-buy" : "text-sell")}>
                  {fmtCurrency(totals.day)}
                </div>
              </div>
              {loading ? <div className="animate-pulse text-xs text-muted">…</div> : null}
            </div>
          }
        />

        <div className="mb-4 flex flex-col gap-3 rounded-md border border-dashed border-line bg-panel-2/40 p-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-muted">Account name (imports merge by name)</label>
              <TextInput value={labelInput} onChange={(e) => setLabelInput(e.target.value)} placeholder="My account" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted">Broker / source</label>
              <Select value={sourceInput} onChange={(e) => setSourceInput(e.target.value)}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/comma-separated-values"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = "";
              }}
            />
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              <UploadCloud className="h-4 w-4" /> Import CSV
            </Button>
            {accounts.length > 0 ? (
              <Button variant="danger" onClick={() => clearAll()}>
                <Trash2 className="h-4 w-4" /> Clear all
              </Button>
            ) : null}
          </div>
        </div>

        <form onSubmit={addManual} className="mb-4 flex flex-wrap items-end gap-2">
          <div className="w-44">
            <label className="mb-1 block text-[11px] text-muted">Account</label>
            <Select value={manualAccount} onChange={(e) => setManualAccount(e.target.value)}>
              <option value="">{labelInput || "My account"}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.label}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <label className="mb-1 block text-[11px] text-muted">Ticker</label>
            <TextInput
              value={manualSymbol}
              onChange={(e) => setManualSymbol(e.target.value)}
              placeholder="AAPL"
              className="font-mono"
            />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-[11px] text-muted">Shares</label>
            <NumberInput value={manualQty} onChange={(e) => setManualQty(e.target.value)} placeholder="10" />
          </div>
          <Button variant="secondary" onClick={addManual} type="submit">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>

        <div className="mb-3 flex items-center gap-2 text-[11px] text-muted">
          <ShieldAlert className="h-3.5 w-3.5" />
          Import each account&rsquo;s Positions CSV separately &mdash; they stay labeled, but live quotes and totals combine
          across all of them. Everything stays in your browser.
        </div>

        {parseError ? (
          <div className="mb-4 rounded-md border border-red-800/60 bg-red-500/10 p-3 text-xs text-sell">{parseError}</div>
        ) : null}
        {parseInfo ? (
          <div className="mb-4 rounded-md border border-emerald-800/60 bg-emerald-500/10 p-3 text-xs text-buy">
            {parseInfo}
          </div>
        ) : null}
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            title="No accounts yet"
            subtitle="Import a Positions CSV above (Fidelity, Vanguard, Schwab, …) or add a ticker manually"
          />
        </Card>
      ) : (
        accounts.map((acc) => {
          const rows = rowsOf(acc.positions);
          const accValue = rows.reduce((a, r) => a + r.value, 0);
          const accDay = rows.reduce((a, r) => a + (r.dayPnl ?? 0), 0);
          return (
            <Card key={acc.id}>
              <CardTitle
                title={
                  <span>
                    {acc.label} <span className="ml-2 font-normal text-muted">{acc.source}</span>
                  </span>
                }
                subtitle={`${acc.positions.length} positions · imported ${fmtDateTime(acc.importedAt)}`}
                right={
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide text-muted">Value</div>
                      <div className="font-mono text-sm font-semibold tabular-nums">{fmtCurrency(accValue)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide text-muted">Day P&L</div>
                      <div className={cls("font-mono text-sm font-semibold tabular-nums", accDay >= 0 ? "text-buy" : "text-sell")}>
                        {fmtCurrency(accDay)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (typeof window !== "undefined" && window.confirm(`Remove "${acc.label}"?`)) removeAccount(acc.id);
                      }}
                      aria-label={`Remove ${acc.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="px-1 py-2">Symbol</th>
                      <th className="px-1 py-2 text-right">Shares</th>
                      <th className="px-1 py-2 text-right">Last</th>
                      <th className="px-1 py-2 text-right">Day</th>
                      <th className="px-1 py-2 text-right">Value</th>
                      <th className="px-1 py-2 text-right">Day P&L</th>
                      <th className="px-1 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-1 py-4 text-center text-xs text-muted">
                          No positions in this account.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.position.symbol} className="border-b border-line/50 last:border-0">
                          <td className="px-1 py-2">
                            <span className="font-mono font-medium">{r.position.symbol}</span>
                            <span className="ml-2 hidden max-w-48 truncate text-[11px] text-muted lg:inline">
                              {r.position.description}
                            </span>
                          </td>
                          <td className="px-1 py-2 text-right font-mono tabular-nums">{r.position.quantity}</td>
                          <td className="px-1 py-2 text-right font-mono tabular-nums">
                            {r.last > 0 ? fmtCurrency(r.last) : "—"}
                          </td>
                          <td className="px-1 py-2 text-right">
                            {r.quote ? <ChangeText value={r.quote.changePercent} /> : <span className="text-muted">—</span>}
                          </td>
                          <td className="px-1 py-2 text-right font-mono tabular-nums">{fmtCurrency(r.value)}</td>
                          <td
                            className={cls(
                              "px-1 py-2 text-right font-mono tabular-nums",
                              (r.dayPnl ?? 0) >= 0 ? "text-buy" : "text-sell",
                            )}
                          >
                            {r.dayPnl != null ? fmtCurrency(r.dayPnl) : "—"}
                          </td>
                          <td className="px-1 py-2 text-right">
                            <button
                              type="button"
                              aria-label={`Remove ${r.position.symbol}`}
                              onClick={() => removePosition(acc.id, r.position.symbol)}
                              className="text-muted/50 hover:text-sell"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })
      )}

      <Card>
        <CardTitle title="Safe ways to connect your brokers" right={<FileUp className="h-4 w-4 text-muted" />} />
        <Steps
          title="1 · CSV import (what this tab uses)"
          body="Export each account's Positions CSV from fidelity.com, vanguard.com, schwab.com etc. and import it above. Read-only, no credentials leave your browser. Re-importing the same name merges/updates that account."
        />
        <Steps
          title="2 · Read-only fintech links (Plaid, etc.)"
          body="Apps like Monarch/Personal Capital can connect multiple brokers read-only via Plaid. It is bank-grade but needs its own signup, and only exposes balances/transactions — most brokers have no official personal API."
        />
        <Steps
          title="3 · Avoid"
          body="Never paste broker passwords into unofficial scraping scripts or third-party tools — you'll violate their terms and risk your account. Keep 2FA / voice verification enabled."
        />
      </Card>
    </div>
  );
}

function Steps({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-b border-line/50 py-2.5 last:border-0">
      <div className="text-xs font-medium text-foreground">{title}</div>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}