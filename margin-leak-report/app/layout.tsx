import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModeProvider } from "@/contexts/ModeContext";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Margin Leak Report - Field Operations",
  description: "Track where estimated profit leaks on active jobs - labor, materials & unbilled change orders.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("mlr:theme");var dark=t==="dark"||(t===null&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <ModeProvider>{children}</ModeProvider>
      </body>
    </html>
  );
}
