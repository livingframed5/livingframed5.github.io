import { run } from "./db/driver.js";
import type { RouterVerdict } from "./types.js";

export function auditLog(entry: { partnerId?: string; verdict: RouterVerdict; risk: number; decision: string; prompt: string; response: string }): void {
  run(
    "INSERT INTO audit_log (ts, partner_id, intent, decision, risk, prompt, response) VALUES (?,?,?,?,?,?,?)",
    new Date().toISOString(),
    entry.partnerId ?? null,
    entry.verdict.intent,
    entry.decision,
    entry.risk,
    entry.prompt.slice(0, 500),
    entry.response.slice(0, 2000)
  );
}