# dMPS Presales Due Diligence Playbook — Master Operational Guide

**Version 1.0 | Corporate Business Controls | Classification: Internal**

> Companion to the interactive tool `dMPS_Presales_DD_Playbook.html`. This document is the
> authoritative operational framework; the HTML tool is the working control plane used in deal
> reviews (state persists in-browser, exports to JSON/PDF).

---

## How to run this playbook

1. Load **Deal Context** (Section 2 of this guide) — opportunity ID, customer, term, TCV, scope,
   entities, pricing model, complexity band, and the pursuit roster.
2. Walk the phases **P0 → P6** in sequence; close each gate before starting the next phase.
3. Every concern is a **risk line** in the risk register before it is anything else.
4. Complete the **Business Controls Checklist** to 100% — no blockers — before pre-submit.
5. Assemble and sign the **Artifact Pack**. Nothing goes to the customer without a signed pack.
6. Attest and archive the exported JSON in the contract folder (audit trail).

**Dependencies:** this playbook presumes an in-scope opportunity (fleet, licensing, financing)
and at least preliminary NDA coverage. If no NDA is in place, treat any customer data receipt as
a control violation and escalate via Section 4.

---

## 1. End-to-End Due Diligence Workflow & Timeline

Phases are numbered P0–P7. Each ends in a **Go / Conditional-Go / No-Go gate (G0–G6)**.
A gate is closed by the *Accountable* owner listed; no phase starts before its predecessor gate
closes. Cadence below = medium-complexity deal (~60–80 business days). Compress for **L/M**,
extend for **H/XXL** (CFO + Compliance attend every gate for H/XXL).

| Phase | Window | Focus | Accountable | Gate & evidence |
|---|---|---|---|---|
| **P0** Qualification & Intake | Days 0–5 | CRM registration, red-flag screen, business case outline, roster set | SO | **G0** — intake + screening signed |
| **P1** Discovery & Baseline | Days 5–20 | Baseline workbook, site surveys, third-party dependencies, data stamping | DP | **G1** — baseline validated & stamped |
| **P2** Solution Design, Cost & Pricing | Days 15–35 | Service blueprint, TCO cost build, pricing config, exceptions | FC | **G2** — cost & margin signed |
| **P3** Risk Quantification | Days 25–42 | Risk register scored/mitigated, red flags cleared, contingency | DP | **G3** — register signed by FC |
| **P4** Contract, Legal, Security | Days 30–46 | Terms review, exception log, DPA/SCC, tax | LG | **G4** — terms cleared |
| **P5** Business Controls & Pre-Submit | Days 44–52 | Booking, cost, labor, revenue reviews; pack assembly & attestation | FC/BC | **G5** — checklist 100%, pack signed |
| **P6** Final Approval & Sign-Off | Days 52–60 | DOA chain, waiver/TIBA record, final GO | ES | **G6** — approvals logged |
| **P7** Handover to Delivery | Days 60–75 | Contract/baseline/risk handover, clauses matrix, onboarding | DT | **G7** — handover accepted |

### Standard escalation triggers (auto-flag, cannot sign below Executive Sponsor + Compliance)

- Negative-margin or below-threshold-margin deal at forecast volumes.
- Sanctions, KYC/AML, export, or regulatory red flags at screening.
- Unlimited liability or indemnity cap below the corporate floor (or non-bindable clause).
- Custom SLA with no agreed measurement / baseline for the metric.
- Guaranteed-savings clause without an enforceable delivery process owning it.
- Customer credit failure; adverse financials; dispute history.
- New country / entity not enabled for this line of business (tax, employment, data residency).
- Deviation from DOA, or non-standard terms without a waiver on file.
- Any change to order-booking, revenue recognition, or booking rules.

### Standing ceremonies

