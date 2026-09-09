"use client";

import { useMemo } from "react";
import { Info, Lightbulb } from "lucide-react";
import {
  retirementRollover,
  type FilingStatus,
  type PayTaxFrom,
  type RolloverStrategy,
} from "@/lib/calculators";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import {
  Badge,
  Card,
  CardTitle,
  FieldLabel,
  NumberInput,
  Segmented,
  Select,
} from "@/components/ui";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const STORAGE_KEY = "at:retirement-rollover";

const DEFINITIONS: Array<[string, string]> = [
  [
    "Pre-tax 401(k)",
    "Money that hasn\u2019t been taxed yet. You and your employer put it in tax-free, but you pay income tax when you take it out.",
  ],
  ["Rollover (traditional IRA)", "Moving the 401(k) to an IRA. No tax, no penalty \u2014 it just changes homes while staying pre-tax."],
  [
    "Roth conversion",
    "Moving 401(k) money into a Roth IRA now. You pay income tax on today\u2019s value, but from then on it grows tax-free and comes out tax-free.",
  ],
  [
    "NUA \u2014 Net Unappreciated Asset",
    "A tax break for employer stock that sits inside your 401(k). Take the stock out directly: you only pay income tax on what it originally cost (its \u201cbasis\u201d), and future appreciation is taxed at the lower capital-gains rate.",
  ],
  [
    "Cost basis",
    "What the plan originally paid for the stock \u2014 not what it\u2019s worth today.",
  ],
  ["Long-term capital gains", "The tax rate on investments held more than a year: 0%, 15%, or 20% depending on your income."],
  [
    "\u201CToday\u2019s $\u201D (net)",
    "Future dollars pulled back to today for a fair comparison. Each line shows what the strategy leaves you with, in today\u2019s buying power, after all taxes.",
  ],
];

