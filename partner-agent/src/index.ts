import express from "express";
import { env } from "./config.js";
import { initSchema } from "./db/driver.js";
import { orchestrate } from "./orchestrator.js";
import type { InboundEvent } from "./types.js";

initSchema();

const app = express();
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/inbox", async (req, res) => {
  const event = req.body as Partial<InboundEvent>;
  if (!event || typeof event.subject !== "string" || typeof event.body !== "string") {
    res.status(400).json({ error: "Expected { channel, from, partnerId?, subject, body }" });
    return;
  }
  const normalized: InboundEvent = {
    channel: event.channel === "portal" ? "portal" : "email",
    from: event.from ?? "unknown",
    partnerId: event.partnerId,
    subject: event.subject,
    body: event.body,
    attachments: event.attachments,
  };
  try {
    res.json(await orchestrate(normalized));
  } catch (err) {
    console.error(`[inbox] ${String(err)}`);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(env.port, () => {
  console.log(`partner-agent listening on http://localhost:${env.port}`);
});