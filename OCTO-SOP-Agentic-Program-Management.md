# Standard Operating Procedure: Agentic-Enabled Program Management

**Document ID:** OCTO-PM-SOP-001
**Version:** 1.0
**Classification:** Official — Internal to OCTO
**Audience:** Technical Program Managers (PgMP/PMP), Program Coordinators, AI Integration Architects
**Effective Date:** [Date]

---

## 1. Purpose & Scope

### 1.1 Objective

This SOP establishes the operating framework for integrating AI agentic workflows into the OCTO Program Office. The objective is to reduce high-volume, low-complexity administrative work from Technical Program Managers (TPMs) while ensuring human attention is focused on judgment, risk, and safety-critical decisions. Success is defined by three outcomes:

1. **Fidelity:** Automated outputs are provably accurate and traceable to source data.
2. **Throughput:** Pilot teams see a >=50% reduction in cycle time for routine tasks (minutes, status, action tracking).
3. **Risk Containment:** Zero unsanctioned actions against systems of record or sensitive data.

This SOP applies to all OCTO program staff who use agentic tooling, and to the engineers/architects who configure, provision, and monitor those agents.

### 1.2 Automation Boundary: Administrative vs. Strategic

Every task is classified into one of two tiers. Tier classification is the gate for agent behavior.

| Tier | Definition | Examples | Agent Role | Human Role |
|------|------------|----------|-----------|------------|
| **Tier 1 — Administrative** | Deterministic, reversible, low-sensitivity, no external/customer impact | Extract meeting minutes and decisions; extract action items; draft status summaries; update short links; file tickets; route notifications | **Autonomous execution** with post-action logging | Review at defined checkpoints (end-of-day, milestone) |
| **Tier 2 — Strategic & High-Risk** | Irreversible, cross-team, external, budget-affecting, or involving people/compliance | Scope changes; budget or threshold changes; external communications; termination decisions; any action affecting security posture | **Recommendation only. Pause for approval.** | Mandatory human sign-off before any action |

**Governing rule:** An agent proposes; a human approves. Tier 1 executes with checkpoints; Tier 2 requires explicit sign-off and must not proceed without it. Unclassified tasks default to Tier 2.

---

## 2. Architecture & Core Concepts (Human-in-the-Loop Framework)

### 2.1 The Supervisor–Agent–Human Model

```
┌───────────────────┐  orchestrates  ┌────────────────────────┐
│    SUPERVISOR     ├───────────────▶│        AGENTS          │
│  (router / LLM)   │  routes tasks, │  minutes-extractor     │
│  tier classifier  │  validates     │  action-tracker        │
└────────┬──────────┘                └───────────┬────────────┘
         │ policy rules,                           │ reads/writes
         │ confidence thresholds                  ▼
         ▼                              ┌────────────────────────┐
   ┌────────────────────┐               │     DATA SOURCES      │
   │  HUMAN / TPM       │ ◀──────────── │  Slack, Jira, GitHub, │
   │  approvals, audits │  escalations  │  Confluence, Email    │
   └────────────────────┘               └────────────────────────┘
```

- **Supervisor:** Higher-order orchestration layer that (a) classifies incoming tasks into Tier 1/Tier 2, (b) routes to the correct task-specific agent, (c) validates agent output against schema and confidence thresholds, and (d) writes the audit ledger. The supervisor cannot grant itself new permissions.
- **Agents:** Single-purpose, narrowly scoped automation (e.g., `minutes-extractor`, `action-tracker`, `status-drafter`). Each has a limited toolset: read sources via scoped credentials, and write only to a staging/quarantine area unless a human-approved publish token is present.
- **Human Layer:** TPMs own all outputs. Humans approve Tier 2 actions, review Tier 1 drafts at checkpoints, receive visitations when confidence is low, and recall or correct agent behavior.

### 2.2 Operating Modes

| Mode | Description | Trigger |
|------|-------------|---------|
| **A — Autonomous (fire-and-log)** | Drafts/transforms in staging only; no publishing | Tier 1 with confidence >= 0.85; target is staging surface |
| **B — Draft-then-approve** | Stages full output; publishes only after checkpoint / automated validation | Tier 1 with confidence >= 0.85 and published to a low-risk channel |
| **C — Human-in-the-loop (HITL)** | Drafts recommendation + rationale + payload, then stops | Any Tier 2 task; confidence < 0.85; any sensitive/restricted source; any output write to a system of record |

