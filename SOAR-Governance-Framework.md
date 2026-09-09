# SOAR Process Documentation & Governance Framework
## Complex Enterprise Managed Services (dMPS) — Pursuits & Program Reviews

> **Document Type:** Operational Governance Guide & Review Template
> **Version:** 1.0
> **Status:** Draft — For Review & Ratification
> **Owner:** PMO / Finance Controls
> **Applicability:** All dMPS pursuits, bids, contracts, and in-flight delivery programs

---

## 0. Document Control

| Field | Value |
|---|---|
| **Document ID** | SOAR-GOV-FW-001 |
| **Prepared By** | ________________________________ |
| **Approved By (Governance Lead)** | ________________________________ |
| **Effective Date** | __\_\_/__\_\_/____ |
| **Review Cycle** | Quarterly or upon process change |
| **Controlled Copy Location** | [SharePoint / PMO Repository link] |
| **Supersedes** | [Document ID / N/A] |

### Version History

| Version | Date | Author | Description of Change | Review Status |
|---|---|---|---|---|
| 0.1 | | | Initial draft for review | |
| 1.0 | | | Ratified baseline | |

---

## 1. Purpose & Scope

### 1.1 Purpose
This framework standardizes the **SOAR stage-gate governance** applied to complex enterprise managed services pursuits (bids) and in-flight program reviews. It ensures that every deal and program:

- Passes clearly defined **quality, financial, and compliance gates** before resources and commitments are released.
- Has **validated financial status** (TCV, gross margin, labor cost, cost-to-serve) supported by verifiable source documentation.
- Carries documented **business controls, compliance attestations, and risk mitigations** with accountable owners.
- Reaches delivery with a **fully evidenced hand-off** and continues through governed program reviews.

### 1.2 Scope
- **In scope:** Managed services pursuits ≥ [threshold $] TCV; all program reviews for active dMPS contracts; financial re-forecasts; change orders; renewals/extensions.
- **Out of scope:** Product development releases; non-managed-services T&M work; internal admin projects (governed by [reference]).

### 1.3 Acronyms
| Acronym | Definition |
|---|---|
| **SOAR** | Scope & Qualify · Opportunity & Model · Approve & Commit · Review & Run |
| **TCV** | Total Contract Value |
| **GM / GM%** | Gross Margin / Gross Margin Percent |
| **SOW** | Statement of Work |
| **MEC / MSL** | Margin Escalation Committee / Minimum Selling Level |
| **Cost-to-Serve (CTS)** | Fully loaded cost to deliver services (labor + third-party + burden) |
| **CPC / EAC** | Current Plan Cost / Estimate at Completion |
| **RACI** | Responsible · Accountable · Consulted · Informed |
| **SOF** | Sales Order Form / Booking Authority |

---

## 2. SOAR Governance Lifecycle Overview

The SOAR lifecycle applies **four stages**, each guarded by a **gate**. No stage may be skipped; early departure from a gate requires written executive deviation approval (see §2.3).

```
  S1 ──► G1 ──► O2 ──► G2 ──► A3 ──► G3 ──► R4 ──► G4 ──► G5 (post-hand-off)
SCOPE &    │  OPPORTUNITY    │  APPROVE     │  REVIEW & RUN   │ PROGRAM REVIEW
QUALIFY    │  & MODEL        │  & COMMIT    │  (HAND-OFF)     │ (recurring)
           │                 │              │                 │
```

### 2.1 Stage Definitions & Exit Criteria (Gates)

