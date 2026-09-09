import { genai, stripFence } from "./llm/gemini.js";
import { buildClassifierInput, ROUTER_JSON_SCHEMA, ROUTER_SYSTEM } from "./llm/prompts.js";
import { config } from "./config.js";
import type { InboundEvent, Intent, PartnerContext, RouterVerdict } from "./types.js";

const VALID_INTENTS: Intent[] = ["T1_SELF_SERVE", "T2_NEEDS_DATA", "T3_ESCALATE", "AMBIGUOUS"];

function fallbackVerdict(): RouterVerdict {
  return { intent: "T3_ESCALATE", confidence: 1, topic: "unclassified inquiry", money: 0, reason: "Router failed to produce a valid classification; escalated by safe default." };
}

function normalize(parsed: unknown, event: InboundEvent): RouterVerdict {
  if (!parsed || typeof parsed !== "object") return fallbackVerdict();
  const p = parsed as Partial<RouterVerdict>;
  const intent = VALID_INTENTS.includes(p.intent as Intent) ? (p.intent as Intent) : "AMBIGUOUS";
  const confidence = typeof p.confidence === "number" && p.confidence >= 0 && p.confidence <= 1 ? p.confidence : 0.5;
  const money = typeof p.money === "number" && p.money > 0 ? Math.round(p.money) : 0;
  const topic = typeof p.topic === "string" && p.topic.trim() ? p.topic.trim().slice(0, 80) : event.subject.slice(0, 80) || "partner inquiry";
  const reason = typeof p.reason === "string" ? p.reason.slice(0, 300) : "";
  return { intent, confidence, money, topic, reason };
}

export async function classify(event: InboundEvent, context: PartnerContext | undefined): Promise<RouterVerdict> {
  const client = genai();
  const res = await client.models.generateContent({
    model: config.llm.routerModel,
    contents: [{ role: "user", parts: [{ text: buildClassifierInput(event, context) }] }],
    config: {
      systemInstruction: { role: "system", parts: [{ text: ROUTER_SYSTEM }] },
      temperature: config.llm.temperature,
      responseMimeType: "application/json",
      responseJsonSchema: ROUTER_JSON_SCHEMA,
    },
  });
  try {
    return normalize(JSON.parse(stripFence(res.text ?? "")), event);
  } catch {
    return normalize({ intent: "T3_ESCALATE", confidence: 1, topic: "unclassified inquiry", money: 0, reason: "Router output was not valid JSON; escalated by safe default." }, event);
  }
}