### 2.3 Mandatory Human-in-the-Loop (HITL) Triggers

A checkpoint **must** be raised when any of the following occurs:

1. The task is classified Tier 2 (or cannot be classified).
2. Agent confidence is below **0.85** (e.g., fringed transcript, conflicting data).
3. The source or payload contains PII, credentials, personnel data, customer data, or a confidential design.
4. The task asks for a write to a system of record (Jira, GitHub, Confluence, email) beyond a bless-approved "drafts only" grant.
5. A novel recipient or channel is introduced (external party, blocked domain).
6. The agent detects rapid-fire parallel actions across a sensitive target.

**Checkpoint payload:** the agent returns a structured decision card containing: Tier classification; proposed action; full source citations; confidence score; rationale; and a recommended decision. The human review and decision are logged as first-class audit records.

---

## 3. Step-by-Step Agentic Workflows

### 3.1 Meeting Notes & Structured Decision Summaries

**Inputs:** Raw meeting transcript/recording, optional agenda and calendar metadata.

**Process:**

1. **Ingestion:** The `minutes-extractor` agent pulls the calendar/recordings for the session in scope and ingests the transcript. When transcription is automated, it occurs in the approved environment; nothing leaves the sanctioned workspace.

2. **Noise filtering:** Within filtering (speaker id, filler removal, crosstalk), the agent tags and excludes segments containing clear credentials, PII, or flagged client terms from the final written summary.

3. **Structured extraction:** Enforce a fixed schema — `summary, decisions, action_items, risks, open_questions, owner, timestamp` — and map each decision back to a source segment (start/end timestamps) so items remain traceable to the transcript.

4. **Confidence scoring:** Each `decision` and `action` receives a confidence score derived from clarity, speaker agreement, and attribution.

5. **Draft & review:** The structured minutes are written to the staging area (`drafts/`) for the TPM review. When the agent can resolve all action items against the org directory, it flags unresolved ownership (see 3.2).

6. **Publish control:** Publishing to the team wiki/channel occurs only with TPM release (mode B/C) — never automatically for sensitive audiences.

### 3.2 Action Item & Dependency Tracking

**Inputs:** Slack messages, Jira tickets, GitHub issues/PRs (via approved connectors), plus outputs from 3.1.

**Outputs:** A unified action item register with owner, due date, current status, and risk flags.

