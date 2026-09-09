import { enrich } from "./enricher.js";
import { classify } from "./router.js";
import { decide } from "./guardrails/decide.js";
import { draftHandoff, notifyAccountManager } from "./guardrails/escalation.js";
import { groundingGap } from "./guardrails/grounding.js";
import { runToolLoop } from "./llm/gemini.js";
import { buildClarifyReply, buildToolLoopPrompt } from "./llm/prompts.js";
import { auditLog } from "./audit.js";
import type { AnswerPayload, InboundEvent } from "./types.js";

export async function orchestrate(event: InboundEvent): Promise<AnswerPayload> {
  const context = enrich(event);
  const verdict = await classify(event, context);
  const decision = decide(event, context, verdict);

  let payload: AnswerPayload;

  switch (decision.kind) {
    case "refuse":
      payload = {
        decision: "refuse",
        replyText: "We could not verify your partner account. Please reply with your partner ID or contact your account manager directly.",
        sources: [],
        verdict,
        risk: decision.risk,
        reason: decision.reason,
      };
      break;

    case "clarify":
      payload = {
        decision: "clarify",
        replyText: buildClarifyReply(verdict),
        sources: [],
        verdict,
        risk: decision.risk,
        reason: decision.reason,
      };
      break;

    case "escalate": {
      const handoff = draftHandoff({ verdict, context, blocker: decision.reason });
      await notifyAccountManager(handoff, context?.accountManager);
      payload = {
        decision: "escalate",
        replyText: "I've escalated this to your account manager, who will follow up shortly.",
        sources: [],
        verdict,
        risk: decision.risk,
        handoff,
        reason: decision.reason,
      };
      break;
    }

    case "answer": {
      let finalText = "";
      let toolResults;
      let failReason: string | null = null;
      try {
        const outcome = await runToolLoop(buildToolLoopPrompt(event, context));
        finalText = outcome.finalText;
        toolResults = outcome.toolResults;
        failReason = groundingGap(verdict, toolResults, finalText);
      } catch (err) {
        failReason = `Answer generation failed: ${String(err)}`;
        console.error(failReason);
      }

      if (failReason) {
        const handoff = draftHandoff({ verdict, context, blocker: failReason });
        await notifyAccountManager(handoff, context?.accountManager);
        payload = {
          decision: "escalate",
          replyText: "I've escalated this to your account manager, who will follow up shortly.",
          sources: toolResults?.flatMap((t) => t.sources) ?? [],
          verdict,
          risk: decision.risk,
          handoff,
          reason: failReason,
        };
      } else {
        payload = {
          decision: "answer",
          replyText: finalText,
          sources: toolResults!.flatMap((t) => t.sources),
          verdict,
          risk: decision.risk,
          reason: decision.reason,
        };
      }
      break;
    }
  }

  auditLog({
    partnerId: context?.partnerId,
    verdict,
    risk: payload.risk,
    decision: payload.decision,
    prompt: `${event.subject} ${event.body}`,
    response: payload.replyText ?? "",
  });

  return payload;
}