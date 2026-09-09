"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui";

const KEY = "at:theme";

export default function ThemeToggle() {
  return (
    <Button
      variant="secondary"
      aria-label="Toggle light / dark theme"
      title="Toggle light / dark theme"
      onClick={() => {
        const root = document.documentElement;
        const dark = root.classList.toggle("dark");
        try {
          localStorage.setItem(KEY, dark ? "dark" : "light");
        } catch {
          /* ignore */
        }
      }}
      className="!h-8 !w-8 !p-0"
    >
      <Sun className="h-4 w-4 theme-icon-dark" />
      <Moon className="h-4 w-4 theme-icon-light" />
    </Button>
  );
}