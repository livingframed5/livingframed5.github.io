export interface PositionSizingInput {
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
}

export interface PositionSizingResult {
  riskAmount: number;
  riskPerShare: number;
  shares: number;
  positionValue: number;
  positionPct: number;
  maxLoss: number;
  breakeven: number;
}

export function positionSizing(input: PositionSizingInput): PositionSizingResult | null {
  const { accountBalance, riskPercent, entryPrice, stopLoss } = input;
  if (!(accountBalance > 0) || !(riskPercent > 0) || !(entryPrice > 0) || !(stopLoss > 0)) return null;
  const riskAmount = (accountBalance * riskPercent) / 100;
  const riskPerShare = entryPrice - stopLoss;
  if (riskPerShare <= 0) return null;
  const shares = Math.floor(riskAmount / riskPerShare);
  if (shares < 1) return null;
  const positionValue = shares * entryPrice;
  const breakeven = entryPrice + (riskAmount * 0.001) / shares;
  return {
    riskAmount,
    riskPerShare,
    shares,
    positionValue,
    positionPct: (positionValue / accountBalance) * 100,
    maxLoss: shares * riskPerShare,
    breakeven,
  };
}

export interface Lot {
  id: string;
  shares: number;
  price: number;
}

export interface CostBasisInput {
  lots: Lot[];
  currentPrice: number | null;
}

export interface CostBasisResult {
  totalShares: number;
  totalCost: number;
  blendedAvgPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  breakeven: number;
}

export function costBasis(input: CostBasisInput): CostBasisResult | null {
  const { lots, currentPrice } = input;
  const valid = lots.filter((l) => l.shares > 0 && l.price > 0);
  if (valid.length === 0) return null;
  const totalShares = valid.reduce((s, l) => s + l.shares, 0);
  const totalCost = valid.reduce((s, l) => s + l.shares * l.price, 0);
  const blendedAvgPrice = totalCost / totalShares;
  const commissionPerShare = 4 / totalShares;
  const breakeven = blendedAvgPrice + commissionPerShare;
  const currentValue = currentPrice != null && currentPrice > 0 ? totalShares * currentPrice : 0;
  const unrealizedPnl = currentValue - totalCost;
  return {
    totalShares,
    totalCost,
    blendedAvgPrice,
    currentValue,
    unrealizedPnl,
    unrealizedPnlPct: totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0,
    breakeven,
  };
}

export interface CopyTradeResult {
  ticker: string;
  mirrorShares: number;
  mirrorCost: number;
  currentPrice: number | null;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  dayPnlPct: number | null;
}

export function copyTrade(
  ticker: string,
  insiderPrice: number,
  mirrorShares: number,
  currentPrice: number | null,
  changePct: number | null,
): CopyTradeResult | null {
  if (!(mirrorShares > 0) || !(insiderPrice > 0)) return null;
  const mirrorCost = insiderPrice * mirrorShares;
  let unrealizedPnl = 0;
  let unrealizedPnlPct = 0;
  let dayPnlPct: number | null = null;
  if (currentPrice != null && currentPrice > 0) {
    unrealizedPnl = (currentPrice - insiderPrice) * mirrorShares;
    unrealizedPnlPct = (unrealizedPnl / mirrorCost) * 100;
  }
  if (changePct != null) dayPnlPct = changePct;
  return {
    ticker,
    mirrorShares,
    mirrorCost,
    currentPrice,
    currentValue: currentPrice != null ? mirrorShares * currentPrice : 0,
    unrealizedPnl,
    unrealizedPnlPct,
    dayPnlPct,
  };
}

export type FilingStatus = "single" | "mfj";

export type RolloverStrategy = "lump" | "ladder";

export type PayTaxFrom = "cash" | "conversion";

export interface RetirementRolloverInput {
  planValue: number;
  stockValue: number;
  stockBasis: number;
  otherIncome: number;
  filing: FilingStatus;
  growthRate: number;
  years: number;
  futureRate: number;
  ltcgRate: number;
  strategy: RolloverStrategy;
  ladderTarget: number;
  payFrom: PayTaxFrom;
  age: number;
}