1. **Monitoring:** Connectors scan designated channels/projects/repos for commitment signals ("I will…", "shall deliver…", "requests…", "needs…").
2. **Extraction & disambiguation:** Extract actor, action, deadline, and context; de-duplicate against the existing register (semantic similarity + link match).
3. **Owner resolution:** Resolve owner from directory mapping (Slack handle -> role -> JIRA assignee). If owner is ambiguous, flag as `needs-copy@` rather than guessing.
4. **Dependency graph:** Build block/blocked-by links from Jira relations; summarize the set.
5. **Stall detection:** Flag actions with no activity within days (default 7 days), overdue past due, or repeated owner churn (>2 re-assigns) as **at-risk**.
6. **Escalation draft:** For stalled items, the agent drafts an escalation message and **pauses for TPM approval** before it can be posted or a human tagged (respect of platform's tagging consent).

### 3.3 Status Reporting Drafts

**Inputs:** Jira/iteration boards, git history, CI/CD results, wiki pages, previous executive summaries.

**Outputs:** A preliminary executive-level status summary with appendix data.

1. **Data pull:** The `status-drafter` aggregates from configured boards, repo history, pipelines, and the register from 3.2.
2. **Synthesis:** Produces a summary: *Done / In-Production / Blocked / Risks* — each claim mapped to a source citation (ticket ID, commit hash, pipeline run).
3. **Validation-before-draft:** Any sentence without a resolvable citation is **excluded** or marked `low-confidence`. The agent never invents metrics; numbers come only from query results.
4. **Draft delivery:** The summary + appendix lands in the `drafts/status` channel for TPM review.
5. **Finalization:** The TPM edits tone/scope, and the agent renders the final document. The agent does not send it externally; an approved copy-to email is created but only sent by the human.

---

## 4. Governance, Guardrails & Security

### 4.1 Data Privacy and Classification

- **Pre-ingestion checks:** All input is scanned for: PII, credentials/key material, internal-confidential markers. Content exceeding Tier-1 limits is quarantined or routed to the human, and never touches the shared intelligence pipeline.
- **Permitted storage:** Working transcripts and intermediate outputs reside in the approved staging environment with scoped access; they are auto-purged after the retention window (default 30 days unless human-retained).
- **Least-privilege credentials:** Agents receive narrow, expiring, audit-logged tokens, granted per-connector by the source system admin.
- **Deny-list:** Actions that are always refused — account/credential changes, finance or people-data writes, external sends, deletions, impersonation — regardless of mode.

### 4.2 Preventing "Hallucinated" Updates

| Guardrail | Control |
|-----------|---------|
| **Source locking** | Every factual claim must be backed by >= 1 resolvable citation; unsubstantiated content triggers the HITL pause. |
| **Confidence thresholds** | Outputs below 0.85 confidence are paused and reviewed. |
| **Schema validation** | Output must conform to the declared structure; agents retry; failures surface for review. |
| **Provenance ledger** | Every agent action is logged: timestamp, agent ID, input refs, output snapshot, tier, mode, approver. |
| **Accuracy audit** | Spot-check >= 10% of Tier 1 outputs monthly; track (a) metadata accuracy, (b) hallucinated-claims rate, (c) wrong-owner match rate; report to Program Office. |
| **DRIFT alerting** | Alert on confidence collapse, quota anomalies, or an unexplained spike in pause number of escalations. |

---

## 5. Implementation Checklist & Rollout Strategy

### Phase 1 — Scope & Pilot (Weeks 1–2)

- [ ] Select one program with limited sensitive/regulated data as pilot scope.
- [ ] Classify the team's full task inventory into Tier 1 vs Tier 2; log all assumptions.
- [ ] Success targets: minimum thresholds (e.g., >=30% time saved, zero hallucinations-rate <2%, zero unapproved Tier 2 writes).
- [ ] Map connector requirements (JIRA, Slack, GitHub, email) and what each needs.

### Phase 2 — Build & Configure (Weeks 3–4)

- [ ] Deploy in staging-only mode (`drafts` only, no publish).
- [ ] Configure tier policy and HITL thresholds (0.85 default).
- [ ] Turn on fail-closed deny-lists; verify no write to production without approval.
- [ ] Turn on ledger + alerts; test impersonation and prompt-injection.

### Phase 3 — Run & Harden (Weeks 5–8)

- [ ] Pilot the flows in this order: **meetings → action tracking → status reports.**
- [ ] Review concluded each output with the TPM for the first two weeks; record edits.
- [ ] Track all KPIs daily; diff human edits against agent output.
- [ ] Gate check at week 8 (PC meeting): pass/fail on defined success targets.

### Phase 4 — Gated Expansion (Weeks 9+)

- [ ] Move only the passing flows to mode B (draft-then-approve); Tier 2 stays HITL.
- [ ] Expand to a second team after documented, reviewed SaaS/addendums.
- [ ] Re-run audit and update thresholds monthly for the first quarter.

---

## 6. Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| **TPM / Program Lead** | Owns final approval of Tier 2, reviews Tier 1 at checkpoints, defines priorities. |
| **AI Integration Architect (OCTO)** | Develops guardrails, thresholds, flow config, and messaging standards. |
| **Program Office / Ops** | Audits agent accuracy and prompt-drift; monitors ledger. |
| **Security & Privacy (DPO/GRC)** | Reviews DPA, EULA, retention, classification, and access reviews. |
| **Source System Admins** | Grant scoped, expiring, least-privilege connectors. |

---

## Approval & Version History

| Version | Change | Author | Date |
|---------|--------|--------|------|
| 1.0 | Initial release | [Name], AI Integration Architect | |