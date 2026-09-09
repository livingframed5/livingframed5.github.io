# Predictive Pipeline Analytics & Forecasting Blueprint (dMPS)

**Document ID:** PIP-FCST-BP-001
**Version:** 1.0
**Classification:** Internal
**Scope:** dMPS commercial operations — deal velocity, quarterly revenue forecasting, pipeline bottleneck early-warning. Tuned to complexity bands L/M/H/XXL, TCV up to $20M, gate-based P0–P7 deals.

---

## 1. Data Architecture & Metrics

### 1.1 Metric taxonomy

Group every KPI into 6 families so the dashboard and model share one metric dictionary:

| Family | Metrics | Purpose |
|---|---|---|
| **Velocity** | Stage dwell time (days), cycle length (avg/median/p90 from stage entry to won), days in current stage | How fast is money moving |
| **Conversion** | Stage-to-stage rate, stage-to-won rate, first-pass gate pass rate, re-spin rate | Where deals die or stall |
| **Value** | TCV/ACV distribution, historical contract values (stratified 0–1M, 1–5M, 5–10M, 10–20M), ASP per complexity band | Size realism for forecasts |
| **Coverage** | Forecast vs target, weighted pipeline ≥ 3× quarter target, WIP-to-booking ratio | Will we hit the number |
| **Health** | Risk score, red-flag count, aging index, onboarding-capacity headroom | Bottleneck early-warning |
| **Quality/Leakage** | Forecast accuracy (FVAE), deal slip rate, deal churn to zero/Competitor | Model calibration |

### 1.2 Core KPI definitions (single source of truth)

