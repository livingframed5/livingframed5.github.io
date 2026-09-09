"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Bot, Briefcase, Calculator, Crown, ListOrdered, Radar, ScanSearch, Wallet } from "lucide-react";
import WatchlistTab from "@/components/watchlist/WatchlistTab";
import InsiderFeedTab from "@/components/insiders/InsiderFeedTab";
import CalculatorsTab from "@/components/calculators/CalculatorsTab";
import PortfolioTab from "@/components/portfolio/PortfolioTab";
import ScannerTab from "@/components/scanner/ScannerTab";
import SimulatorTab from "@/components/simulator/SimulatorTab";
import Autopilot from "@/components/simulator/Autopilot";
import FamousTab from "@/components/famous/FamousTab";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cls } from "@/lib/format";
import type { InsiderTrade } from "@/lib/types";

const DEFAULT_WATCHLIST = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN"];

type Tab = "watchlist" | "insiders" | "calculators" | "portfolio" | "scanner" | "simulator" | "autopilot" | "famous";

const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: "watchlist", label: "Watchlist", icon: <ListOrdered className="h-4 w-4" /> },
  { id: "insiders", label: "Insider Feed", icon: <Radar className="h-4 w-4" /> },
  { id: "scanner", label: "Scanner", icon: <ScanSearch className="h-4 w-4" /> },
  { id: "simulator", label: "Simulator", icon: <Wallet className="h-4 w-4" /> },
  { id: "autopilot", label: "Autopilot", icon: <Bot className="h-4 w-4" /> },
  { id: "famous", label: "Famous Trades", icon: <Crown className="h-4 w-4" /> },
  { id: "portfolio", label: "Portfolio", icon: <Briefcase className="h-4 w-4" /> },
  { id: "calculators", label: "Calculators", icon: <Calculator className="h-4 w-4" /> },
];

export default function Terminal() {
  const [tab, setTab] = useLocalStorage<Tab>("at:tab", "watchlist");
  const [symbols, setSymbols] = useLocalStorage<string[]>("at:watchlist", DEFAULT_WATCHLIST);
  const [copyPrefill, setCopyPrefill] = useState<InsiderTrade | null>(null);

  const emptySubscribe = () => () => {};
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <div className="slide-up flex flex-1 flex-col">
      <nav className="sticky top-14 z-30 border-b border-line bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-1 px-4 pt-2 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cls(
                "inline-flex items-center gap-2 rounded-t-md border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-line bg-panel text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="flex-1">
        {!mounted ? (
          <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-24 sm:px-6">
            <div className="text-xs text-muted">Loading…</div>
          </div>
        ) : tab === "watchlist" ? (
          <WatchlistTab symbols={symbols} setSymbols={setSymbols} />
        ) : tab === "insiders" ? (
          <InsiderFeedTab
            onCopyTrade={(trade) => {
              setCopyPrefill(trade);
              setTab("calculators");
            }}
          />
        ) : tab === "scanner" ? (
          <ScannerTab />
        ) : tab === "simulator" ? (
          <SimulatorTab />
        ) : tab === "famous" ? (
          <FamousTab />
        ) : tab === "portfolio" ? (
          <PortfolioTab />
        ) : tab === "calculators" ? (
          <CalculatorsTab prefill={copyPrefill} onConsumePrefill={() => setCopyPrefill(null)} />
        ) : null}

        <div className={cls("autopilot-host", tab !== "autopilot" && "hidden")}>
          <Autopilot />
        </div>
      </div>
    </div>
  );
}