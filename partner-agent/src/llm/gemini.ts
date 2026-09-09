import { createPartFromFunctionResponse, GoogleGenAI } from "@google/genai";
import type { Content, FunctionCall, Part } from "@google/genai";
import { config, env } from "../config.js";
import { TOOL_SYSTEM } from "./prompts.js";
import { functionDeclarations } from "../tools/schemas.js";
import { tools } from "../tools/index.js";
import type { ToolResult } from "../types.js";

let ai: GoogleGenAI | null = null;

export function genai(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set. Copy .env.example to .env and fill in your key.");
  }
  if (!ai) ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return ai;
}

export function stripFence(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return m ? m[1].trim() : text.trim();
}

export interface ToolLoopResult {
  finalText: string;
  toolResults: ToolResult[];
}

export async function runToolLoop(initialText: string): Promise<ToolLoopResult> {
  const client = genai();
  const contents: Content[] = [{ role: "user", parts: [{ text: initialText }] }];
  const toolResults: ToolResult[] = [];

  for (let turn = 0; turn < config.llm.maxToolTurns; turn++) {
    const res = await client.models.generateContent({
      model: config.llm.answerModel,
      contents,
      config: {
        systemInstruction: { role: "system", parts: [{ text: TOOL_SYSTEM }] },
        tools: [{ functionDeclarations }],
        temperature: config.llm.temperature,
      },
    });

    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      return { finalText: parts.map((p) => p.text ?? "").join("").trim(), toolResults };
    }

    contents.push(res.candidates![0]!.content!);

    const responseParts: Part[] = [];
    for (const p of functionCalls) {
      const call = p.functionCall as FunctionCall;
      const name = call.name ?? "";
      const args = call.args ?? {};
      const executor = tools[name];
      let result: ToolResult;
      if (!executor) {
        result = { tool: name, ok: false, error: `Unknown tool ${name}`, data: null, sources: [] };
      } else {
        try {
          result = await executor(args);
        } catch (err) {
          result = { tool: name, ok: false, error: String(err), data: null, sources: [] };
        }
      }
      toolResults.push(result);
      responseParts.push(
        createPartFromFunctionResponse(call.id ?? "", name, { output: { ok: result.ok, error: result.error, data: result.data } })
      );
    }

    contents.push({ role: "user", parts: responseParts });
  }

  throw new Error(`Tool loop exceeded ${config.llm.maxToolTurns} turns`);
}