| Ceremony | Cadence | Attendees | Purpose |
|---|---|---|---|
| Deal Control Room | Weekly | DP, FC, BC, SA, PA | Progress, blockers, risk thinning, checklist sweep |
| Finance & controls lock-check | Weekly | FC, BC, PA | Cost / margin / booking / revenue validation |
| Legal red-line working group | As scheduled | LG, DP, IS | Terms negotiation; DPA / security back-fill |
| Go-Gate board | Per gate | Gate owner, FC, LG, ES | Formal Go / No-Go recorded to log |
| Fresh-eyes (sanity) review | At G3 | Independent reviewer | Assumption stress, price realism |

---

## 2. RACI — Roles, Accountabilities & Gates

**Legend:** R = Responsible (executes) · A = Accountable (owns outcome) · C = Consulted ·
I = Informed. One A per activity; gate owners below are the "A" for the gate.

**Roles:** SO Sales/Opportunity Owner · DP Deal/Pursuit Lead · PA Pricing & Costing ·
SP Sourcing/Procurement · SA Solution/Services Architect · DT Delivery/Transition ·
FC Finance Controller (Deal Assurance) · BC Business Controls/Compliance · LG Legal ·
IS IT & Information Security · CM Contract Manager · ES Executive Sponsor/Approver.

| Activity | SO | DP | PA | SP | SA | DT | FC | BC | LG | IS | CM | ES |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Intake & classification, CRM registration | R | A | C | | | | C | C | | | | I |
| Screening (sanctions, credit, conflict, export) | R | I | | | | | C | A | | | | I |
| NDA & data-access governance | R | A | | | C | | I | C | C | C | | |
| Baseline data capture, validation & stamping | C | A | C | C | R | C | C | | | | | |
| Site survey planning & execution | C | A | | C | R | C | | | | | | |
| Third-party dependency register & SPOF | C | A | | R | | C | I | | C | C | | |
| Solution & delivery design blueprint | C | A | C | C | R | C | C | | | | | |
| Cost build & TCO workbook | C | C | R | C | C | | A | | | | | |
| Pricing model, quote config & exceptions | C | A | R | | | | C | C | | | | |
| Margin & booking-value economics | I | C | C | | | | R/A | C | I | | | I |
| Risk register build, scoring & mitigation | C | R/A | C | C | C | C | C | C | C | C | | |
| Red-flag escalation & waiver decisions | I | R | | | | | C | C | C | | I | A |
| Legal / contract review & redlines | C | A | | | | | | C | R | | C | I |
| Security, privacy & DPIA | C | A | | | C | | C | C | C | R | | |
| Business controls pre-submit validation | I | C | | | | | A | R | C | C | | |
| Booking & revenue recognition sign-off | I | I | | | | | R/A | C | | | I | |
| DOA approval chain & GO record | I | R | | | | | C | C | C | | | A |
| Contract execution & handover to delivery | I | C | | | | A | C | I | | | R | C |
| Post-sign compliance check (t-30/60/90) | | C | | | | C | R | C | | | C | |

---

## 3. Risk Assessment, Categorization & Escalation

### 3.1 Risk categories and typical dMPS exposure

| Cat | Category | Example exposure | Common control |
|---|---|---|---|
| TCD | Technical | Baseline under-/over-statement; unverified device count and volumes; onboarding capacity (e.g., 4,500 devices in 30 days); telemetry gaps | Structured baseline + sampled surveys; contingency %; onboarding plan validation |
| OPR | Operational / Delivery | Field coverage in remote / bandwidth-poor sites; labor-tracking disputes (clock / geo / per-install); technician leverage; stock & SLA attack | Labor model by site cluster; measurable SLAs; delivery escalation |
| FIN | Financial | Unit-economics distortion; non-standard pricing & indexation; upfront fleet financing asset risk; FX; margin below threshold | Cost-workbook audits; pricing-exceptions log; contingency; FX hedging |
| CNT | Contractual | Custom / unlimited SLAs, liability caps & indemnities; termination / AIC penalty & exit device disposition; guarantees | Legal redline; TIBA; insurance & indemnity check |
| CPR | Compliance / Privacy / Reg | PII in print/billing data; subprocessors; export/tax; unenabled new entities | DPA/SCC; DPIA; infosec; compliance screening |
| BOK | Booking / Revenue | Device vs service vs cloud booking split; recognition deferral; materially wrong booking value | Booking rules; FC sign-off; recognition memo |