| Stage | Name | Purpose | Key Deliverables | Gate | Gate Exit Criteria (ALL must be met) |
|---|---|---|---|---|---|
| **S1** | **Scope & Qualify** | Confirm bid/no-bid, strategic fit, budget, and indicative commercial envelope. | Opportunity brief; strategic fit scorecard; indicative commercial model; red flags. | **G1 — Bid/No-Bid** | [ ] Strategic fit confirmed <br>[ ] Indicative margin ≥ [__%] at MSL <br>[ ] Capacity & resource availability confirmed <br>[ ] Legal/regulatory blockers assessed <br>[ ] Sponsor assigned |
| **O2** | **Opportunity & Model** | Build detailed solution, pricing model, baseline, risk register, and customer documentation pack. | Full pricing model; SOW draft; customer baseline data; risk register; detailed cost-to-serve; 3-yr forecast. | **G2 — Approval to Propose** | [ ] Pricing model validated by Finance <br>[ ] GM% at/above MSL after risk reserve <br>[ ] SOW & assumptions peer-reviewed <br>[ ] Risk register populated & owned <br>[ ] Documentation repository complete |
| **A3** | **Approve & Commit** | Sanction commercial terms, order booking, and contract signature. | Final contract; booking compliance pack; approvals memo; financial validation sign-off. | **G3 — Approval to Commit / Book** | [ ] Order booking compliance attested <br>[ ] GM/TCV reconciled to booking value <br>[ ] Risk & compliance sign-offs executed <br>[ ] Executive sponsor approval recorded <br>[ ] Hand-off readiness confirmed |
| **R4** | **Review & Run (Hand-off)** | Transition ownership from pursuit to delivery; baseline the program for delivery governance. | Delivery baseline; transition plan; SLA/KPI framework; program charter; forecast alignment. | **G4 — Delivery Hand-off** | [ ] Financial baseline locked & transferred <br>[ ] Delivery budget/cost centers created <br>[ ] Operational consultant onboarding complete <br>[ ] Governance cadence scheduled |
| **R5*** | **Program Review** *(recurring)* | Monitor margin, cost-to-serve, risk, and SLA performance for the life of the contract. | Monthly financial review pack; variance analysis; change orders; renewal outlook. | **G5 — Review Gate** | [ ] Actuals vs forecast variance ≤ [__%] <br>[ ] Cost-to-serve within guardrails <br>[ ] Risk register current & mitigated <br>[ ] No unreported overruns/leakage |

> *R5 repeats monthly/quarterly. Any breach of a guardrail (§5) automatically triggers escalation (§2.3).

### 2.2 Gating Authority Matrix

| Gate | Required Approver(s) | Escalation if Denied |
|---|---|---|
| G1 — Bid/No-Bid | Pursuit Lead + Sponsor | To Head of Sales / Market Unit Lead |
| G2 — Approval to Propose | Finance Controller + Deal Lead + Sponsor | Margin Escalation Committee (MEC) |
| G3 — Approval to Commit / Book | CFO (or delegate) + Legal + Sponsor | CFO / CEO per delegation of authority |
| G4 — Delivery Hand-off | Delivery Executive + PMO + Finance | Head of Delivery / COO |
| G5 — Program Review | Program Director + Finance Controller | PMO Governance Board |

### 2.3 Escalation Pathways

| Trigger | Level 1 (Immediate) | Level 2 (Executive) | Level 3 (Enterprise) |
|---|---|---|---|
| Margin at/below MSL after reserves | MEC | CFO sign-off | CEO/Board waiver |
| Booking rule breach / unapproved order | Finance Controller halt | CFO | Audit / Compliance |
| Cost-to-serve > guardrail [__%] for 2+ months | Program Director | COO | Portfolio re-balance |
| Major risk materializing (severity 1) | Incident & Risk Owner | PMO Board | Executive Steering |
| Disputed hand-off / delivery refusal | Pursuit + Delivery Leads | COO mediation | — |
| Out-of-scope scope creep ≥ [__%] TCV | Change Control Board | CFO | Board notification |

**Escalation principles:** escalate within 48 hours of trigger; every escalation has a named owner, a due date, and a written outcome; no silent holds.

---

## 3. Roles & Responsibilities (RACI)

### 3.1 Role Definitions

| Role | Responsibility Summary |
|---|---|
| **Pursuit/Deal Lead** | Owns the bid end-to-end through G3; accountable for gate entry. |
| **Solution Architect** | Owns technical solution, assumptions, and service design. |
| **Pricing Modeler / Deal Finance** | Builds pricing model; performs margin & variance analysis. |
| **Finance Controller (dMPS)** | Validates financial status, booking compliance, MSL adherence. |
| **PMO / Program Director** | Governs gates, cadence, documentation completeness, delivery readiness. |
| **Operational Consultant / Delivery Executive** | Owns cost-to-serve realism, transition plan, and delivery baseline. |
| **Executive Sponsor** | Strategic alignment; final commercial authority; escalation owner. |
| **Legal / Contracts** | Contract, SOW, and order booking compliance. |
| **Risk / Compliance Officer** | Risk register, controls attestation, regulatory sign-off. |
| **Order Management** | SOF/booking entry and system-of-record updates. |
| **Delivery Program Manager** | Owns G4 hand-off and ongoing R5 delivery/reviews. |

