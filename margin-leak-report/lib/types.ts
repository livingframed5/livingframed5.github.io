import type { LucideIcon } from "lucide-react";

/**
 * Domain types for the Margin Leak Report.
 *
 * These mirror the shape used by margin-leak-report.tsx but add an `id`
 * field that maps to Airtable record IDs so we can round-trip updates
 * (e.g., marking a change order as invoiced) back to Airtable.
 */

export type Health = "healthy" | "warning" | "critical";
export type ChangeOrderStatus = "unsigned" | "pending" | "invoiced";

export interface ChangeOrder {
  id: string;
  title: string;
  amount: number;
  status: ChangeOrderStatus;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  icon: string;
  tag: string;
  estHours: number;
  actualHours: number;
  materialBudget: number;
  materialActual: number;
  contract: number;
  targetMargin: number;
  currentMargin: number;
  health: Health;
  changeOrders: ChangeOrder[];
}

export interface Metrics {
  activeCount: number;
  revenueBooked: number;
  revenueTarget: number;
  laborVariance: number;
  laborHrsDelta: number;
  laborVarPct: number;
  unbilledChangeOrders: number;
  coCount: number;
  avgMargin: number;
  avgTargetMargin: number;
}

export interface Variance {
  $: number;
  pct: number;
}

export interface Overrun {
  $: number;
  pct: number;
}

export interface KpiCard {
  id: string;
  icon: LucideIcon;
  label: string;
  value: (m: Metrics) => string;
  sub: (m: Metrics) => string;
  bar: (m: Metrics) => number;
  barColor: string;
  extra: (m: Metrics) => string;
}

export interface SortDef {
  key: string;
  label: string;
}

export interface HealthMeta {
  label: string;
  dot: string;
  chip: string;
  bar: string;
  text: string;
}

export interface CoStatusMeta {
  label: string;
  chip: string;
}

export interface NavItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}