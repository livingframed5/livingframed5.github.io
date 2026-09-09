import { seed } from "../src/db/seed-data.js";
import { classify } from "../src/router.js";
import { decide } from "../src/guardrails/decide.js";
import { computeRiskScore } from "../src/guardrails/risk.js";
import { enrich } from "../src/enricher.js";
import type { DecisionKind, InboundEvent, RouterVerdict } from "../src/types.js";

seed();

interface Fixture {
  id: string;
  channel: "email" | "portal";
  from: string;
  partnerId?: string;
  subject: string;
  body: string;
  fixtureVerdict: RouterVerdict;
  expected: DecisionKind;
}

const fixtures: Fixture[] = [
  { id: "e01", channel: "portal", from: "ops@acme.de", partnerId: "acme-eu", subject: "How do I log into the partner portal?", body: "I cannot find the login page for our team.", fixtureVerdict: { intent: "T1_SELF_SERVE", confidence: 0.95, topic: "portal login access", money: 0, reason: "how-to, docs only" }, expected: "answer" },
  { id: "e02", channel: "email", from: "finance@acme.de", partnerId: "acme-eu", subject: "What rebate rate applies to our tier?", body: "We need to budget the quarterly rebate.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.94, topic: "tier rebate rate", money: 0, reason: "lookup tier benefits" }, expected: "answer" },
  { id: "e03", channel: "email", from: "procurement@acme.de", partnerId: "acme-eu", subject: "Confirm our contract discount band", body: "Our finance team wants the exact discount on contract.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.9, topic: "contract discount band", money: 0, reason: "lookup contract terms" }, expected: "answer" },
  { id: "e04", channel: "email", from: "sales@acme.de", partnerId: "acme-eu", subject: "Net price for NXPRO in EU", body: "Quoting a deal and need our net price today.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.93, topic: "net price query", money: 0, reason: "lookup price list" }, expected: "answer" },
  { id: "e05", channel: "email", from: "legal@acme.de", partnerId: "acme-eu", subject: "When does our agreement expire?", body: "Planning ahead, need the expiration date.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.95, topic: "contract expiry date", money: 0, reason: "lookup contract terms" }, expected: "answer" },
  { id: "e06", channel: "email", from: "sales@acme.de", partnerId: "acme-eu", subject: "Discount exception on a deal", body: "We need a discount exception on a competitive deal.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.9, topic: "discount exception request", money: 0, reason: "negotiation/override" }, expected: "escalate" },
  { id: "e07", channel: "email", from: "ceo@acme.de", partnerId: "acme-eu", subject: "Early renewal proposal", body: "We want to renew early at current terms.", fixtureVerdict: { intent: "T3_ESCALATE", confidence: 0.95, topic: "early renewal proposal", money: 0, reason: "renewal negotiation" }, expected: "escalate" },
  { id: "e08", channel: "email", from: "support@acme.de", partnerId: "acme-eu", subject: "SLA compensation for downtime", body: "We believe the SLA was missed, want compensation.", fixtureVerdict: { intent: "T3_ESCALATE", confidence: 0.95, topic: "sla compensation claim", money: 0, reason: "sla dispute" }, expected: "escalate" },
  { id: "e09", channel: "portal", from: "legal@acme.de", partnerId: "acme-eu", subject: "Privacy policy change impact", body: "Question about how the new policy affects our data processing.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.8, topic: "legal privacy policy", money: 0, reason: "legal topic" }, expected: "escalate" },
  { id: "e10", channel: "email", from: "buyer@acme.de", partnerId: "acme-eu", subject: "How much for stuff?", body: "Can you tell me pricing?", fixtureVerdict: { intent: "AMBIGUOUS", confidence: 0.5, topic: "unspecified product pricing", money: 0, reason: "no sku or region" }, expected: "clarify" },
  { id: "e11", channel: "email", from: "hello@random-org.io", subject: "Interested in your platform", body: "Tell me about pricing.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.9, topic: "general pricing inquiry", money: 0, reason: "unknown sender" }, expected: "refuse" },
  { id: "e12", channel: "portal", from: "ops@acme.de", partnerId: "acme-eu", subject: "Order status", body: "Where do I see the status of order 10421?", fixtureVerdict: { intent: "T1_SELF_SERVE", confidence: 0.95, topic: "order status lookup", money: 0, reason: "portal how-to" }, expected: "answer" },
  { id: "e13", channel: "email", from: "marketing@acme.de", partnerId: "acme-eu", subject: "Co-marketing fund eligibility", body: "We want to run a joint campaign next quarter, do we have funds?", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.9, topic: "co-marketing fund eligibility", money: 0, reason: "lookup tier benefits" }, expected: "answer" },
  { id: "e14", channel: "email", from: "ops@acme.de", partnerId: "acme-eu", subject: "What perks come with our tier?", body: "Summarize the benefits of our program tier.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.9, topic: "tier benefits overview", money: 0, reason: "lookup tier benefits" }, expected: "answer" },
  { id: "e15", channel: "portal", from: "ops@acme.de", partnerId: "acme-eu", subject: "Open a support ticket", body: "Where do I submit a ticket in the portal?", fixtureVerdict: { intent: "T1_SELF_SERVE", confidence: 0.95, topic: "support ticket submission", money: 0, reason: "portal how-to" }, expected: "answer" },
  { id: "e16", channel: "email", from: "ops@globex.net", partnerId: "globex-na", subject: "Enterprise tier benefits", body: "Confirm the rebate and support level for Enterprise.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.93, topic: "enterprise tier benefits", money: 0, reason: "lookup tier benefits" }, expected: "answer" },
  { id: "e17", channel: "email", from: "finance@acme.de", partnerId: "acme-eu", subject: "Waiver of late payment fee", body: "We exceeded payment terms, requesting a waiver of the late fee.", fixtureVerdict: { intent: "T3_ESCALATE", confidence: 0.95, topic: "waiver late fee request", money: 0, reason: "waiver request" }, expected: "escalate" },
  { id: "e18", channel: "portal", from: "finance@acme.de", partnerId: "acme-eu", subject: "How do I submit an invoice?", body: "Where is the invoice upload in the portal?", fixtureVerdict: { intent: "T1_SELF_SERVE", confidence: 0.95, topic: "invoice submission portal", money: 0, reason: "portal how-to" }, expected: "answer" },
  { id: "e19", channel: "email", from: "sales@acme.de", partnerId: "acme-eu", subject: "Discount override for a 12k deal", body: "We need a 12k discount override on NXEDGE to win the deal.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.9, topic: "discount override pricing", money: 12000, reason: "large discount override" }, expected: "escalate" },
  { id: "e20", channel: "email", from: "finance@acme.de", partnerId: "acme-eu", subject: "Invoice dispute for 8000", body: "We are disputing an invoice of 8000 dollars from last quarter.", fixtureVerdict: { intent: "T2_NEEDS_DATA", confidence: 0.9, topic: "invoice dispute payment", money: 8000, reason: "invoice dispute" }, expected: "escalate" },
];

const live = process.env.EVAL_LIVE === "1";
let passed = 0;
let failed = 0;

for (const f of fixtures) {
  const event: InboundEvent = { channel: f.channel, from: f.from, partnerId: f.partnerId, subject: f.subject, body: f.body };
  const context = enrich(event);
  let verdict: RouterVerdict;
  if (live) {
    try {
      verdict = await classify(event, context);
    } catch (err) {
      console.log(`FAIL ${f.id} live classify error: ${String(err)}`);
      failed++;
      continue;
    }
  } else {
    verdict = f.fixtureVerdict;
  }
  const decision = decide(event, context, verdict);
  const risk = computeRiskScore({ topic: verdict.topic, money: verdict.money, tier: context?.tier });
  const ok = decision.kind === f.expected;
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${f.id} expected=${f.expected.padEnd(8)} got=${decision.kind.padEnd(8)} intent=${verdict.intent.padEnd(13)} conf=${verdict.confidence.toFixed(2)} risk=${risk.toFixed(2)} | ${f.subject}`);
}

console.log(`\n${live ? "LIVE" : "OFFLINE"} eval: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);