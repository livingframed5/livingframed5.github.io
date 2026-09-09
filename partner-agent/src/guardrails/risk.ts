import { config } from "../config.js";

export interface RiskInput {
  topic: string;
  money?: number;
  tier?: string;
}

export function computeRiskScore(input: RiskInput): number {
  const topic = input.topic.toLowerCase();
  for (const closed of config.hardClosedTopics) {
    if (topic.includes(closed)) return 1;
  }
  let score = 0;
  if ((input.money ?? 0) >= config.thresholds.money) score += 0.4;
  for (const kw of config.riskTopicKeywords) {
    if (topic.includes(kw.pattern)) score += kw.weight;
  }
  if (input.tier && config.tierBoost[input.tier] !== undefined) score += config.tierBoost[input.tier];
  return Math.min(1, score);
}