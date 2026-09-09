import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

export interface RiskKeyword {
  pattern: string;
  weight: number;
}

export interface AppConfig {
  company: { name: string; currency: string };
  llm: {
    routerModel: string;
    answerModel: string;
    embedModel: string;
    temperature: number;
    maxToolTurns: number;
    topK: number;
  };
  thresholds: { clarify: number; escalate: number; money: number };
  hardClosedTopics: string[];
  riskTopicKeywords: RiskKeyword[];
  tierBoost: Record<string, number>;
  amRouting: Record<string, string>;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(path.join(here, "..", "config.json"), "utf-8");

export const config = JSON.parse(raw) as AppConfig;

export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  slackWebhook: process.env.SLACK_WEBHOOK_URL ?? "",
  port: Number(process.env.PORT ?? 4000),
  dbPath: path.join(here, "..", "data", "partner.db"),
};