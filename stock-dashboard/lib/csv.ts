export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export interface PositionRow {
  symbol: string;
  description: string;
  quantity: number | null;
  price: number | null;
  marketValue: number | null;
  costBasis: number | null;
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/['".]/g, "");
}

const SYMBOL_KEYS = ["symbol", "ticker", "symbol identifier", "security symbol"];
const QTY_KEYS = ["quantity", "qty", "shares"];
const PRICE_KEYS = ["last price", "market price", "price", "current price", "close price"];
const VALUE_KEYS = ["mkt value", "market value", "value", "mkt val"];
const DESC_KEYS = ["security name", "description", "name"];
const COST_KEYS = ["cost basis", "cost price", "costbasis"];

function headerScore(cells: string[]): number {
  let score = 0;
  for (const c of cells) {
    const n = norm(c);
    if (SYMBOL_KEYS.some((k) => n.includes(k))) score += 5;
    if (QTY_KEYS.some((k) => n.includes(k))) score += 5;
    if (PRICE_KEYS.some((k) => n.includes(k))) score += 3;
    if (VALUE_KEYS.some((k) => n.includes(k))) score += 3;
    if (COST_KEYS.some((k) => n.includes(k))) score += 2;
  }
  return score;
}

/** A viable header must actually contain a symbol AND a quantity column. */
function isHeader(cells: string[]): boolean {
  const n = cells.map(norm);
  const hasSymbol = n.some((c) => SYMBOL_KEYS.some((k) => c.includes(k)));
  const hasQty = n.some((c) => QTY_KEYS.some((k) => c.includes(k)));
  return hasSymbol && hasQty;
}

function findIndex(cells: string[], keys: string[]): number {
  const n = cells.map(norm);
  for (const key of keys) {
    const idx = n.findIndex((c) => c === key);
    if (idx >= 0) return idx;
  }
  for (const key of keys) {
    const idx = n.findIndex((c) => c.includes(key));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parsePositions(rows: string[][]): { positions: PositionRow[]; error?: string } {
  let headerIdx = -1;
  let bestScore = 0;
  rows.forEach((cells, i) => {
    if (!isHeader(cells)) return;
    const s = headerScore(cells);
    if (s > bestScore) {
      bestScore = s;
      headerIdx = i;
    }
  });

  if (headerIdx < 0) {
    return {
      positions: [],
      error:
        "Could not find expected columns (Symbol, Quantity, Price / Market Value). Export positions from Fidelity as CSV/Excel and try again.",
    };
  }

  const header = rows[headerIdx].map(norm);
  const symIdx = findIndex(header, SYMBOL_KEYS);
  const qtyIdx = findIndex(header, QTY_KEYS);
  const priceIdx = findIndex(header, PRICE_KEYS);
  const valueIdx = findIndex(header, VALUE_KEYS);
  const descIdx = findIndex(header, DESC_KEYS);
  const costIdx = findIndex(header, COST_KEYS);

  if (symIdx < 0 || qtyIdx < 0) {
    return {
      positions: [],
      error: `Missing required columns (found headers: ${rows[headerIdx].join(", ")}).`,
    };
  }

  const positions: PositionRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.length <= symIdx) continue;
    const symbol = cells[symIdx].trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
    if (!symbol) continue;
    const quantity = parseNumber(qtyIdx >= 0 ? (cells[qtyIdx] ?? "") : "");
    if (!quantity) continue;
    const price = parseNumber(priceIdx >= 0 ? (cells[priceIdx] ?? "") : "");
    const marketValue = parseNumber(valueIdx >= 0 ? (cells[valueIdx] ?? "") : "");
    const fallbackPrice = marketValue && quantity ? marketValue / quantity : null;
    positions.push({
      symbol,
      description: descIdx >= 0 ? cells[descIdx] ?? "" : symbol,
      quantity,
      price: price ?? fallbackPrice,
      marketValue: marketValue ?? (price ? price * quantity : null),
      costBasis: costIdx >= 0 ? parseNumber(cells[costIdx] ?? "") : null,
    });
  }

  return { positions };
}