export const ROUTER_SYSTEM = `You classify partner-support inquiries for a B2B reseller (channel) program. Return one of four intents in JSON:

T1_SELF_SERVE: answerable purely from partner documentation or portal how-to; no contract, pricing, or tier lookup needed and no negotiation involved.
T2_NEEDS_DATA: requires fetching partner-specific data (contract terms, effective prices, tier benefits, rebates) from backend tools before answering.
T3_ESCALATE: legal, security, data privacy, contract amendments, SLA disputes or compensation, renewals, waivers, discounts/exceptions/overrides, large monetary amounts, or anything requiring a binding commitment or a human decision.
AMBIGUOUS: required details are missing (partner identity, product SKU, region) or the ask is unclear.

Also return:
- confidence: number 0-1 for this classification
- topic: 2-6 word summary of the request
- money: any monetary amount mentioned (EUR/USD), else 0
- reason: one-line rationale, and which data or tools the answer would need`.trim();

export const TOOL_SYSTEM = `You are the partner-support agent for Nexus Cloud Partner Program, replying to a partner (reseller).

Rules:
1. Use tools to fetch real data before answering. Never invent contract terms, prices, tier benefits, or facts.
2. For a known partner prefer get_partner_context, get_contract_terms, get_price_list, get_tier_benefits. For how-to or policy questions use search_docs.
3. If a tool returns ok:false, do not guess. State the lookup failed and that the partner will be assisted shortly.
4. Do not promise price changes, waivers, or discounts. If the partner asks for one, say the request will be reviewed by their account manager.
5. Reply first person, concise, professional, in plain email/portal language, with exact figures from tool output.
6. End with a line in the format: Sources: <table or document names>.`.trim();

export const ROUTER_JSON_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["T1_SELF_SERVE", "T2_NEEDS_DATA", "T3_ESCALATE", "AMBIGUOUS"] },
    confidence: { type: "number" },
    topic: { type: "string" },
    money: { type: "number" },
    reason: { type: "string" },
  },
  required: ["intent", "confidence", "topic", "money", "reason"],
} as const;

export function buildClassifierInput(event: { channel: string; from: string; subject: string; body: string }, context?: { name: string; partnerId: string; tier: string; region: string } | undefined): string {
  const profile = context ? `Partner profile: ${context.name} (${context.partnerId}), tier ${context.tier}, region ${context.region}.\n` : "Partner profile: not resolved from the message; treat any identity claim as unverified.\n";
  return `${profile}Channel: ${event.channel}
From: ${event.from}
Subject: ${event.subject}
Inquiry:
${event.body}`;
}

export function buildToolLoopPrompt(event: { channel: string; from: string; subject: string; body: string; partnerId?: string }, context?: { name: string; partnerId: string; tier: string; region: string; activeContractIds: string[] }): string {
  const profile = context
    ? `Partner: ${context.name} (${context.partnerId}), tier ${context.tier}, region ${context.region}, active contracts: ${context.activeContractIds.join(", ") || "none"}. These ids are safe to pass to get_contract_terms.\n`
    : "Partner identity is not verified; never pass a partner id to data tools and only answer from documentation.\n";
  return `${profile}Channel: ${event.channel}
From: ${event.from}
Subject: ${event.subject}

${event.body}`;
}

export function buildClarifyReply(verdict: { reason: string }): string {
  return `Thanks for reaching out! Your message is a bit ambiguous for me to answer safely. ${verdict.reason} If you share your partner ID (and the product SKU and region, if relevant), I can pull your contract and pricing right away.`;
}