export interface RolloverScenario {
  id: "keep" | "rothLump" | "rothLadder" | "nua";
  label: string;
  detail: string;
  qualified: boolean;
  taxNow: number;
  taxLaterDiscounted: number;
  netPresent: number;
  effectiveRate: number;
  note?: string;
}

export interface RetirementRolloverResult {
  scenarios: RolloverScenario[];
  recommendedId: string | null;
  keepNetPresent: number;
  annualConversion: number;
  ladderYears: number;
  lumpTax: number;
  ladderTax: number;
  marginalRateUsed: number;
  ltcgRoom: number;
  ltcgRoomWithConversions: number;
}

const RATES_2026: Record<FilingStatus, Array<{ top: number; rate: number }>> = {
  single: [
    { top: 11925, rate: 0.10 },
    { top: 48475, rate: 0.12 },
    { top: 103350, rate: 0.22 },
    { top: 197300, rate: 0.24 },
    { top: 250525, rate: 0.32 },
    { top: 626350, rate: 0.35 },
    { top: Infinity, rate: 0.37 },
  ],
  mfj: [
    { top: 23850, rate: 0.10 },
    { top: 96950, rate: 0.12 },
    { top: 206700, rate: 0.22 },
    { top: 394600, rate: 0.24 },
    { top: 501050, rate: 0.32 },
    { top: 751600, rate: 0.35 },
    { top: Infinity, rate: 0.37 },
  ],
};

const STD_DEDUCTION: Record<FilingStatus, number> = { single: 15000, mfj: 30000 };

const LTCG_ZERO_TOP: Record<FilingStatus, number> = { single: 49300, mfj: 98600 };

export function ordinaryTax(taxable: number, filing: FilingStatus): number {
  if (taxable <= 0) return 0;
  const brackets = RATES_2026[filing];
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (taxable <= prev) break;
    const width = Math.min(taxable, b.top) - prev;
    if (width > 0) tax += width * b.rate;
    prev = b.top;
  }
  return tax;
}

export function bracketTopAtRate(rate: number, filing: FilingStatus): number {
  const b = RATES_2026[filing].find((x) => x.rate === rate);
  return b ? b.top : 0;
}