### 3.2 RACI Matrix

| Activity / Decision | Pursuit Lead | Finance Controller | PMO/Program Dir. | Sponsor | Operational Consultant | Legal/Compliance | Order Mgmt | Delivery PM |
|---|---|---|---|---|---|---|---|---|
| Bid/no-bid decision pack | R | C | C | **A** | C | C | I | I |
| Opportunity & baseline assessment | **R** | C | C | I | C | I | I | I |
| Pricing model build & validation | R | **A** | C | C | C | I | I | I |
| Financial status / margin review | C | **A** | R | I | C | I | I | I |
| Variance analysis (model vs forecast) | R | **A** | R | I | C | I | I | C |
| Risk register & mitigation | R | C | C | I | R | **A** | I | C |
| Order booking compliance attestation | I | **A** | I | C | I | C | R | I |
| Contract & SOW execution | C | C | I | **A** | C | **A** | R | I |
| Delivery hand-off readiness | C | C | **A** | I | R | I | I | R |
| Program reviews (recurring) | I | C | **A** | I | C | I | I | R |
| Escalation resolution | C | C | R | **A** | C | C | I | C |

> *Only one "A" per row. Disputes on accountability default to the highest-role owner and are resolved via §2.3.

---

## 4. Project Financial Status & Margin Validation Template

> Complete for every gate and program review. **All figures must trace to source documents** listed in §6.

### 4.1 Deal / Program Summary

