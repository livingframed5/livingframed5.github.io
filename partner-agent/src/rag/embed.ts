import { GoogleGenAI } from "@google/genai";
import { config, env } from "../config.js";
import { genai } from "../llm/gemini.js";

function client(): GoogleGenAI {
  return genai();
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const batchSize = 16;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await client().models.embedContent({
      model: config.llm.embedModel,
      contents: batch,
    });
    const values = (res.embeddings ?? []).map((e) => e.values ?? []);
    out.push(...values);
  }
  return out;
}

export function requireApiKey(): void {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set. Copy .env.example to .env and fill in your key.");
  }
}