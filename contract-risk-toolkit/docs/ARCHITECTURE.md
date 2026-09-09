# AI-Assisted Contract Scoping & Risk Assessment Toolkit — Architecture

**Version:** v0.1-prototype
**Target users:** pursuit & account teams (dMPS / managed services + government contracting)
**Runtime:** zero-dependency, in-browser HTML/JS. Open `index.html`, click a sample, press the button.

---

## 1. System layout

```
contract-risk-toolkit/
├── index.html              UI shell (sidebar nav, 6 tabs, styles)
├── data/
│   ├── patterns.js         Extraction patterns (named-entity registry)      [Layer 2]
│   ├── rules.js            Risk rule engine + compliance cross-ref matrix    [Layers 3-4]
│   ├── prompts.js          Curated AI prompt library + JSON schemas          [Layer 2 / 5]
│   └── samples.js          Two ready-to-run sample scopes (dMPS MSA, gov SOW)
├── js/
│   ├── engine.js           Pipeline: segment → extract → assess → score      [Layers 1-4]
│   ├── report.js           Payload filler, sandbox AI, report builders/IO    [Layers 4-5]
│   └── ui.js               Rendering + interactions                          [Layer 6]
└── docs/ARCHITECTURE.md    (this file)
```

### The six functional layers

| Layer | Name | Code locus | Output |
|---|---|---|---|
| 1 | **Ingestion** | `engine.segment()` | clause blocks with headings |
| 2 | **Extraction** | `patterns.js` + `engine.runEntities()` | ~28 contract variables + evidence + confidence |
| 3 | **Assessment** | `rules.js` → `engine.evaluate()` | High / Moderate / Low findings with guardrail clauses |
| 4 | **Cross-reference** | `COMPLIANCE_MATRIX` (in `rules.js`) | governance/procurement control status: `verified` / `watch` |
| 5 | **Query & Recommend** | `prompts.js` + `report.js` | 9 engineered AI workflows (sandbox-heuristic or LLM-ready) |
| 6 | **Collaboration output** | `report.js` + `ui.js` | dashboard, audit-ready report, md/html/csv/json exports |

---

## 2. Workflow logic (what happens on “Run Scoping Pipeline”)

```
Paste MSA/SOW/RFP
   → segment()               clause blocks with headings
   → runEntities()           named-variable extraction + evidence
   → RULES                    findings (High/Moderate/Compliant) + clause bank
   → COMPLIANCE_MATRIX        governance xref → verified / watch
   → scoreFrom()              compliance score 0-100 + grade A-D
   → Dashboard + Prompt Library run → JSON narratives
   → Export audit-ready report (md / html / csv / json)
```

Step-by-step:

1. **Ingest (Layer 1):** raw text → split lines → heading detection (numbered, all-caps, Article/Exhibit prefixes) → clause `{index, title, body, start, end}`.
2. **Extract (Layer 2):** each `patterns.js` entity runs its regexes over the full text (`gi`); every hit records `{entity, value, detail, confidence, snippet, clause index, clause title}`. `consolidate()` groups hits per entity, best-match first.
3. **Assess (Layer 3):** every rule receives a context `{raw, hits, gov, meta}` and returns a finding or null. Findings carry evidence **and** a suggested-clause bank string for the account team.
4. **Gov classification:** `gov` is set from the pursuit checkbox **or** auto-detected from `FAR/DFARS/CLIN/government/procurement…` language — switches the procurement-sensitive rules on.
5. **Score (Layer 4):** start 100; deduct `high 13 · moderate 6 · low 1`; add `+2 × verified controls`; clamp `[0..100]`; grade `A ≥ 85 · B ≥ 70 · C ≥ 55 · D`.
6. **Prompt engine (Layer 5):** slots are filled from the evidence-fed payload, so an external LLM receives **derived context, not raw paste**.

---

## 3. Extractable variables (Layer 2)

| Group | Variables |
|---|---|
| Identification | `contractType` (MSA / SOW / RFP / Framework / …) |
| Term & Renewal | `termLength`, `autoRenewal`, `renewalNotice`, `terminationConvenience`, `terminationCause`, `revenueMultiYear` |
| Service Levels | `sla`, `slaPenalty` |
| Liability & Indemnity | `aggregateLiability`, `uncappedLiability`, `indemnity`, `indemnityExclusion` |
| Labor & Rate | `laborRate`, `laborRateLock`, `rateIndex` |
| Commercial & Revenue | `billingBasis`, `revenueMultiYear` |
| Regulatory | `govTrigger`, `farDFARS`, `clin`, `complianceStd` |
| Data & Security | `dataPrivacy`, `dataResidency`, `insurance`, `subcontract`, `assignment`, `forceMajeure`, `changeControl` |

Pattern object shape:

```js
{ id, label, category, weight,
  patterns: [ { re: /…/gi, mode: 'binary'|'number'|'string',
                value: '…' | fn(m), capture: fn(m) -> string, conf: 0..1 } ] }
```

`capture` functions produce readable values (term years, cap `$`, credit `%`, notice days). Numeric `value` feeds the quantitative rules.

---

## 4. Risk rule engine (Layer 3)

Each rule:

```js
{ id: 'TERM-301', category, severity: 'high'|'moderate'|'low', weight, title,
  test(ctx) -> { evidence, recommendation, suggestedClause } | null }
```

| ID | Severity | Rule |
|---|---|---|
| TERM-301 | high | Auto-renew with no ≥90-day opt-out window |
| TERM-302 | moderate | ≥4y term with no convenience exit (gov-sensitivity) |
| TERM-303 | moderate | Renewal + minimum-fee commitment |
| SLA-401 | high/mod | SLA credit ≥1% of monthly fees (5%+ → high) |
| SLA-402 | moderate | SLA without quantified credit remedy |
| LIA-101 | high/mod | Uncapped or no-located aggregate liability |
| LIA-002 | moderate | Cap below ACV benchmark |
| IND-001 | high | Broad indemnity, no gross-negligence carve-out |
| LBR-001 | mod/high | Long-term rate lock without indexation (≥3y → high) |
| LBR-002 | moderate | Volume/site commitments without re-base |
| REV-001 | high | Milestone billing vs over-time recognition (ASC 606) |
| REV-002 | moderate | Multi-year term needs booking-threshold sign-off |
| DAT-001 | high | GDPR/HIPAA data processing w/o DPA |
| DAT-002 | moderate | No data-residency / locality clause |
| SEC-001 | moderate | No enumerated security standard in regulated scope |
| GOV-001 | high | Gov context absent FAR/DFARS/CLIN in text |
| GOV-002 | moderate | Gov billing basis not CLIN-aligned |
| INS-001 | moderate | Insurance referenced but limits unspecified |
| SUB-001 | moderate | Subcontracting without client consent |
| OPL-001 | low | Missing FM / change-control exhibit |

---

## 5. Compliance cross-reference matrix (Layer 4)

| Control | Domain | Checks for | Governance impact |
|---|---|---|---|
| FAR | Procurement | FAR terms / vehicle | Order-booking sign-off |
| DFARS | Defense / Cyber | NIST 800-171, breach flow-down | Cyber posture |
| CLIN-ACRN | Procurement | CLIN invoice mapping | Order booking & revenue coding |
| TERM-BOOK | Booking | term lengths, commitments | Term lock, booking value |
| REV-REC | Revenue | ASC 606 / IFRS 15 pattern | Deferred revenue |
| LABOR | Labor | rate locks, escalation, listed costs | Cost tracking |
| DATA-RES | Data | residency / sovereignty | Data placement |
| CYBER | Security | standards flow-down | Security + breach reporting |

A row passes (`verified`) when its `test(ctx)` detects the governing term in the parsed scope; unmet rows show `watch` and map to a named governance reviewer for the account-team checklist.

---

## 6. Prompt Library — engine contract (Layer 5)

Every prompt in `data/prompts.js` is a workflow, not a single question:

```js
{ id: 'P01', code: 'GOV-XREF', category, tags, summary,
  system: '<role + ground rules + output law>',
  steps: ['1.…', '2.…'],                 // CoT steering
  userTpl: '<text with {{slots}}>',
  schema: {…}                           // required JSON shape
}
```

| Code | Purpose |
|---|---|
| `GOV-XREF` | Government procurement cross-check (FAR/DFARS/CLIN gaps) |
| `SLA-SCORER` | SLA credit quantifier vs portfolio margin model |
| `LIAB-CAP` | Indemnity & liability-cap alignment to TCV/ACV |
| `REV-REC` | Revenue-recognition impact map (ASC 606 / IFRS 15) |
| `LABOR-PRICE` | Rate lock / indexation / labor guard rail |
| `TERM-EXIT` | Term / auto-renewal / exit strategy |
| `DATA-SEC` | Residency + security-standard box |
| `CUSTOM-FLAG` | Custom workflow watchwords → risk flags |
| `AUDIT-REPORT` | Audit-ready scoping report (markdown narrative) |

**Evidence-fed context:** `buildPayload()` turns variables, findings and the compliance matrix into markdown context; `fillSlots()` substitutes `{{slot}}` placeholders. This is the same material an external LLM would receive, reducing hallucination surface.

**Sandbox vs live:** the toolkit ships with a deterministic sandbox (`simulatePrompt()`); each prompt answers in the schema’s JSON from the parsed scope. Point a real LLM at the single seam in `js/report.js → ContractScope.query.runPrompt()`.

---

## 7. Report / export (Layer 6)

- **Markdown** — exec summary, extracted-variables table, risk register, compliance xref, clause bank.
- **HTML** — same content styled for print/review.
- **CSV** — flat risk register for pursuit triage.
- **JSON** — full scope object for down-stream contract systems.

All four derive from the same `scope` object, so dashboard and export never disagree.

---

## 8. Extension & roadmap

- **New rules:** add objects to `data/rules.js` (test gets the full context).
- **New entities:** add to `data/patterns.js`.
- **New prompts:** add to `data/prompts.js` with system/steps/schema/summary.
- **Live LLM:** implement the `runPrompt` seam + key injection.
- **Teams workflow:** persist findings/ownership/sign-off on each finding’s flags.

Next milestones: multi-document ingestion (RFP header + MSA + SOW), SLA-credit Monte Carlo, gov CLIN-level CSV export, and delivery-tracker reconciliation ("as-proposed vs as-delivered" delta).