| Field | Entry |
|---|---|
| Deal / Program Name | |
| Opportunity/Contract ID | |
| Market Unit / Region | |
| Pursuit Lead / Delivery PM | |
| Executive Sponsor | |
| Finance Controller | |
| Contract Start / End | |
| Review Type (Gate #) | ☐ G1 ☐ G2 ☐ G3 ☐ G4 ☐ G5 |
| Review Date | |
| Currency | |

### 4.2 Total Contract Value (TCV) Schedule

| # | Revenue Line (from SOW/pricing model) | One-time | Recurring/Mo | Term (mos) | Recurring Total | **Line TCV** | % of TCV | Source Doc ID |
|---|---|---|---|---|---|---|---|---|
| 1 | Implementation / transition | | | | | | | |
| 2 | Service desk / support | | | | | | | |
| 3 | Infrastructure mgmt | | | | | | | |
| 4 | Application services | | | | | | | |
| 5 | Projects / enhancements | | | | | | | |
| 6 | Third-party / COTS | | | | | | | |
| 7 | Renewals / options | | | | | | | |
| 8 | Other | | | | | | | |
| | **TOTAL** | | | | | **0.00** | **100%** | |

**Reconciliation:** TCV above = Booking value ☐ Yes ☐ No — if no, explain variance: ________________________________

### 4.3 Gross Margin & Profitability

| Metric | Target (Model) | Revised Forecast | Actual (to date) | Variance ($) | Variance (%) | Guardrail | Pass? |
|---|---|---|---|---|---|---|---|
| Total Revenue (TCV recognized) | | | | | | — | |
| Direct Labor Cost | | | | | | ≤ [__%] of rev | |
| Third-party / Supplier Cost | | | | | | ≤ [__%] of rev | |
| Transition / One-time Cost | | | | | | ≤ [__%] of rev | |
| Risk Reserve Utilized | | | | | | ≤ [__%] of rev | |
| **Gross Margin ($)** | | | | | | — | |
| **Gross Margin (%)** | | | | | | ≥ [__%] MSL | |

### 4.4 Labor & Cost-to-Serve

| Cost Driver | Modeled | Forecast | Actual | Variance | Commentary / Owner |
|---|---|---|---|---|---|
| FTE plan (headcount) | | | | | |
| Blended labor rate | | | | | |
| Overtime / premium | | | | | |
| Subcontract labor | | | | | |
| Facilities & tooling | | | | | |
| **Total Cost-to-Serve ($)** | | | | | |
| **Cost-to-Serve (% of revenue)** | | | | | ≤ [__%] guardrail |
| Indirect / SG&A allocation | | | | | |

### 4.5 Variance Analysis — Original Deal Model vs. Actual Execution Forecast

| # | Variance Driver | Original Model | Current Forecast | Δ ($) | Δ (%) | Root Cause | Impact (Margin) | Mitigation | Owner | Due |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pricing / volume | | | | | | | | | |
| 2 | Labor mix / rates | | | | | | | | | |
| 3 | Effort burn (EAC vs CPC) | | | | | | | | | |
| 4 | Third-party costs | | | | | | | | | |
| 5 | Transition slippage | | | | | | | | | |
| 6 | Scope creep / change orders | | | | | | | | | |
| 7 | Risk events realized | | | | | | | | | |
| 8 | FX / indexation | | | | | | | | | |
| 9 | Other | | | | | | | | | |
| | **Net Forecast Impact** | | | | | | | | | |

**Forecast health statement (Finance Controller):**
- Forecast accuracy last 3 periods: __% / __% / __% (guardrail ≥ [__%])
- Current EAC vs CPC: _____________
- **Overall assessment:** ☐ On plan ☐ Watch ☐ Over target ☐ Red — Escalated: ☐ Yes / ☐ No (ref: §2.3)

---

## 5. Business Controls, Compliance & Risk Sign-Off

### 5.1 Control Verification Checkpoints

| # | Control Checkpoint | Evidence Required | Responsible | Status |
|---|---|---|---|---|
| C1 | Order booking rules (SOF, booking authority, approval delegation) adhered | Approved SOF + booking policy checklist | Order Mgmt / Finance | ☐ Met ☐ Not Met |
| C2 | Minimum selling level (MSL) confirmed at gate | Margin validation pack (§4.3) | Finance Controller | ☐ Met ☐ Not Met |
| C3 | Deal recorded in system-of-record with accurate TCV/start/end | Contract & system entry match | Order Mgmt | ☐ Met ☐ Not Met |
| C4 | Project cost management guardrails established (cost centers, budgets, thresholds) | Approved cost structure / WBSE | Delivery PM / PMO | ☐ Met ☐ Not Met |
| C5 | Budget vs. actual tracked with defined tolerances | Monthly cost pack | Finance Controller | ☐ Met ☐ Not Met |
| C6 | Risk register current with owners, scores, and mitigation dates | Risk register extract | Risk/Compliance | ☐ Met ☐ Not Met |
| C7 | Unresolved high-severity risks formally escalated | Escalation log | Risk/Compliance | ☐ Met ☐ Not Met |
| C8 | Legal & regulatory requirements (GDPR, export control, local law) assessed | Legal review memo | Legal | ☐ Met ☐ Not Met |
| C9 | Change control / scope governance active | Change log / CCB minutes | PMO | ☐ Met ☐ Not Met |
| C10 | Contract & SOW aligned to executed agreement | Redline vs signed copy | Legal / Pursuit | ☐ Met ☐ Not Met |
| C11 | Hand-off criteria and transition plan documented | Transition plan + G4 pack | Operational Consultant | ☐ Met ☐ Not Met |
| C12 | No unauthorized commitments / unbilled exposure | Commitments log | Finance | ☐ Met ☐ Not Met |

> Any "Not Met" item **blocks the gate** and routes to §2.3 escalation. Waiver of a control requires CFO + Compliance approval in writing.

### 5.2 Mandatory Approval Sign-Off Blocks

> Each gate is **incomplete until all blocks below are signed** by the named roles.

**Gate: ☐ G1 ☐ G2 ☐ G3 ☐ G4 ☐ G5** — Date: ______________

**Finance Validation**
- I confirm the financial status has been validated against source documentation; TCV, GM%, labor cost, and cost-to-serve figures are accurate and variance is explained.
- Name: ______________________ Title: **Finance Controller** Signature: ____________ Date: __________

**Risk & Compliance**
- I confirm all control checkpoints (C1–C12) are met or formally waived, and risks are documented with accountable owners.
- Name: ______________________ Title: **Risk/Compliance Officer** Signature: ____________ Date: __________

**Pursuit / Delivery Lead**
- I confirm the pack is complete, deliverables are evidenced, and hand-off (or delivery) status is accurate.
- Name: ______________________ Title: **Pursuit/Delivery Lead** Signature: ____________ Date: __________

**Executive Sponsor**
- I approve proceeding through this gate and accept any residual risk/margin exposure recorded above.
- Name: ______________________ Title: **Executive Sponsor** Signature: ____________ Date: __________

**Governance / PMO (Gate Certification)**
- I certify the gate criteria in §2.1 are fully satisfied and this package is accepted into the controlled repository.
- Name: ______________________ Title: **PMO / Governance Lead** Signature: ____________ Date: __________

---

## 6. Expert Consultation & Documentation Repository

### 6.1 Required Supporting Documentation Checklist

> Every expert recommendation during a review must cite at least one source document below (Source Doc IDs referenced in §4).

| # | Document | Required At | Owner | Status | Doc ID |
|---|---|---|---|---|---|
| D1 | Signed opportunity brief & strategic fit scorecard | G1 | Pursuit | ☐ | |
| D2 | Full pricing model (MS Excel) with assumptions tab | G2 | Pricing Modeler | ☐ | |
| D3 | Customer baseline data & volume assumptions | G2 | Solution Architect | ☐ | |
| D4 | Statement of Work (SOW) draft & final | G2/G3 | Pursuit/Legal | ☐ | |
| D5 | Solution design / technical architecture | G2 | Solution Architect | ☐ | |
| D6 | Cost-to-serve build (labor, third-party, burden) | G2 | Operational Consultant | ☐ | |
| D7 | Risk register (with scoring & mitigations) | G2→R5 | Risk/Compliance | ☐ | |
| D8 | Financial validation & margin analysis pack | G2/G3 | Finance Controller | ☐ | |
| D9 | Order booking compliance pack (SOF, delegation) | G3 | Order Mgmt | ☐ | |
| D10 | Final executed contract + redline summary | G3 | Legal | ☐ | |
| D11 | Transition plan & delivery baseline | G4 | Operational Consultant | ☐ | |
| D12 | Program charter, SLA/KPI framework | G4 | Delivery PM | ☐ | |
| D13 | Monthly financial review pack (actuals, EAC) | G5 | Finance Controller | ☐ | |
| D14 | Change order log & approvals | G5 | PMO | ☐ | |
| D15 | Escalation log / decisions | Any | PMO | ☐ | |

### 6.2 Repository Standards

- **Location:** [PMO shared repository / SharePoint site] — single controlled copy.
- **Naming convention:** `[SOAR#]–[Deal/Program ID]–[DocType]–[Version]–[Date]`
- **Versioning:** Each revision increments version; superseded docs archived (never deleted) for audit.
- **Access & retention:** Finance/Legal/Compliance — full access; audit trail retained per retention policy (min [__] years post contract).
- **Review cadence:** Repo completeness validated at every gate; missing mandatory docs block the gate.

---

## 7. Appendices

### Appendix A — Suggested Gate Meeting Protocol
1. PMO issues gate pack ≥ **5 business days** prior to gate date.
2. Reviewers complete financial template (§4) and controls checklist (§5.1) beforehand.
3. Gate meeting: 45 min — status summary (10 min), finance deep-dive (15 min), risks/compliance (10 min), decision & actions (10 min).
4. Decision options: **Approve / Approve with conditions / Reject & rework / Escalate**.
5. Minutes + signed sign-offs (5.2) filed in repository within 48 hours.

### Appendix B — Definitions & Glossary

| Term | Definition |
|---|---|
| **MSL** | Minimum Selling Level: lowest acceptable GM% for a deal, set by Finance. |
| **EAC** | Estimate at Completion: forecast total cost/revenue at contract end. |
| **CPC** | Current Plan Cost: approved baseline plan cost for the period. |
| **Cost-to-Serve** | Fully loaded cost to deliver services (labor + third-party + overhead). |
| **Leakage** | Margin erosion from unbilled work, write-offs, or unrecovered cost. |
| **Guardrail** | Pre-set tolerance threshold that, if breached, triggers escalation. |
| **Gate** | Formal decision point requiring all exit criteria + sign-offs to proceed. |

### Appendix C — Quick-Reference Guardrails Summary

| Guardrail | Threshold | Escalation |
|---|---|---|
| Gross Margin % | ≥ [__]% (MSL) | MEC → CFO |
| Cost-to-Serve % of revenue | ≤ [__]% | Program Dir → COO |
| Forecast accuracy (3-mo avg) | ≥ [__]% | PMO Board |
| Per-period variance vs forecast | ≤ [__]% | Finance → PMO |
| Unresolved Sev-1 risks at gate | 0 | Immediate escalation |

---

*End of Framework — Replace all `[__]` placeholders with organization-specific thresholds before ratification.*
