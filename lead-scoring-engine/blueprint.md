# AI-Powered Lead Scoring System — Technical Blueprint

## Inbound Channel Leads & Enterprise Prospects

> **Document Type:** Technical Blueprint
> **Version:** 1.0
> **Status:** Draft — For Review & Ratification
> **Owner:** Revenue Operations / ML Engineering
> **Applicability:** All inbound channel leads (forms, chat, email, events, partner referrals) and enterprise prospects up to $20M deal value.

---

## 0. Document Control

| Field | Value |
|---|---|
| **Document ID** | LS-BP-001 |
| **Prepared By** | ________________________________ |
| **Approved By (RevOps / ML Eng Lead)** | ________________________________ |
| **Effective Date** | __\_\_/__\_\_/____ |
| **Review Cycle** | Quarterly or upon model/routing change |
| **Controlled Copy Location** | [SharePoint / PAO Repository link] |
| **Supersedes** | [Document ID / N/A] |

### Version History

| Version | Date | Author | Description of Change | Review Status |
|---|---|---|---|---|
| 0.1 | | | Initial draft for review | |
| 1.0 | | | Ratified baseline | |

---

## 1. Purpose & Scope

### 1.1 Purpose
Standardize the **evaluation, scoring, and routing** of all inbound leads using an AI-powered hybrid engine that:
- Fuses **rule-based heuristics**, **historical ML prediction**, and **LLM qualitative analysis**.
- Produces a **dynamic 1–100 composite score** per lead.
- **Automatically routes** scored leads to the correct tier and sales representative.
- Runs a **feedback loop** on closed-won / closed-lost outcomes to continuously recalibrate weights and retrain models.

### 1.2 Scope
- **In scope:** Inbound channel leads and enterprise prospects; deal values up to **$20M ACV cap**; top-of-funnel to routing; outcome-driven model feedback.
- **Out of scope:** Outbound prospecting generation, downstream pipeline management UI, post-deal delivery governance (see SOAR-Governance-Framework where applicable).

### 1.3 Acronyms

| Acronym | Definition |
|---|---|
| **ACV / ARR** | Annual Contract Value / Annual Recurring Revenue |
| **ICP** | Ideal Customer Profile |
| **CDP** | Customer Data Platform |
| **MA** | Marketing Automation |
| **SDR / BDR / AE** | Sales Development Rep / Business Development Rep / Account Executive |
| **PSI / KL** | Population Stability Index / Kullback–Leibler (drift metrics) |
| **P(won)** | Predicted probability of closed-won |
| **E[value]** | Expected deal value (USD) |
| **LLM** | Large Language Model |
| **GHE** | Ground-Truth Hydration Estimate (label attribution window) |

---

## 2. Data Inputs & Schema

### 2.1 Data Sources

| Layer | Source | Examples |
|---|---|---|
| Historical | CRM (Salesforce/HubSpot), Marketing Automation (Marketo/HubSpot), product analytics | Deals, contacts, activities, emails, campaign touches |
| Enrichment | Firmographic API (ZoomInfo, Clearbit, Cognism) | Headcount, revenue, industry, tech stack, funding |
| Real-time | Forms, chat, email gateway, event badge scans, partner PUTs | Raw message text, UTM params, pages, channel source |
| Outcomes | CRM pipeline | `Closed Won` / `Closed Lost`, deal value, cycle length |

### 2.2 Canonical Tables

> Full DDL reference: [`schema.sql`](./schema.sql)

#### `accounts` — company grain
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `crm_id` | text | SFDC/HubSpot id |
| `name` | text | |
| `industry` | text | |
| `employee_count` | int | enrichment |
| `annual_revenue` | numeric(18,2) | USD |
| `company_stage` | text | seed/series/enterprise |
| `funding_total_raised` | numeric(18,2) | USD |
| `geo_region` | text | |
| `tech_stack` | jsonb | |
| `icp_fit_rule_score` | numeric(3,0) | 0–100 rule-based fit |
| `enrichment_updated_at` | timestamptz | freshness audit |

#### `contacts` — person grain
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK | |
| `email` | text unique | dedupe key |
| `job_title` | text | |
| `seniority_tier` | int | 1=C-suite … 5 = IC |
| `buying_committee_role` | text | champion/blocker/evaluator |
| `source_channel` | text | form/chat/email/event/partner |
| `source_utm` | jsonb | utm_source/medium/campaign |
| `is_opted_in` | bool | compliance |

#### `leads` — inbound entry grain
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `contact_id` | uuid FK | |
| `account_id` | uuid FK | |
| `lead_source` | text | channel source |
| `inbound_message_text` | text | LLM raw input |
| `message_language` | text | |
| `campaign_id` | text | |
| `budget_range` | text | zero-party data |
| `buying_timeline` | text | immediate/next-Q/exploring |
| `zero_party_flags` | jsonb | |
| `status` | text | new/scored/routed/converted/lost |
| `ingested_at` | timestamptz | |

