import type { RouterVerdict, ToolResult } from "../types.js";

export function groundingGap(verdict: RouterVerdict, toolResults: ToolResult[], finalText: string): string | null {
  if (!finalText) return "The model produced no answer text.";
  const failed = toolResults.filter((t) => !t.ok);
  if (failed.length > 0) return `Tool lookup failed: ${failed.map((t) => t.tool).join(", ")}`;
  const hasDb = toolResults.some((t) => t.sources.some((s) => s.type === "db"));
  const hasDoc = toolResults.some((t) => t.sources.some((s) => s.type === "doc"));
  if (verdict.intent === "T2_NEEDS_DATA" && !hasDb) return "Data-backed inquiry produced no database evidence.";
  if (verdict.intent === "T1_SELF_SERVE" && !hasDoc) return "Self-serve inquiry produced no documentation evidence.";
  return null;
}