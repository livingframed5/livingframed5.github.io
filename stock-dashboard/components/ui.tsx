"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { cls } from "@/lib/format";
import type { OrderType } from "@/lib/types";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cls("rounded-lg border border-line bg-panel p-4 shadow-sm", className)}>{children}</div>
  );
}

export function CardTitle({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: "up" | "down" }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cls(
          "mt-0.5 truncate font-mono text-sm font-medium tabular-nums",
          tone === "up" && "text-buy",
          tone === "down" && "text-sell",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "up" | "down" | "accent" | "warn";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-panel-2 text-muted",
    up: "border-emerald-800/60 bg-emerald-500/10 text-buy",
    down: "border-red-800/60 bg-red-500/10 text-sell",
    accent: "border-sky-800/60 bg-sky-500/10 text-accent",
    warn: "border-amber-700/60 bg-amber-500/10 text-amber-300",
  };
  return (
    <span
      className={cls(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function OrderBadge({ type }: { type: OrderType }) {
  return <Badge tone={type === "BUY" ? "up" : "down"}>{type}</Badge>;
}

export function ChangeText({ value, digits = 2 }: { value: number; digits?: number }) {
  const up = value >= 0;
  return (
    <span className={cls("font-mono tabular-nums", up ? "text-buy" : "text-sell")}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(digits)}
      {digits === 2 && "%"}
    </span>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 block">
      <span className="text-xs font-medium text-muted">{children}</span>
      {hint ? <span className="ml-1 text-[10px] text-muted/60">({hint})</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cls(
        "w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-foreground placeholder:text-muted/50",
        "focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30",
        props.className,
      )}
    />
  );
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput {...props} type="number" inputMode="decimal" min={props.min ?? 0} step={props.step ?? "any"} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cls(
        "w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-foreground",
        "focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30",
        props.className,
      )}
    />
  );
}

export function Button({
  children,
  variant = "secondary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-accent text-slate-950 hover:bg-sky-300 disabled:bg-slate-600 disabled:text-slate-300",
    secondary: "border border-line bg-panel-2 text-foreground hover:border-accent/50",
    ghost: "text-muted hover:bg-panel-2 hover:text-foreground",
    danger: "border border-red-800/60 bg-red-500/10 text-sell hover:bg-red-500/20",
  };
  return (
    <button
      {...rest}
      className={cls(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cls(
        "h-4 w-4 animate-spin rounded-full border-2 border-muted/30 border-t-accent",
        className,
      )}
    />
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <div className="text-sm font-medium text-muted">{title}</div>
      {subtitle ? <div className="text-xs text-muted/60">{subtitle}</div> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-panel p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cls(
            "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-accent/15 text-accent"
              : "text-muted hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}