#### `engagements` — event grain (ML lifeblood)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `lead_id` | uuid FK | |
| `event_type` | text | email_open/click/reply/meeting_booked/demo/content_download/site_visit/page_view |
| `event_ts` | timestamptz | |
| `channel` | text | |
| `campaign_id` | text | |
| `metadata` | jsonb | subject, URL, asset, seconds spent |

#### `deals` — historical outcome / ground truth (ACV ≤ $20M)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK | |
| `product_skus` | jsonb | |
| `won_amount_acv` | numeric(18,2) | `CHECK (won_amount_acv <= 20000000)` |
| `stage_history` | jsonb | timestamps per stage |
| `cycle_length_days` | int | |
| `winloss` | text | won/lost |
| `close_date` | date | |
| `created_date` | date | |
| `primary_owner` | text | |

#### `features` — frozen ML input snapshot
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `lead_id` | uuid FK | |
| `feature_json` | jsonb | engagement recency, velocity, reply rate, ICP fit, comparable AE value |
| `model_version` | text | immutable version tag |
| `feature_window` | text | 7d/30d/90d |
| `as_of_ts` | timestamptz | replayability |

#### `predictions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `lead_id` | uuid FK | |
| `model_version` | text | |
| `base_conv_prob` | numeric(6,5) | P(won), 0–1 |
| `expected_deal_value` | numeric(18,2) | USD capped $20M |
| `llm_intent_score` | int | 0–100 |
| `llm_fit_score` | int | 0–100 |
| `composite_score` | int | 1–100 |
| `tier` | text | strategic/commercial/midmarket/nurture/suppress |
| `routing_rule` | text | rule name used |
| `scored_at` | timestamptz | |

#### `outcomes` — feedback
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `lead_id` | uuid FK | |
| `deal_id` | uuid FK | |
| `outcome` | text | won/lost/null |
| `final_deal_value` | numeric(18,2) | USD |
| `closed_ts` | timestamptz | |
| `rating_window_days` | int | label attribution window |

### 2.3 Feature Engineering Examples

| Category | Feature | Rationale |
|---|---|---|
| Engagement | events in last 7/30/90d per event type | frequency |
| Engagement | reply rate, meeting-booked count, demo attendance, avg session seconds | quality of intent |
| Engagement | day-since-last-touch (exponential decay, τ per event type) | recency |
| Firmographic | headcount–revenue–industry match vs ICP definition | fit |
| Firmographic | company stage & funding band | enterprise readiness |
| Deal-size | avg won ACV of accounts in same industry+size band | E[value] anchor |
| Deal-size | closest past comparable deal; median cycle length | sizing distribution |
| Behavioral | pricing-page visits vs blog-only | intent depth |
| Persona | seniority tier, committee role (champion vs blocker) | stakeholder map |
| Channel | source channel + UTM medium | base-rate normalization |
| Spam/bot | velocity burst, disposable domain | gate feature |

### 2.4 Data Volumes & SLA Targets

| Metric | Target |
|---|---|
| Webhook ingest → gates | < 300 ms |
| ML inference | < 50 ms |
| LLM async analysis | 1–3 s (batched) |
| Composite score availability | < 5 s (provisional immediate) |
| Enrichment freshness | ≤ 7 days |
| Label attribution window | 90–180 days |

---

## 3. Scoring Logic & Model Design

Hybrid, three tiers → composite 1–100.

### 3.1 Tier A — Rule-Based Heuristics (cheap deterministic gates)

| Rule | Effect |
|---|---|
| Student / competitor / disposable domain | Hard disqualify → score 10, route Ops |
| Budget floor / geo outside addressable market | Hard disqualify |
| Bot/spam velocity burst | Hard disqualify |
| ICP mismatch (firmographic) | −20 dampen |
| Engagement decay (no touch > 60d) | −15 dampen |
| Duplicate / known existing account | −10 dampen, merge candidate |

### 3.2 Tier B — Historical ML (gradient boosting)

- **Head 1:** `P(won)` — lightGBM binary classifier, positive label = `Closed Won`.
- **Head 2:** `E[value]` — regression on realized ACV, **log-then-clip at $20M**, output P10/P50/P90 quantiles for sizing distributions.
- **Calibration:** isotonic regression so predicted 0.70 ≈ true 70%.
- **Imbalance:** stratified sampling; separate handling for never-scored leads (censoring, see §6).
- **Frameworks:** LightGBM/XGBoost + `feature_store` snapshot for reproducible training.

### 3.3 Tier C — LLM Qualitative Analysis (async, rubric-scored)

Raw `inbound_message_text` → strict JSON output:

```json
{
  "intent": "budget_ready | assessing | informational | unclear | not_a_buyer",
  "intent_conf": 0.0,
  "operational_fit": 0,
  "technical_maturity": 0,
  "urgency_signals": [],
  "risk_red_flags": []
}
```