export function retirementRollover(input: RetirementRolloverInput): RetirementRolloverResult | null {
  if (!(input.planValue > 0)) return null;

  const {
    planValue,
    stockValue,
    stockBasis,
    otherIncome,
    filing,
    growthRate,
    years,
    futureRate,
    ltcgRate,
    strategy,
    ladderTarget,
    payFrom,
    age,
  } = input;

  const g = growthRate > 0 ? growthRate / 100 : 0;
  const discount = Math.pow(1 + g, years);
  const std = STD_DEDUCTION[filing];
  const baseTaxable = Math.max(otherIncome - std, 0);

  const incrementalOrdinary = (amount: number) => {
    if (amount <= 0) return 0;
    return ordinaryTax(baseTaxable + amount, filing) - ordinaryTax(baseTaxable, filing);
  };

  const lumpTax = incrementalOrdinary(planValue);

  const capacity = Math.max(0, bracketTopAtRate(ladderTarget, filing) - baseTaxable);
  let ladderYears: number;
  let annualConversion: number;
  if (capacity > 0) {
    ladderYears = Math.ceil(planValue / capacity);
    annualConversion = planValue / ladderYears;
  } else {
    ladderYears = 1;
    annualConversion = planValue;
  }
  const annualTax = incrementalOrdinary(annualConversion);
  const ladderTax = ladderYears * annualTax;

  const scenarios: RolloverScenario[] = [];

  const keepNetPresent = planValue * (1 - futureRate / 100);
  scenarios.push({
    id: "keep",
    label: "Keep in 401(k) / roll to IRA",
    detail: "No tax now; taxed later at assumed rate",
    qualified: true,
    taxNow: 0,
    taxLaterDiscounted: planValue * (futureRate / 100),
    netPresent: keepNetPresent,
    effectiveRate: futureRate,
  });

  const penalty =
    payFrom === "conversion" && age > 0 && age < 59.5
      ? "Withholding from the conversion triggers a 10% early-distribution penalty on the withheld amount (under 59\u00bd)."
      : undefined;

  const bothRothTax = strategy === "lump" ? lumpTax : ladderTax;
  const rothLumpDetail =
    strategy === "lump"
      ? `Lump-sum converted this year at ~${((lumpTax / planValue) * 100).toFixed(1)}% effective`
      : "One-time conversion for comparison";
  scenarios.push({
    id: "rothLump",
    label: "Roth conversion (lump sum)",
    detail: rothLumpDetail,
    qualified: true,
    taxNow: lumpTax,
    taxLaterDiscounted: 0,
    netPresent: planValue - lumpTax,
    effectiveRate: (lumpTax / planValue) * 100,
    note: penalty,
  });

  scenarios.push({
    id: "rothLadder",
    label: "Roth conversion (ladder)",
    detail:
      capacity > 0
        ? `\u2248${annualConversion > 0 ? "$" + annualConversion.toFixed(0) : "0"}/yr \u00d7 ${ladderYears} yr(s) at \u2264${ladderTarget}%`
        : `\u2264${ladderTarget}% bracket full \u2014 same as lump sum`,
    qualified: true,
    taxNow: bothRothTax,
    taxLaterDiscounted: 0,
    netPresent: planValue - bothRothTax,
    effectiveRate: (bothRothTax / planValue) * 100,
    note: penalty,
  });

  const nuaQualified = stockValue > 0 && stockBasis > 0 && stockValue <= planValue;
  if (nuaQualified) {
    const basisTax = incrementalOrdinary(stockBasis);
    const nonStock = planValue - stockValue;
    const nonStockNet = nonStock * (1 - futureRate / 100);
    const proceeds = stockValue * discount;
    const gain = proceeds - stockBasis;
    const gainTax = gain > 0 ? gain * (ltcgRate / 100) : 0;
    const netFutureStock = proceeds - gainTax;
    const netPresentStock = netFutureStock / discount;
    const nonStockTaxDiscounted = nonStock * (futureRate / 100);
    const stockTaxDiscounted = gainTax / discount;
    scenarios.push({
      id: "nua",
      label: "NUA (distribute stock in-kind)",
      detail: `Basis taxed now; ${stockBasis < stockValue ? "appreciation taxed at LT cap-gains on sale" : "no appreciation above basis \u2014 NUA not valuable"}`,
      qualified: true,
      taxNow: basisTax,
      taxLaterDiscounted: nonStockTaxDiscounted + stockTaxDiscounted,
      netPresent: nonStockNet + netPresentStock - basisTax,
      effectiveRate: stockValue > 0 ? ((planValue - (nonStockNet + netPresentStock - basisTax)) / planValue) * 100 : 0,
      note: stockBasis >= stockValue ? "NUA only helps when the stock has appreciated above basis." : undefined,
    });
  } else {
    scenarios.push({
      id: "nua",
      label: "NUA (distribute stock in-kind)",
      detail: "Requires employer stock held inside the plan",
      qualified: false,
      taxNow: 0,
      taxLaterDiscounted: 0,
      netPresent: keepNetPresent,
      effectiveRate: 0,
      note: "No employer stock in plan \u2014 NUA does not apply.",
    });
  }

  const qualified = scenarios.filter((s) => s.qualified);
  const best = qualified.reduce<RolloverScenario | null>(
    (acc, s) => (acc === null || s.netPresent > acc.netPresent ? s : acc),
    null,
  );

  const yearOneConversion = strategy === "lump" ? planValue : annualConversion;
  const ltcgRoom = Math.max(0, LTCG_ZERO_TOP[filing] - baseTaxable);
  const ltcgRoomWithConversions = Math.max(0, LTCG_ZERO_TOP[filing] - Math.max(otherIncome + yearOneConversion - std, 0));

  return {
    scenarios,
    recommendedId: best ? best.id : null,
    keepNetPresent,
    annualConversion,
    ladderYears,
    lumpTax,
    ladderTax,
    marginalRateUsed: capacity > 0 ? ladderTarget : 0,
    ltcgRoom,
    ltcgRoomWithConversions,
  };
}