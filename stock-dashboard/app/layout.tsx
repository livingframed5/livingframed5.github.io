import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CandlestickChart } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alpha Terminal — Stock, Insider & Portfolio Suite",
  description:
    "Trading terminal: live watchlist quotes and charts, insider & congressional trade feed, a heuristic market scanner with alerts, portfolio tracking via CSV import, and position calculators.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("at:theme");var dark=t==="dark"||(t===null&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15 text-accent">
                  <CandlestickChart className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-tight">Alpha Terminal</div>
                  <div className="text-[11px] text-muted">Markets · Insider Filings · Portfolio</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="hidden items-center gap-1.5 sm:flex">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                  <span>Data: Yahoo Finance · SEC EDGAR</span>
                </span>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
          <footer className="border-t border-line py-4 text-center text-[11px] text-muted">
            Not investment advice. Quotes may be delayed. Data courtesy of Yahoo Finance & SEC EDGAR.
          </footer>
        </div>
      </body>
    </html>
  );
}