### 3.2 Scoring model (auto in the tool)

**Score = Likelihood (1–5) × Impact (1–5).**

| Band | Range | Mandatory response | Approvers (pre-submission) |
|---|---|---|---|
| Low | 1–4 | Track on register with a named risk owner | Deal Lead + risk owner |
| Medium | 5–9 | Mitigation plan documented | Finance Controller + Deal Lead |
| High | 10–15 | Formal mitigation; Legal + BC review; waiver (TIBA) required | FC + Legal + Business Controls |
| Critical | 16–25 | Board-level review; not signable without approval | Executive Sponsor / CFO + Compliance + TIBA if waiving |

> **Red-flag rule:** any auto-flag from §1 escalates the row to Critical regardless of numeric
> score and cannot be cleared below Executive Sponsor + Compliance.

### 3.3 Common exposure library (capture on the register in the tool)

| ID | Risk | Typical L·I |
|---|---|---|
| R1 | Baseline fidelity — device counts / volumes understated | 4·4 |
| R2 | Fleet & refresh volatility over term distort unit economics | 3·4 |
| R3 | Custom / low-baseline SLA (penalty, unmeasurable) | 3·5 |
| R4 | Onboarding / transition capacity shortfall (sites or devices) | 3·4 |
| R5 | Unusual labor-tracking requirement (clock / geo / per-install) | 3·3 |
| R6 | Field coverage / remote-site access gaps | 3·3 |
| R7 | Third-party / subcon dependencies (OEM warranty & labor) | 3·3 |
| R8 | Data & privacy flows (PII, DPIA, subprocessors, SCC) | 2·4 |
| R9 | Non-standard pricing / indexation distorts margin | 3·4 |
| R10 | Fleet financing / lease & asset-disposition exposure | 3·4 |
| R11 | FX / multi-country currency exposure | 2·3 |
| R12 | Booking / revenue-split complexity (device vs service vs cloud) | 3·4 |
| R13 | Non-standard liability / indemnity or unlimited clause | 2·5 |
| R14 | Termination / AIC penalty & exit disposition exceed plan | 2·4 |
| R15 | Guaranteed savings without enforceable process | 2·4 |

### 3.4 Escalation path & timing for High / Critical

| Level | Escalated to | Scope | Timeframe |
|---|---|---|---|
| L1 | Deal Lead + PA / SA | Assess, document, define mitigation | ≤ 2 business days |
| L2 | Finance Controller (Deal) | Economics & booking impact; contingency | ≤ 5 business days |
| L3 | Business Controls / Compliance + Legal | Exceptions, redline, TIBA eligibility | Within gate calendar |
| L4 | Executive Sponsor / CFO / Board Committee | Critical only; sign-off or kill | Before next gate |

**Mitigation sign-off protocol:** each Medium+ risk must show — mitigation/control line, named
owner, approver + date. A risk with no approver line blocks G3. All releases from the register
(a waived item) carry a reference to the TIBA record logged in the decision log.

---

## 4. Audit-Ready Business Controls & Compliance Checklist

> These are the corporate "book of controls" for any customer submission. The interactive tool
> tracks each item and enforces the G5 gate. **Answer every item with evidence; mark as
> verified only when the evidence is in the pack.**

### A · Deal Governance & Qualification (Gate 0)
- [ ] A1 Opportunity registered in CRM with booking code & forecast class.
- [ ] A2 Complexity band set and pursuit roster assigned.
- [ ] A3 NDA executed before any baseline data access.
- [ ] A4 Red-flag screen passed (sanctions, credit, conflict, export).
- [ ] A5 Cost-to-win / resource plan approved.

