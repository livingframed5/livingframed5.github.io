"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { PositionRow } from "@/lib/csv";

export interface PortfolioAccount {
  id: string;
  label: string;
  source: string;
  importedAt: number;
  positions: PositionRow[];
}

export interface MergedHolding {
  symbol: string;
  description: string;
  quantity: number;
  accounts: string[];
  price: number | null;
  costBasis: number | null;
}

const ACCOUNTS_KEY = "at:portfolio-accounts";
const LEGACY_POSITIONS_KEY = "at:positions";

function legacyAccounts(): PortfolioAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_POSITIONS_KEY);
    if (!raw) return [];
    const positions = JSON.parse(raw) as PositionRow[];
    if (!Array.isArray(positions) || positions.length === 0) return [];
    return [
      {
        id: "legacy",
        label: "My account",
        source: "Fidelity",
        importedAt: Date.now(),
        positions,
      },
    ];
  } catch {
    return [];
  }
}

let counter = 0;

export function usePortfolio() {
  const [accounts, setAccounts] = useLocalStorage<PortfolioAccount[]>(ACCOUNTS_KEY, () => {
    const legacy = legacyAccounts();
    return legacy.length ? legacy : [];
  });

  const mergeHeld = useCallback((held: string[]) => {
    setAccounts((prev) =>
      prev.map((a) => ({ ...a, positions: a.positions.filter((p) => held.includes(p.symbol)) })),
    );
  }, [setAccounts]);

  const addAccount = useCallback(
    (account: Omit<PortfolioAccount, "id">) => {
      const id = `acct-${Date.now().toString(36)}-${(counter++).toString(36)}`;
      setAccounts((prev) => {
        const existing = prev.find((a) => a.label.toLowerCase().trim() === account.label.toLowerCase().trim());
        if (existing) {
          return prev.map((a) =>
            a.id === existing.id ? { ...a, ...account, positions: mergePositions(a.positions, account.positions) } : a,
          );
        }
        return [...prev, { ...account, id }];
      });
    },
    [setAccounts],
  );

  const removeAccount = useCallback(
    (id: string) => setAccounts((prev) => prev.filter((a) => a.id !== id)),
    [setAccounts],
  );

  const updateAccount = useCallback(
    (id: string, patch: Partial<Omit<PortfolioAccount, "id">>) =>
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    [setAccounts],
  );

  const removePosition = useCallback(
    (id: string, symbol: string) =>
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, positions: a.positions.filter((p) => p.symbol !== symbol) } : a)),
      ),
    [setAccounts],
  );

  const clearAll = useCallback(() => setAccounts([]), [setAccounts]);

  const mergedHoldings = useMemo(() => {
    const map = new Map<string, MergedHolding>();
    for (const acc of accounts) {
      for (const p of acc.positions) {
        const existing = map.get(p.symbol);
        if (existing) {
          existing.quantity += p.quantity ?? 0;
          if (!existing.accounts.includes(acc.label)) existing.accounts.push(acc.label);
        } else {
          map.set(p.symbol, {
            symbol: p.symbol,
            description: p.description,
            quantity: p.quantity ?? 0,
            accounts: [acc.label],
            price: p.price ?? null,
            costBasis: p.costBasis ?? p.price ?? null,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [accounts]);

  const holdingSymbols = useMemo(() => mergedHoldings.map((h) => h.symbol), [mergedHoldings]);

  return {
    accounts,
    mergedHoldings,
    holdingSymbols,
    addAccount,
    removeAccount,
    updateAccount,
    removePosition,
    clearAll,
    mergeHeld,
  };
}

function mergePositions(a: PositionRow[], b: PositionRow[]): PositionRow[] {
  const map = new Map(a.map((p) => [p.symbol, p]));
  for (const p of b) {
    const existing = map.get(p.symbol);
    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + (p.quantity ?? 0);
    } else {
      map.set(p.symbol, p);
    }
  }
  return Array.from(map.values());
}