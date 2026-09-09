import { all, get } from "../db/driver.js";
import { search } from "../rag/vector-store.js";
import type { ToolResult } from "../types.js";

interface PartnerRow {
  id: string;
  name: string;
  tier: string;
  region: string;
  account_manager: string;
  onboarding_stage: string;
}

interface ContractRow {
  id: string;
  start_date: string;
  end_date: string;
  discount_bps: number;
  payment_terms_days: number;
  sla_percent: number;
  gte: number;
  status: string;
}

interface PriceRow {
  id: string;
  sku: string;
  list_price_cents: number;
  effective_from: string;
  currency: string;
}

interface TierRow {
  tier: string;
  rebate_bps: number;
  co_marketing_cents: number;
  support_level: string;
  description: string;
}

export function getPartnerContext(args: { partnerId: string }): ToolResult {
  const row = get<PartnerRow>("SELECT * FROM partners WHERE id = ?", args.partnerId);
  if (!row) {
    return { tool: "get_partner_context", ok: false, error: `No partner with id ${args.partnerId}`, data: null, sources: [] };
  }
  const contracts = all<{ id: string }>("SELECT id FROM contracts WHERE partner_id = ? AND status = 'active'", args.partnerId);
  return {
    tool: "get_partner_context",
    ok: true,
    data: { ...row, activeContractIds: contracts.map((c) => c.id) },
    sources: [{ type: "db", id: `partners:${args.partnerId}`, snippet: `tier=${row.tier} region=${row.region}` }],
  };
}

export function getContractTerms(args: { partnerId: string; contractId?: string }): ToolResult {
  const row = args.contractId
    ? get<ContractRow>("SELECT * FROM contracts WHERE id = ? AND partner_id = ?", args.contractId, args.partnerId)
    : get<ContractRow>("SELECT * FROM contracts WHERE partner_id = ? AND status = 'active' ORDER BY start_date DESC LIMIT 1", args.partnerId);
  if (!row) {
    return { tool: "get_contract_terms", ok: false, error: "No active contract found", data: null, sources: [] };
  }
  return {
    tool: "get_contract_terms",
    ok: true,
    data: row,
    sources: [{ type: "db", id: `contracts:${row.id}`, snippet: `discount=${row.discount_bps / 100}% pay=${row.payment_terms_days}d sla=${row.sla_percent}%` }],
  };
}

export function getPriceList(args: { skus: string[]; region: string }): ToolResult {
  const allRows = all<PriceRow>("SELECT * FROM price_versions WHERE region = ?", args.region);
  const latestBySku = new Map<string, PriceRow>();
  for (const r of allRows) {
    const current = latestBySku.get(r.sku);
    if (!current || r.effective_from > current.effective_from) latestBySku.set(r.sku, r);
  }
  const skus = args.skus?.length ? args.skus : [...latestBySku.keys()];
  const data = skus.map((sku) => ({ sku, price: latestBySku.get(sku) })).filter((p) => p.price);
  const found = data.filter((p) => p.price).length;
  return {
    tool: "get_price_list",
    ok: found > 0,
    error: found > 0 ? undefined : `No list prices for region ${args.region}`,
    data: found > 0 ? data : null,
    sources: data.filter((p) => p.price).map((p) => ({ type: "db" as const, id: `price_versions:${p.sku}:${args.region}`, snippet: `${p.sku}=${(p.price!.list_price_cents / 100).toFixed(2)} ${p.price!.currency}` })),
  };
}

export function getTierBenefits(args: { tier: string }): ToolResult {
  const row = get<TierRow>("SELECT * FROM tier_benefits WHERE tier = ?", args.tier);
  if (!row) {
    return { tool: "get_tier_benefits", ok: false, error: `No tier ${args.tier}`, data: null, sources: [] };
  }
  return {
    tool: "get_tier_benefits",
    ok: true,
    data: row,
    sources: [{ type: "db", id: `tier_benefits:${row.tier}`, snippet: `rebate=${row.rebate_bps / 100}% co-marketing=${row.co_marketing_cents / 100} ${row.support_level}` }],
  };
}

export async function searchDocs(args: { query: string; region?: string }): Promise<ToolResult> {
  const hits = await search(args.query, args.region);
  if (hits.length === 0) {
    return { tool: "search_docs", ok: false, error: "No matching documentation found", data: null, sources: [] };
  }
  return {
    tool: "search_docs",
    ok: true,
    data: hits.map((h) => ({ doc: h.id, snippet: h.text, score: Number(h.score.toFixed(3)) })),
    sources: hits.map((h) => ({ type: "doc" as const, id: h.id, snippet: h.text.slice(0, 160) })),
  };
}