### B. Order Booking & Revenue Recognition
- [ ] B1 Quote built from approved price book (configured, not typed).
- [ ] B2 Assumptions & contingencies quantified and approved.
- [ ] B3 Booking value computed per booking policy & reviewed by Finance Controller.
- [ ] B4 No unbundling / artificial splits; per rules split approved.
- [ ] B5 Performance obligations & recognition profile documented (IFRS 15 / ASC 606).
- [ ] B6 Price indexation / escalation clauses approved; no unfunded margin leakage.
- [ ] B7 Payment terms & credit reviewed against DSO target.
- [ ] B8 Reseller / rebate pricing checked against program policy.

### C. Cost & Margin / Project Cost Management
- [ ] C1 Cost build complete to component TCO (fleet, labor, toner/parts, transition, software).
- [ ] C2 Margin validated at or above threshold; exceptions approved.
- [ ] C3 Labor rate card loaded; no unexpected services items.
- [ ] C4 Contingency quantified, approved, release rules documented.
- [ ] C5 FX / currency risk assessed and covered where applicable.
- [ ] C6 Costs locked to term; no back-end leakage.
- [ ] C7 GL project codes / cost ownership defined for post-sale setup.
- [ ] C8 Capital vs operating classification confirmed (lease / finance).

### D. Labor Allocation & Delivery Tracking
- [ ] D1 Deliverable labor plan with workflow utilization.
- [ ] D2 Labor capture method mapped & confirmed with Delivery (clock / geo / work-order).
- [ ] D3 Non-billable, standby & burden hours quantified and priced.
- [ ] D4 Subcontractor timesheets & rates verified to contract.
- [ ] D5 Labor tags (project / service) defined before close.
- [ ] D6 Reconciliation plan: timesheet → invoice → order actuals.
- [ ] D7 Overtime / shift premiums built into TCO.
- [ ] D8 Work order / POS structure defined for technician scheduling.

### E. Legal & Contractual
- [ ] E1 Draft contract reviewed by Legal (MSA, SLA schedules, SOW).
- [ ] E2 Non-standard terms in Terms Exception Log with banding.
- [ ] E3 Payment / invoice terms consistent with commercial.
- [ ] E4 Termination & post-termination (exit, data return, device disposition) defined.
- [ ] E5 DPA / SCC / data flows approved.
- [ ] E6 Taxes, duties & imports for device placement confirmed.
- [ ] E7 Dispute resolution & waivers defined.

### F. Security, Data & Third Parties
- [ ] F1 Infosec assessment complete for scope.
- [ ] F2 PII & data flows assessed (DPIA where required).
- [ ] F3 Remote access / endpoint approach sanctioned.
- [ ] F4 Subcontractor agreements executed (back-to-back warranty & SLA).
- [ ] F5 Vendor dependency-register complete (SPOF + exit plan).
- [ ] F6 Regulatory checks complete (export, environmental / waste).
- [ ] F7 Insurance / liability evidence collected.

### G. Deal Sign-Off & Post-Submission Controls
- [ ] G1 Risk register fully reviewed & signed; High/Critical owned.
- [ ] G2 Checklist 100% & no open blockers.
- [ ] G3 Finance Controller + Compliance sign-off; no exceptions without TIBA.
- [ ] G4 DOA approvals received per band.
- [ ] G5 Gate decisions & lessons recorded in CRM; pack archived to repository.
- [ ] G6 Post-sign handover completed (contract, baseline, risk register to delivery).

### Pre-submit attestation

> I confirm per the Delegation of Authority that: (1) this controls pack is complete and every
> open item is signed; (2) no High/Critical risk remains without approved sign-off; (3) booking,
> cost, labor and revenue-recognition rules have been applied; (4) the artifact pack is signed.

**Finance Controller** _____________ **Business Controls / Compliance** ____________
**Deal / Pursuit Lead** _____________ **Date** ______________

---

## 5. Artifact & Documentation Repository

### 5.1 Deliverable catalog (version-stamped, stored in the deal repository)