- **Stage-to-stage conversion (S→S'):** `won-transitions ÷ entered-transitions` within the stage, trailing **2 rolling quarters**. Use **calendar-quarter cohorts**, not lifetime averages, to catch drift.
- **Cycle length:** median and p90 of `SignedDate − OppCreatedDate` per complexity band. Playbook budgets ~60–80 biz-days for M — the p90 is your **stall threshold**, not the median.
- **Weighted pipeline (forecast basis):** `Σ(TCV_i × P(win)_i × sign_quarter_prob_i)`. This is the *headline* number; the machine forecast (Section 2) reconciles against it.
- **Contract value stratification:** a `tcv_band` dimension (0–1M / 1–5M / 5–10M / 10–20M). Band-specific conversion history matters — a $1M and a $15M deal do not behave alike, and modeling them with one coefficient hides the distortion.
- **Time-to-revenue:** `expected_revenue_quarter(opp)` = signed-quarter × recognition-profile (B5/IFRS-15 check) — booking ≠ revenue; drive the forecast from the recognition schedule.

### 1.3 Data model (medallion + event-sourced stage history)

Structure the warehouse in 3 layers; make **stage changes first-class events**, never overwritten fields.

**Entity / fact tables:**

| Table | Grain | Key fields |
|---|---|---|
| `dim_opportunity` | 1 row / opp (SCD2) | opp_id, opp_nm, customer, region, entity, complexity_band, booking_cd, forecast_class, intake_ts |
| `dim_contract` | 1 row / signed opp | opp_id, tcv, acv, term_months, band, signed_ts, booking_ts, recognition_profile, first_revenue_qtr |
| `fact_stage_snapshot` | 1 row / opp / day (overnight ETL) | opp_id, stage, gw_forecast, risk_score, next_action_owner, open_ts |
| `fact_stage_transition` | 1 row / stage-entry (event) | opp_id, from_stage, to_stage, entered_ts, exited_ts, dwell_days, outcome (won/lost/stalled), reason_code |
| `fact_activity` | 1 row / logged touch | opp_id, activity_type, owner_role, activity_ts (email/call/demo evidence) |
| `fact_forecast_snapshot` | 1 row / opp / forecast-run | opp_id, run_qtr, scenario, p_win, expected_qtr, expected_tcv, methodology |
| `dim_calendar` / `dim_complexity` / `dict_risk_reason` | reference | quarter, band thresholds, risk reason codes (TCD/OPR/FIN/CNT/CPR/BOK) |

**Key design rules:**
1. **Never store "current stage" on `dim_opportunity`** — derive from the latest transition. This is what makes velocity/aging computable retrospectively.
2. `fact_forecast_snapshot` is **append-only** — you need the history to compute FVAE and backtest (Section 2).
3. `dwell_days` and `conversion` are **pre-computed rollups** to `mart_pipeline_daily` and `mart_forecast_quarterly` so the dashboard never scans events.
4. Join every opp to its **complexity band** — the primary split for thresholds and models.
5. Keep signed contracts in the same model so "historic contract values up to $20M" flows directly into probability calibration.

**Backfill caveat:** if the current CRM only has current stage (not history), start a 30–60 day transition-logging mode before trusting velocity metrics; backfill cycle length from signed deals only.

---

## 2. Predictive Modeling Logic

Tiered approach — classical + ML + LLM, each with a guardrail.

### 2.1 Deterministic baseline (always on, first launch)

- **Migration-matrix forecast:** quarterly stage-to-stage transition probabilities per complexity band → projected on-quarter wins by running the matrix forward 4 quarters per cohort.
- **Weighted funnel** (Section 1.2) as the reconciliation anchor.
- **Monte Carlo simulation** over migration probabilities: ~5,000–10,000 draws → **P50/P70/P90 revenue per quarter** (fan chart). This is the CEO/CFO number. Build in Python (`scikit` + `numpy`) or a dedicated forecasting service; no LLM in the money path.

### 2.2 ML win & cycle-time models

- **Win model:** Gradient boosting (XGBoost/LightGBM) on `p_win` — features: complexity band, stage, dwell in stage, velocity down-drift, activity recency (days since last logged touch), competitor presence, region/entity, TCV band, red-flag count, booking-class lifecycle point. Output calibrated with **isotonic regression** (honest probabilities, not ranking).
- **Timing model:** Survival analysis (Cox PH) per band → probability of *not* having signed by quarter-end given current dwell. This is your "slip risk" engine — a Cox object stays interpretable for sales leadership.
- **Expected quarter:**
  `P(revenue qtr t) = P(win) × P(sign in t | dwell, band)` then booked through the recognition profile.
- **Validation gate:** 6+ rolling quarters of history; measure **CSPI (Calibration, Spread, Placing, Investment)** + FVAE. Publish a "forecast accuracy score" on the dashboard so leadership trusts the machine number.

### 2.3 LLM-driven layer (augmentation, not the money path)

- **Deal-context reasoning:** RAG over deal notes, risk register, reasons-for-loss → classify each open deal into risk archetypes (e.g., *onboarding-capacity risk*, *pricing-indexation dispute*, *legal redline stall*, *silent competitor*), each mapped to the playbook reaction.
- **Narrative forecast commentary:** auto-draft the quarterly "bridge" — why forecast moved vs last run (upside/downside), citing fact IDs. Human-understandable, fully traceable.
- **Guardrails (aligns with OCTO-SOP):** LLM outputs are **Tier-2 style recommendations** — flagged `low-confidence`, never auto-written to CRM, all claims citation-backed (0.85 threshold + HITL). Never let an LLM produce a $ figure; it *summarizes* the classical forecast only.

### 2.4 Model governance

Feature store → trained quarterly per band + refit on drift → registry with version pinning. Alert on **CSPI drop > 0.1** between runs (same DRIFT-alert principle as OCTO-SOP §4.1).

---

## 3. Interactive Interface Design

### 3.1 Stack

- **React + TypeScript**, Vite build. Charts: **visx/d3 or Recharts** (interactive enough; keep dependency-light). **TanStack Query** for data fetching + caching; **Zustand** for dashboard state. **Tremor/Shadcn** component base for a clean ops look. Real-time: **WebSocket** feed on snapshot updates; export to JSON/PDF matching existing tool patterns.

### 3.2 Layout (single scrollable command center, 12-col grid)

| Zone | Component | Placement |
|---|---|---|
| **1. KPI band** | 6 headline tiles — forecast-P50, coverage ratio, weighted pipeline, stage-to-won conversion, avg cycle, aging index | Top row, click-through to drill-down |
| **2. Quarter fan chart** | Monte Carlo **P50/P70/P90 waterfall + ribbon** vs target line; month markers | Top-center, largest real estate |
| **3. Funnel** | Stage-to-stage funnel with **drop-off % per band switch**; overlays: dwell, blocked count | Mid-left |
| **4. Bottleneck heat-map** | Stage × complexity band matrix, colored by dwell vs threshold | Mid-right |
| **5. Deal table** | Sortable, pitchfork (risk score + reason archetype + next step + owner) | Bottom, ~70% width |
| **6. Activity feed / alerts panel** | Alert severity-ordered feed with one-click action buttons | Right rail |

### 3.3 Key interactive behaviors

- **Forecast toggles:** Scenario sliders — *close rate × 0/5/10%, slippage shift, target change* — recompute fan chart live (what-if in-browser, pure client logic).
- **Filter by complexity band / region / entity / TCV band** everywhere; every chart reacts.
- **Cohort comparison:** "This quarter vs last quarter vs 4-quarter average" for conversion and cycle.
- **Click-to-recommend:** clicking an at-risk deal opens a recommendation card with the playbook action (Section 4) and a "log action → owner" write-back that updates next-action-time.
- **Annotate & export:** pin budget/board notes; snapshot export for the weekly Deal Control Room.

### 3.4 Visualization hints

- Color coding: green = on-track, amber = breach < 1 week away, red = stalled (from Section 4 thresholds). Consistent across the entire tool.
- Fan chart over bar chart for forecasts — communicates uncertainty honestly.
- Human-readable "machine confidence" badge (e.g., forecast accuracy score) on the headline number.

---

## 4. Early-Warning Alerts

### 4.1 Trigger rules (computed at daily snapshot)

| # | Rule | Trigger condition | Severity |
|---|---|---|---|
| A1 | **Stage stall** | `dwell_in_stage > p85 × band threshold` (e.g., M-band T-75 selling > 45 days in P2/P3) | High |
| A2 | **Deal aging vs plan** | total cycle > band plan (60–80 biz-days M; extend H/XXL) without gate advance | High |
| A3 | **Velocity decay** | stage dwell growing 20%+ vs trailing 2 quarters, or conversion dropping 15%+ | High |
| A4 | **Pipeline coverage gap** | projected P70 quarter < 70% of target within 30 days of quarter close | Critical |
| A5 | **Funnel bottleneck** | any stage > 30% of open value and > p85 dwell (onboarding capacity, legal redline, pricing) | Med |
| A6 | **Feeble pursuit (slip)** | `P(sign this qtr | Cox) < 40%` for a top-10 deal in the forecast | Med |
| A7 | **Silent deal** | no logged activity (call/email/demo) in 7 days for M, 10 for H/XXL | Low |
| A8 | **Forecast accuracy drift** | CSPI drop > 0.1, FVAE widening > 10 pts | Med |
| A9 | **Onboarding headroom** | expected transition load vs site/devices capacity shortfall (R4 exposure) | High |
| A10 | **Top-value concentration** | > 40% of quarter P70 in one deal/fleet — counterparty/jumbo-deal risk | Med |

### 4.2 Alert-adjacent recommendations (actionable, not noise)

Each alert docks a **recommendation card** linked to the playbook gate & owner:

- **A1/A2 stall → coaching cadence:** send *Deal Control Room escalation* template with risk archetype (LLM-classified), 5-day action list, naming the owner + FC for H/XXL; auto-schedule the fresh-eyes review if pre-G3.
- **A5 bottleneck → focus sprint:** route the archetype to the owning function — Legal redline → LG; pricing exception → PA/FC; onboarding → DT (matches RACI columns).
- **A4 coverage gap → pipeline resuscitation:** list qualifying unweighted pipeline with win-probability uplifts possible via an owner action; surface 3 "convert-or-remove" deals for leadership, not 30.
- **A7 silent deal → next-step reminder:** auto-assign to opportunity owner with a suggested next action type.
- **Escalation:** Critical ties to §3.4 L4 path (FS/CFO) within 2 business days — do not bury financing or SLA-facility resolutions at burn level.

### 4.3 Alert hygiene

- **Severity-cadence matrix:** Low = daily digest; Med = daily, actionable, one-click; Critical = immediate to DP + FC + ES. No red alert without an attached recommendation + owner.
- **Snooze/acknowledge** with reason (a "deliberate stall" like customer procurement cycles is *expected*, not a flag — train the model to down-weight those reason codes).
- **Weekly metric compliance:** each generated recommendation logs against sign-off audit; end-to-end auditable.

---

## Build Order

| Phase | Scope | Window |
|---|---|---|
| 1 | Deterministic baseline + snapshot data model | Weeks 1–4 |
| 2 | Dashboard v1 on computed metrics | Weeks 3–6 |
| 3 | Monte Carlo + Cox timing models | Weeks 5–9 |
| 4 | ML calibration + LLM archetypes | Weeks 9–12 |
| 5 | Early-warning alerts (needs model trust first) | Weeks 12+ |

---

## Appendix: Alignment with Existing Playbooks

- Gate/phase vocabulary (P0–P7, G0–G7), complexity bands, escalation (L1–L4) from `dMPS_Presales_DD_Master_Guide.md`.
- RACI roles (SO/DP/PA/SP/SA/DT/FC/BC/LG/IS/CM/ES) for alert ownership routing.
- Recognition/booking rules (B5, IFRS-15/ASC 606) for time-to-revenue logic.
- LLM guardrails (citation-backed claims, 0.85 confidence, HITL, deny-lists, DRIFT alerting) from `OCTO-SOP-Agentic-Program-Management.md`.