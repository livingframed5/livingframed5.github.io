import { initSchema, run } from "./driver.js";

interface Row {
  [key: string]: string | number;
}

export function seed(): void {
  initSchema();

  const partners: Row[] = [
    { id: "acme-eu", name: "Acme", tier: "Growth", region: "EU", account_manager: "maria.schmidt@nexus.io", onboarding_stage: "onboarded" },
    { id: "globex-na", name: "Globex", tier: "Enterprise", region: "NA", account_manager: "jake.reyes@nexus.io", onboarding_stage: "onboarded" },
    { id: "nova-apac", name: "Nova", tier: "Startup", region: "APAC", account_manager: "aiko.tanaka@nexus.io", onboarding_stage: "onboarding" },
  ];

  const contracts: Row[] = [
    { id: "c-acme-02", partner_id: "acme-eu", start_date: "2025-07-01", end_date: "2027-06-30", discount_bps: 1000, payment_terms_days: 30, sla_percent: 99.9, gte: 60000, status: "active" },
    { id: "c-globex-04", partner_id: "globex-na", start_date: "2025-01-15", end_date: "2028-01-14", discount_bps: 800, payment_terms_days: 45, sla_percent: 99.95, gte: 400000, status: "active" },
    { id: "c-globex-03", partner_id: "globex-na", start_date: "2023-01-15", end_date: "2025-01-14", discount_bps: 600, payment_terms_days: 30, sla_percent: 99.9, gte: 300000, status: "expired" },
    { id: "c-nova-01", partner_id: "nova-apac", start_date: "2026-03-01", end_date: "2027-02-28", discount_bps: 1200, payment_terms_days: 15, sla_percent: 99.5, gte: 15000, status: "active" },
  ];

  const prices: Row[] = [
    { id: "p1", sku: "NXCORE", region: "EU", list_price_cents: 120000, effective_from: "2026-01-01", currency: "EUR" },
    { id: "p2", sku: "NXPRO", region: "EU", list_price_cents: 240000, effective_from: "2026-01-01", currency: "EUR" },
    { id: "p3", sku: "NXEDGE", region: "EU", list_price_cents: 480000, effective_from: "2026-01-01", currency: "EUR" },
    { id: "p4", sku: "NXCORE", region: "NA", list_price_cents: 130000, effective_from: "2026-02-01", currency: "USD" },
    { id: "p5", sku: "NXPRO", region: "NA", list_price_cents: 260000, effective_from: "2026-02-01", currency: "USD" },
    { id: "p6", sku: "NXEDGE", region: "NA", list_price_cents: 520000, effective_from: "2026-02-01", currency: "USD" },
    { id: "p7", sku: "NXCORE", region: "APAC", list_price_cents: 1185000, effective_from: "2026-03-01", currency: "JPY" },
  ];

  const tiers: Row[] = [
    { tier: "Enterprise", rebate_bps: 1500, co_marketing_cents: 5000000, support_level: "24x7 priority", description: "Flagship partners above EUR 250k GTV/yr" },
    { tier: "Growth", rebate_bps: 1000, co_marketing_cents: 1500000, support_level: "business hours + SLA", description: "Mid-market partners EUR 40k-250k GTV/yr" },
    { tier: "Startup", rebate_bps: 500, co_marketing_cents: 200000, support_level: "business hours", description: "Early-stage partners under EUR 40k GTV/yr" },
  ];

  const upsert = (table: string, columns: string[], rows: Row[]): void => {
    const placeholders = columns.map(() => "?").join(",");
    for (const row of rows) {
      run(`INSERT OR REPLACE INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`, ...columns.map((c) => row[c] as string | number));
    }
  };

  upsert("partners", ["id", "name", "tier", "region", "account_manager", "onboarding_stage"], partners);
  upsert("contracts", ["id", "partner_id", "start_date", "end_date", "discount_bps", "payment_terms_days", "sla_percent", "gte", "status"], contracts);
  upsert("price_versions", ["id", "sku", "region", "list_price_cents", "effective_from", "currency"], prices);
  upsert("tier_benefits", ["tier", "rebate_bps", "co_marketing_cents", "support_level", "description"], tiers);

  console.log(`Seeded ${partners.length} partners, ${contracts.length} contracts, ${prices.length} price rows, ${tiers.length} tiers`);
}