| ID | Artifact | Purpose | Default owner |
|---|---|---|---|
| A-01 | Opportunity Intake & Screening Form | CRM ID, complexity band, outcome | SO |
| A-02 | Customer Baseline Data Workbook | Devices, volumes, utilization, sites — stamped | SA |
| A-03 | Site Survey Findings Log | Survey plan, observations, photos, readiness | SA / DT |
| A-04 | Third-Party Vendor Dependency Register | Subs, OEM warranties, logistics, SPOF | SP |
| A-05 | Cost Build & TCO workbook | Component cost, labor, contingency | PA + FC |
| A-06 | Pricing Model & Commercial Terms | Configured quote, CPP tiers, indexation, exceptions | PA |
| A-07 | Risk Register & Mitigations | Scored risk, owners, red flags | DP |
| A-08 | Legal / Terms Exception Log & Redlines | Liability, indemnity, termination, DPA/SCC | LG |
| A-09 | Security & Privacy Assessment | Vendor/data security, PII flows, DPIA | IS |
| A-10 | Delivery / Transition & Onboarding Plan | Onboarding, labor & stock loading | DT |
| A-11 | Business Controls Compliance Pack | Section 4 export + attestations | BC / FC |
| A-12 | Deal Approval / GO Record | DOA approvals, TIBA / waivers | DP / CM |

**Stamping rule:** `<Opportunity-ID>_<Artifact-ID>_<version>_<date>`; version control in the
repository; permissions per role; no artifact on personal drives.

### 5.2 Sign-off tracking (also in the tool)

| # | Artifact | Owner | Status | Complete % | Verifier | Sign-off date | Approved by |
|---|---|---|---|---|---|---|---|
| (…) | | | Not started / Draft / In review / Complete / Approved / Waived | | | | |

**Sign-off rule:** only **Approved or Waived** (with TIBA) counts for the pack; deletion or
retro-approval of any row requires Business Controls sign-off. This table + the decision log is
what auditors pull.

---

## 6. Governance, Metrics & Audit Trail

### Standing meetings (owner in parentheses)
- Deal Control Room — weekly (DP)
- Finance & controls check — weekly (FC)
- Go / No-Go board — per gate (gate owner)
- Fresh-eyes / sanity review — once at G3 (independent)
- Status to leadership — milestone (DP)

### Deal health metrics for reporting
- **Gate health:** traffic-light per G0–G7 with accountable owner.
- **Risk posture:** # High/Critical open, # mitigated, # waivers, red-flag count (trend).
- **Control & pack completeness:** % controls validated, % artifacts signed — 100/100 at G5.
- **Velocity & quality:** days per phase vs plan; first-pass gate pass rate; deals re-spun at G5.

### Audit trail rules
1. The decision/escalation log and the sign-off dates are the formal record (append-only;
   deletions require BC approval).
2. Version stamping per 5.1.
3. Every control ties to a named verifier; attestation means those people attest.
4. Any deliberate override is a **TIBA/waiver artifact** routed through §3.4 — never silent.
5. At deal end, export the tool JSON to the contract folder; retained per record schedule.

---

## Appendix A. Terms & acronyms

| Term | Meaning |
|---|---|
| dMPS | Digital managed print & device services (complex enterprise fleets) |
| CPP | click/per-page pricing, tiers by color/machine class |
| Baseline | Certified device+volume dataset that prices the deal (stamped, ISO) |
| Contingency | Earmarked, approved cost add allowance; not a margin uplift |
| TIBA / TIV | Transaction In Business Approval / In Violation — waiver process |
| DOA | Delegation of Authority — approval chain and limits |
| RACI | Responsible / Accountable / Consulted / Informed |
| SLA | Service Level Agreement — metric + remedy; remeasurable or a red flag |
| Utilization | billable vs paid hours; all standby/warranty hours priced |
| Recognition / Booking | revenue recognition policy; booking rules at signing |

## Appendix B. File-naming & control notes

- Tool: `dMPS_Presales_DD_Playbook.html` (interactive; persists per-browser; Export/Import JSON).
- Guide: this file (source of truth).
- Recommended project home: `\doc\deal-assurance\dMPS\DD-<opportunity>\work`.
- Next versions: add country/entity configuration block; auto-generate DOA link; connect to
  CRM/EDRM via OData export.