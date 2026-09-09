import type { FunctionDeclaration } from "@google/genai";

export const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "get_partner_context",
    description: "Fetch CRM context for a partner: tier, region, account manager, onboarding stage, and active contract ids. Use when the partner is identified.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        partnerId: { type: "string", description: "Partner identifier, e.g. acme-eu" },
      },
      required: ["partnerId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_contract_terms",
    description: "Fetch a partner's contract terms: discount band (bps), payment terms days, SLA %, committed minimum (GTV), and expiry. Use when asked about a contract.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        partnerId: { type: "string", description: "Partner identifier, e.g. acme-eu" },
        contractId: { type: "string", description: "Optional specific contract id; when omitted the active contract is used" },
      },
      required: ["partnerId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_price_list",
    description: "Fetch the current effective list prices for SKUs in a region. Use when asked about prices, cost, or margins.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        skus: { type: "array", items: { type: "string" }, description: "Product SKUs such as NXCORE, NXPRO, NXEDGE" },
        region: { type: "string", description: "Region code: EU, NA, or APAC" },
      },
      required: ["skus", "region"],
      additionalProperties: false,
    },
  },
  {
    name: "get_tier_benefits",
    description: "Fetch benefits for a program tier: rebate bps, co-marketing fund, support level. Use when asked about tier perks or rebates.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        tier: { type: "string", description: "Tier: Enterprise, Growth, or Startup" },
      },
      required: ["tier"],
      additionalProperties: false,
    },
  },
  {
    name: "search_docs",
    description: "Semantic search over partner documentation and policies (portal how-to, SLA, tier benefits, playbook). Use for how-to and policy questions.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language question to search for" },
        region: { type: "string", description: "Optional region filter: EU, NA, or APAC" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];