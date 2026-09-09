export function fmtCurrency(n: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function fmtNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

export function fmtCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtCompactCurrency(n: number): string {
  return "$" + fmtCompact(n);
}

export function fmtSignedPercent(n: number): string {
  const sign = n > 0 ? "+" : "";
  return sign + n.toFixed(2) + "%";
}

export function fmtSignedValue(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return sign + fmtCurrency(n, digits);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function pctChange(close: number, prev: number): number {
  if (!prev) return 0;
  return ((close - prev) / prev) * 100;
}