import { env } from "../config.js";
import type { HandoffDraft, PartnerContext, RouterVerdict } from "../types.js";

export function draftHandoff(opts: { verdict: RouterVerdict; context?: PartnerContext; blocker: string }): HandoffDraft {
  const { verdict, context, blocker } = opts;
  const who = context ? `${context.name} (${context.partnerId})` : "unresolved partner";
  const meta = context
    ? `Tier ${context.tier}, region ${context.region}, onboarding ${context.onboardingStage}.`
    : "Partner identity unresolved; verify on intake.";
  return {
    subject: `[AM HANDOFF] ${who} - ${verdict.topic}`,
    summary: `${verdict.topic} raised by ${who}. Confidence ${Math.round(verdict.confidence * 100)}%.`,
    context: meta,
    tried: [],
    proposals: [
      "Discount corridor: up to 12% cap on affected SKUs, holding a 4-month margin floor (playbook).",
      "Prefer non-price levers: co-marketing top-up, 45-day payment terms, volume rebate, or early renewal lock-in.",
      "Waivers and credits require documented evidence and finance-ops checklist before approval.",
    ],
    blocker,
  };
}

export async function notifyAccountManager(handoff: HandoffDraft, accountManager: string | undefined): Promise<void> {
  const url = env.slackWebhook;
  if (!url) {
    console.warn(`[handoff] would notify ${accountManager ?? "unassigned"}: ${handoff.subject}`);
    return;
  }
  const text = [
    `*${handoff.subject}*`,
    `AM: ${accountManager ?? "unassigned"}`,
    `Summary: ${handoff.summary}`,
    `Context: ${handoff.context}`,
    `Playbook proposals:`,
    ...handoff.proposals.map((p) => `- ${p}`),
    `Blocker: ${handoff.blocker}`,
  ].join("\n");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) console.error(`[handoff] slack responded ${res.status}`);
  } catch (err) {
    console.error(`[handoff] slack delivery failed: ${String(err)}`);
  }
}