Guardrails:
- System prompt declares **price band and ICP**; temperature ≈ 0.
- **JSON schema enforced** (function calling / structured outputs).
- **Prompt-injection rules** — instructions embedded in inbound text are ignored.
- LLM **augments** the model; it never alone rejects a gate-passed lead.
- Every score logged with prompt version for audit & recalibration.

### 3.4 Composite Score (dynamic 1–100)

```
conv    = 45 × calibrated P(won)               # conversion likelihood
value   = 25 × bucket( E[deal_size] )          # <$100k / <$1M / $1M–$5M / $5M+ / max
llm     = 20 × (0.55×operational_fit + 0.25×intent + 0.20×technical_maturity)/100
firmo   = 10 × icp_fit_score

base    = conv + value + llm + firmo
score   = clamp( base × Π(gate_multipliers), 1, 100 )   # rounded integer
```

Weights are prior means; recalibrated weekly on the calibration set (§6) with a bayesian bandit over variants.

### 3.5 Tier Assignment & Routing

| Composite | Deal-size signal | Tier | Owner |
|---|---|---|---|
| 85–100 | E[value] ≥ $1M | Strategic/Key | Enterprise AE (Named) |
| 70–84 | $250k–$5M | Commercial | AE |
| 50–69 | <$250k | Mid-market | BDR/SDR with playbook |
| 30–49 | any | Nurture | Marketing / auto-nurture |
| 1–29 | any | Suppress/Ops | No outreach, logged |

---

## 4. Pipeline Integration

```

 1 INGEST   webhook (form/chat/email/event) → validate → dedupe (email+domain)
 2 ENRICH   firmographic pull, match/create account  (async ≤ 2 s)
 3 GATES    Tier A rules (~5 ms)     no ──────────► suppress / route-to-ops
 4 FEATURES assemble feature snapshot (feature store, versioned, as_of)
 5 ML       P(won) + E[value] predict (< 50 ms)
 6 LLM      enqueue message → async worker → rubric JSON (1–3 s, batched)
 7 SCORE    composite 1–100 + tier (§3.4/§3.5)
 8 ROUTE    round-robin → owner by territory/segment; SLA timers;
            outbound-reply override → direct to owner
 9 SYNC     update CRM object (Score/Tier/Owner/NextStep);
            SDR queue push + Slack/Email alert; schedule follow-up
10 OBSERVE  latency, cost, drift, queue backlog alerts (§5)
```

Operational notes:
- Steps 5–6 run **async** so the webhook returns **< 300 ms**; provisional score immediately upserts to CRM, final composite follows.
- Feature pipeline is **idempotent** with `as_of_ts` for replayable training.
- **A/B parity:** hold back `5%` of leads to the control model (champion/challenger).

---

## 5. Feedback Loop (continuous recalibration)

| Stage | Action | Cadence |
|---|---|---|
| Outcome capture | CRM webhook / `deals` sync writes won/lost + value; active-contact attribution required | Real-time + daily reconcile |
| Label hydration | Unresolved leads after 90–180 days → `lost-no-deal` (avoid polluting in-play leads) | Daily batch |
| Ground truth | Join `predictions` ↔ `outcomes`, per model version | Continuous |
| Retrain ML | Retrain Tier B, evaluate lift over holdout, register in model registry | Weekly or event-driven (≥ N closes) |
| Recalibrate composites | Re-estimate §3.4 weights + rule thresholds via historical simulation + bayesian bandit | Weekly |
| Refine LLM rubric | Sample scored messages → human review top/bottom decile → update rubric/prompt; re-validate on eval set | Monthly |
| Drift monitors | PSI/KL on features & scores; calibration plot on rolling ground truth; alert on miscalibration | Continuous |

**Bias controls (design in from day one):**
- **Routing-position bias:** only routed leads get opportunities → treat never-scored/suppressed as censored; use inverse-propensity or an always-scored holdout set.
- **Guardrail A/B:** never let the loop silently raise spam/minority risk; maintain a manual `override` log and feed human routing corrections back into training.

**Success metrics (revenue impact):**
| KPI | Measure |
|---|---|
| Score calibration | Brier score, calibration slope on rolling ground truth |
| Ranking lift | lift curves / AUC@k on routed-converted leads |
| Conversion uplift | cross-sectional A/B vs control model |
| Time-to-response | 1st outreach SLA adherence |
| Model assumption | ML-weight share of composite vs rule-only |
| Cost per scored lead | LLM token cost + inference cost per lead |

---

## 6. Appendix

### 6.1 Service Interface Contract (summary)
See [`scoring_service.py`](./scoring_service.py) for the LightGBM + LLM reference implementation and SDK/API signatures.

### 6.2 Open Questions for Review
- [ ] Ownership of the $20M cap policy: hard stop vs soft multiplier?
- [ ] Attribution window business rule: fixed 180d vs decay-weighted?
- [ ] LLM provider + budget ceiling per 1k leads?
- [ ] Override workflow ownership (RevOps vs Sales Ops) and audit retention?