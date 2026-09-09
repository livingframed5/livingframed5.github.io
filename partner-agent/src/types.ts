export type Channel = "email" | "portal";
export type Intent = "T1_SELF_SERVE" | "T2_NEEDS_DATA" | "T3_ESCALATE" | "AMBIGUOUS";
export type DecisionKind = "answer" | "clarify" | "escalate" | "refuse";

export interface InboundEvent {
  channel: Channel;
  from: string;
  partnerId?: string;
  subject: string;
  body: string;
  attachments?: string[];
}

export interface PartnerContext {
  partnerId: string;
  name: string;
  tier: string;
  region: string;
  accountManager: string;
  onboardingStage: string;
  activeContractIds: string[];
}

export interface RouterVerdict {
  intent: Intent;
  confidence: number;
  topic: string;
  money: number;
  reason: string;
}

export interface SourceRef {
  type: "db" | "doc";
  id: string;
  snippet: string;
}

export interface ToolResult {
  tool: string;
  ok: boolean;
  error?: string;
  data: unknown;
  sources: SourceRef[];
}

export interface HandoffDraft {
  subject: string;
  summary: string;
  context: string;
  tried: string[];
  proposals: string[];
  blocker: string;
}

export interface AnswerPayload {
  decision: DecisionKind;
  replyText?: string;
  sources: SourceRef[];
  verdict: RouterVerdict;
  risk: number;
  handoff?: HandoffDraft;
  reason: string;
}