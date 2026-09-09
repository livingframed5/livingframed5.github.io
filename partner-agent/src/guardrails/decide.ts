import { config } from "../config.js";
import { computeRiskScore } from "./risk.js";
import type { InboundEvent, PartnerContext, RouterVerdict } from "../types.js";

export type Decision =
  | { kind: "answer"; risk: number; reason: string }
  | { kind: "clarify"; risk: number; reason: string }
  | { kind: "escalate"; risk: number; reason: string }
  | { kind: "refuse"; risk: number; reason: string };

export function decide(_event: InboundEvent, context: PartnerContext | undefined, verdict: RouterVerdict): Decision {
  const risk = computeRiskScore({ topic: verdict.topic, money: verdict.money, tier: context?.tier });

  if (!context) {
    return { kind: "refuse", risk, reason: "Partner identity could not be resolved from the message." };
  }

  if (verdict.intent === "AMBIGUOUS" || verdict.confidence < config.thresholds.clarify) {
    return { kind: "clarify", risk, reason: verdict.reason };
  }

  if (verdict.intent === "T3_ESCALATE" || risk >= config.thresholds.escalate) {
    return { kind: "escalate", risk, reason: verdict.reason };
  }

  if (verdict.intent === "T2_NEEDS_DATA" || verdict.intent === "T1_SELF_SERVE") {
    return { kind: "answer", risk, reason: verdict.reason };
  }

  return { kind: "clarify", risk, reason: `Unrecognized intent ${verdict.intent}.` };
}