export default function RetirementRollover() {
  const [inputs, setInputs] = useLocalStorage(STORAGE_KEY, {
    planValue: 111365,
    stockValue: 0,
    stockBasis: 0,
    otherIncome: 1000,
    filing: "single" as FilingStatus,
    growthRate: 7,
    years: 20,
    futureRate: 24,
    ltcgRate: 15,
    strategy: "ladder" as RolloverStrategy,
    ladderTarget: 12,
    payFrom: "cash" as PayTaxFrom,
    age: 45,
  });

  const num = (key: keyof typeof inputs) => (value: string) =>
    setInputs((prev) => ({ ...prev, [key]: Number(value) || 0 }));

  const result = useMemo(() => retirementRollover(inputs as Parameters<typeof retirementRollover>[0]), [inputs]);

  const planLabel = fmtCurrency(inputs.planValue);

  const conversionTax = inputs.strategy === "lump" ? result?.lumpTax ?? 0 : result?.ladderTax ?? 0;
  const best = result?.scenarios.find((s) => s.id === result.recommendedId);

  return (
    <Card className="w-full">
      <CardTitle
        title="Old 401(k)? Where to move it"
        subtitle="Compares the tax-smart ways to handle your former employer's 401(k) — keep it, convert to Roth, or take out company stock (NUA)"
      />

      <p className="mb-4 text-sm leading-relaxed text-muted">
        After you leave a job your 401(k) can stay put, roll into an IRA, or (for employer stock) come out as NUA. This card
        shows what you&apos;d keep after taxes in <span className="text-foreground">{inputs.years}</span> years under each
        approach and highlights the best one. Enter your own facts below, then read the green box.
      </p>

      <details className="mb-4 rounded-md border border-line bg-panel-2/40 px-3 py-2 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-foreground">
          <Info className="mr-1 inline h-3.5 w-3.5 text-accent" /> What do these words mean?
        </summary>
        <ul className="mt-2 flex flex-col gap-2">
          {DEFINITIONS.map(([term, def]) => (
            <li key={term}>
              <span className="font-semibold text-foreground">{term}.</span> {def}
            </li>
          ))}
        </ul>
      </details>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">Step 1 — Your account</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <FieldLabel>Pre-tax 401(k) balance</FieldLabel>
          <NumberInput value={inputs.planValue || ""} onChange={(e) => num("planValue")(e.target.value)} placeholder="111365" />
        </div>
        <div>
          <FieldLabel hint="type 0 if none">Company stock inside plan</FieldLabel>
          <NumberInput value={inputs.stockValue || ""} onChange={(e) => num("stockValue")(e.target.value)} placeholder="0" />
        </div>
        <div>
          <FieldLabel hint="original cost">...and its cost basis</FieldLabel>
          <NumberInput value={inputs.stockBasis || ""} onChange={(e) => num("stockBasis")(e.target.value)} placeholder="0" />
        </div>
        <div>
          <FieldLabel hint="2026 estimate">Other income this year</FieldLabel>
          <NumberInput value={inputs.otherIncome || ""} onChange={(e) => num("otherIncome")(e.target.value)} placeholder="1000" />
          <p className="mt-1 text-[10px] leading-tight text-muted/70">Unemployment checks, interest, side income, dividends.</p>
        </div>
      </div>

      <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-accent">Step 2 — Your tax situation</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <FieldLabel>Filing status</FieldLabel>
          <Select value={inputs.filing} onChange={(e) => setInputs((p) => ({ ...p, filing: e.target.value as FilingStatus }))}>
            <option value="single">Single</option>
            <option value="mfj">Married, filing jointly</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Your age today</FieldLabel>
          <NumberInput value={inputs.age || ""} onChange={(e) => num("age")(e.target.value)} placeholder="45" />
          <p className="mt-1 text-[10px] leading-tight text-muted/70">Used to warn about the 10% early-withdrawal penalty.</p>
        </div>
        <div>
          <FieldLabel hint="%">Expected yearly growth</FieldLabel>
          <NumberInput value={inputs.growthRate || ""} onChange={(e) => num("growthRate")(e.target.value)} placeholder="7" />
          <p className="mt-1 text-[10px] leading-tight text-muted/70">~7% is a common long-term stock-market guess.</p>
        </div>
        <div>
          <FieldLabel>Years until withdrawal</FieldLabel>
          <NumberInput value={inputs.years || ""} onChange={(e) => num("years")(e.target.value)} placeholder="20" />
          <p className="mt-1 text-[10px] leading-tight text-muted/70">Estimate of when you&apos;ll start using this money.</p>
        </div>
        <div>
          <FieldLabel hint="%">Income-tax rate later</FieldLabel>
          <NumberInput value={inputs.futureRate || ""} onChange={(e) => num("futureRate")(e.target.value)} placeholder="24" />
          <p className="mt-1 text-[10px] leading-tight text-muted/70">What you expect to pay on 401(k)/IRA withdrawals in retirement.</p>
        </div>
        <div>
          <FieldLabel hint="%">Capital-gains rate</FieldLabel>
          <Select value={inputs.ltcgRate} onChange={(e) => setInputs((p) => ({ ...p, ltcgRate: Number(e.target.value) }))}>
            <option value={0}>0%</option>
            <option value={15}>15%</option>
            <option value={20}>20%</option>
          </Select>
          <p className="mt-1 text-[10px] leading-tight text-muted/70">Applies to NUA stock and taxable-account gains.</p>
        </div>
      </div>

      <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-accent">Step 3 — How you&apos;d convert to Roth</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <FieldLabel>One time, or spread out?</FieldLabel>
          <Segmented
            value={inputs.strategy}
            onChange={(v) => setInputs((p) => ({ ...p, strategy: v as RolloverStrategy }))}
            options={[
              { value: "lump", label: "All at once" },
              { value: "ladder", label: "Spread over years" },
            ]}
          />
          <p className="mt-1 text-[10px] leading-tight text-muted/70">
            {inputs.strategy === "lump"
              ? "Convert the whole balance this tax year."
              : "A little each year to stay inside a low tax bracket."}
          </p>
        </div>
        {inputs.strategy === "ladder" && (
          <div>
            <FieldLabel hint="max rate">Ladder target bracket</FieldLabel>
            <Select value={inputs.ladderTarget} onChange={(e) => setInputs((p) => ({ ...p, ladderTarget: Number(e.target.value) }))}>
              <option value={10}>10%</option>
              <option value={12}>12%</option>
              <option value={22}>22%</option>
              <option value={24}>24%</option>
            </Select>
            <p className="mt-1 text-[10px] leading-tight text-muted/70">12% is usually the sweet spot when unemployed.</p>
          </div>
        )}
        <div className="col-span-2">
          <FieldLabel>Where does the conversion tax come from?</FieldLabel>
          <Select
            className="max-w-xs"
            value={inputs.payFrom}
            onChange={(e) => setInputs((p) => ({ ...p, payFrom: e.target.value as PayTaxFrom }))}
          >
            <option value="cash">A separate savings/cash account (recommended)</option>
            <option value="conversion">Withheld out of the money being converted</option>
          </Select>
          <p className="mt-1 text-[10px] leading-tight text-muted/70">
            Paying from separate cash is best: withholding from the conversion causes a 10% early-withdrawal penalty if you&apos;re
            under 59\u00bd.
          </p>
        </div>
      </div>

      {result && best ? (
        <>
          <div className="mt-6 rounded-md border border-accent/30 bg-accent/5 p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="text-sm leading-relaxed text-foreground">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-accent">
                  The bottom line — what it means for you
                </span>
                {best.id === "nua" && (
                  <p>
                    Your {fmtCurrency(inputs.planValue)} account contains company stock worth{" "}
                    <span className="font-mono">{fmtCurrency(inputs.stockValue)}</span> that you paid{" "}
                    <span className="font-mono">{fmtCurrency(inputs.stockBasis)}</span> for. The winning move is to pull that
                    stock out into a normal brokerage account: you&apos;ll owe income tax only on the{" "}
                    <span className="font-mono">{fmtCurrency(inputs.stockBasis)}</span> cost in the distribution year, and the{" "}
                    <span className="font-mono">{fmtCurrency(Math.max(0, inputs.stockValue - inputs.stockBasis))}</span> of
                    growth gets taxed at the much lower {inputs.ltcgRate}% capital-gains rate whenever you sell. The rest of
                    the account rolls tax-free into an IRA.
                  </p>
                )}
                {best.id === "keep" && (
                  <p>
                    With your inputs, the smartest thing is to <span className="font-semibold">do nothing</span> — keep the
                    money in the 401(k) (or roll it to a no-fee IRA at Fidelity) and pay no tax now. You avoid paying today&apos;s
                    conversion or distribution tax, and the growth stays untouched until retirement.
                  </p>
                )}
                {(best.id === "rothLump" || best.id === "rothLadder") && (
                  <p>
                    Converting your <span className="font-mono">{planLabel}</span> 401(k) into a <span className="font-semibold">Roth IRA</span>{" "}
                    wins here, because <span className="font-mono">{inputs.filing === "single" ? "you file single with" : "your"} ~{inputs.otherIncome.toLocaleString()} of other 2026 income</span> leaves lots of room in the{" "}
                    {inputs.filing === "single" ? "10–12%" : "10–12%"} brackets. You pay income tax once, now ({" "}
                    <span className="font-mono text-sell">{fmtCurrency(best.taxNow)}</span>), then the money grows and comes
                    out <span className="font-semibold">100% tax-free</span>.
                    {best.id === "rothLadder" && result.ladderYears > 1 ? (
                      <>
                        {" "}Do it as a <span className="font-semibold">ladder</span>: convert about{" "}
                        <span className="font-mono">{fmtCurrency(result.annualConversion)}</span> a year for{" "}
                        <span className="font-mono">{result.ladderYears}</span> years so every dollar stays inside the {inputs.ladderTarget}%
                        bracket — that keeps the total tax bill at <span className="font-mono">{fmtCurrency(result.ladderTax)}</span>{" "}
                        instead of {fmtCurrency(result.lumpTax)} for the one-shot version.
                      </>
                    ) : (
                      <>
                        {" "}You&apos;ve chosen a <span className="font-semibold">one-time</span> conversion this year — effective{" "}
                        {(result.lumpTax / inputs.planValue * 100).toFixed(1)}% total tax.
                      </>
                    )}
                  </p>
                )}
                <p className="mt-2 text-sm">
                  After {inputs.years} years that leaves you around{" "}
                  <span className="font-mono font-semibold text-buy">{fmtCurrency(best.netPresent)}</span> (in today&apos;s
                  dollars) — about{" "}
                  <span className={best.netPresent >= result.keepNetPresent ? "font-mono font-semibold text-buy" : "font-mono font-semibold text-sell"}>
                    {best.netPresent >= result.keepNetPresent ? "+" : ""}
                    {fmtCurrency(best.netPresent - result.keepNetPresent)}
                  </span>{" "}
                  more than just leaving it alone.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-line">
            <div className="flex items-center gap-2 bg-panel-2/60 px-3 py-2 text-[11px] uppercase tracking-wide text-muted">
              <span className="flex-1">Strategy</span>
              <span className="w-20 text-right">Tax now</span>
              <span className="w-20 text-right">Tax later</span>
              <span className="w-28 text-right">You keep (today&apos;s $)</span>
            </div>
            {result.scenarios.map((s) => {
              const rowBest = s.qualified && s.id === result.recommendedId;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 border-t border-line/60 px-3 py-2 first:border-0 ${rowBest ? "bg-accent/5" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{s.label}</span>
                      {rowBest ? <Badge tone="accent">best</Badge> : null}
                      {s.id === "nua" && !s.qualified ? <Badge tone="down">N/A</Badge> : null}
                    </div>
                    <div className="truncate text-[11px] text-muted">{s.detail}</div>
                    {s.note ? <div className="truncate text-[11px] text-amber-300">{s.note}</div> : null}
                  </div>
                  <div className="w-20 text-right font-mono text-xs tabular-nums text-muted">
                    {s.taxNow > 0 ? fmtCurrency(s.taxNow) : "\u2014"}
                  </div>
                  <div className="w-20 text-right font-mono text-xs tabular-nums text-muted">
                    {s.taxLaterDiscounted > 0 ? fmtCurrency(s.taxLaterDiscounted) : "\u2014"}
                  </div>
                  <div className={`w-28 text-right font-mono text-sm tabular-nums ${rowBest ? "font-semibold text-buy" : ""}`}>
                    {s.qualified ? fmtCurrency(s.netPresent) : "\u2014"}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-muted/70">
            \u201CTax later\u201D is the tax built into each \u201CYou keep\u201D amount, in today&apos;s dollars. \u201CYou keep\u201D is the same plan of money at the same growth \u2014 so you can compare strategies just by the biggest number.
          </p>

          <div className="mt-3 space-y-1.5 rounded-md border border-line bg-panel-2/40 p-3 text-sm text-foreground">
            <p>
              <span className="font-semibold">Your conversion, step by step:</span>{" "}
              {inputs.strategy === "ladder" && result.ladderYears > 1
                ? `Convert about ${fmtCurrency(result.annualConversion)} each year for ~${result.ladderYears} years, paying ${fmtCurrency(conversionTax)} total income tax over that time, so every converted dollar stays inside the ${inputs.ladderTarget}% bracket.`
                : `Convert the full ${planLabel} this year, paying ${fmtCurrency(conversionTax)} in income tax up front.`}{" "}
              {inputs.payFrom === "cash"
                ? "Pay that tax from separate savings so none of the conversion is treated as a premature withdrawal."
                : "Be careful: keeping this option still shields you from the 10% penalty only if you\u2019re 59\u00bd or older."}
            </p>
            <p>
              <span className="font-semibold">Tax-free gains room (2026):</span> you can realize about{" "}
              <span className="font-mono text-buy">{fmtCurrency(result.ltcgRoom)}</span> of investment profit at 0% federal
              tax if you do no conversion this year —{" "}
              {result.ltcgRoomWithConversions < result.ltcgRoom ? (
                <>
                  but only <span className="font-mono text-amber-300">{fmtCurrency(result.ltcgRoomWithConversions)}</span> if
                  you convert to Roth this year too, since conversion income fills the same brackets.
                </>
              ) : (
                "an option for your taxable brokerage gains (e.g. HPQ over $29.33/basis, AMD)."
              )}
            </p>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
            Uses estimated 2026 federal brackets (standard deduction {inputs.filing === "single" ? "$15,000" : "$30,000"}, 0%
            long-term gains up to ~{fmtNumber(LTCG_ZERO_TOP[inputs.filing])} of taxable income) and assumes the money grows the
            same in every strategy. NUA is only available for company stock held <span className="font-medium">inside</span> the
            plan. Estimates only — not tax advice.
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-md border border-line bg-panel-2/40 p-3 text-sm text-muted">
          Enter a 401(k) balance above to see which move leaves you with the most after taxes.
        </div>
      )}
    </Card>
  );
}

const LTCG_ZERO_TOP: Record<FilingStatus, number> = { single: 49300, mfj: 98600 };