/*
 * ============================================================================
 *  AI-POWERED PROMPT LIBRARY & QUERY ENGINE
 * ----------------------------------------------------------------------------
 *  Curated, pre-tested prompt workflows used by the Prompt Library tab.
 *  Each entry contains:
 *    - system      : role + ground rules (some legalese stability)
 *    - userTpl     : user turn template, {{{{SLOT}}}} placeholders are filled
 *                    from the parsed Contract Scope by the engine.
 *    - steps       : structured reasoning (CoT) the model is told to follow.
 *    - outputSchema: required JSON shape the model must return.
 *    - simulate    : deterministic sandbox used when no API key is configured
 *                    (heuristic answer grounded in the parsed scope).
 * ============================================================================
 */
(function (root) {
  'use strict';
  var P = [];

  /* ------------------------------------------------------------------ */
  P.push({
    id: 'P01', code: 'GOV-XREF', name: 'Government Procurement Cross-Reference (GovCheck)',
    category: 'Regulatory & Gov', tags: ['FAR', 'DFARS', 'CLIN', 'procurement', 'orders'],
    summary: 'Pairs the parsed contract scope against government-procurement regulations to surface procurement, billing and order-booking gaps.',
    system: `You are a federal/state procurement compliance reviewer embedded in an enterprise PTL (managed services) pursuit team.
Ground rules:
1) Cite the exact clause or contract variable you rely on (from the provided extraction table).
2) Distinguish "contractual requirement" from "measurement recommendation".
3) Do not invent regulations. If the FAR/DFARS CLIN structure is absent, say so explicitly.
4) Output strictly as JSON matching the schema below.`,
    steps: ['1. Classify vehicle: MSA/SOW/RFP and any T&M / unit-price / FP structure.',
      '2. Check FAR/DFARS clause inventory + whether the scope maps to CLIN/ACRN.',
      '3. Screening for negotiation turn: order booking, revenue coding, labor reporting. Expert ops vs procurement.',
      '4. Emit one recommended action per gap found, graded High / Moderate / Compliant.'],
    userTpl: `Contract scope summary:
{{{{scopeSummary}}}}

Extracted entities (Layer-2 feed):
{{{{entityTable}}}}

Revised compliance matrix:
{{{{complianceMatrix}}}}

Pursuit: {{pursuitName}} (gov: {{govness}} / region: {{region}})

Produce the GovCheck JSON per schema.`,
    schema: {
      instrument: 'MSA | SOW | RFP | Other',
      vehicle: 'blank (e.g. FAR-based / GSA / state standing offer) or \u201csignature\u201d',
      clinStructure: 'present|absent|unknown',
      procurementGaps: [{ gap: '', regulation: '', fix: '', grade: 'High|Moderate|Compliant' }],
      bookingAndRevenue: 'one-line',
      negotiatedStance: 'statement',
      recommendedNextStep: 'concrete + owner-role'
    }
  });

  /* ---------------------------------------------------------------- */
  P.push({
    id: 'P02', code: 'SLA-SCORER', name: 'SLA Penalty / Credit Quantifier',
    category: 'Service Levels & Remedies', tags: ['SLA', 'credits', 'penalty', 'remedy'],
    summary: 'Measures SLA credit exposure and compares it to your internal margin model.',
    system: `You are the service-assurance & risk controller for a dMPS industrial Services account.
Ground rules:
- Only rely on numbers present in the scope; if a % is not stated, flag it as undefined.
- Distinguished credits (sole remedy) vs liquidated damages.
- Do not propose to remove customer protections without a compensating control.`,
    steps: `1. Inlet all service metrics + any credit/penalty % in the extraction feed.
2. Convert each credit to % of the applicable monthly fee.
3. Stack renewable credits into a worst-case monthly exposure vs a branded & conservative margin benchmark.
4. Produce control-recommendation with a numeric guardrail.`,
    userTpl: `Scope service-level entities:
{{{{entityTable}}}}

Risk findings (from assessment layer):
{{{{riskFindings}}}}

Account: {{pursuitName}}
Scope fuel: {{region}}

Output the quantifier JSON per schema.`,
    schema: [
      { metric: 'functional server', exposure: 'x% monthly', benchmark: '<=1%', verdict: 'ok|guard|flag', rec: '…' }
    ]
  });

  /* ---------------------------------------------------------------- */
  P.push({
    id: 'P03', code: 'LIAB-CAP', name: 'Indemnity & Liability-Cap Alignment',
    category: 'Liability & Indemnity', tags: ['indemnity', 'cap', 'negligence', 'exclusions'],
    summary: 'Alignment of uncapped liability, cap-basis, and carve-outs against the portfolio margin posture.',
    system: `You review enterprise MSA liability Terms for the Payer/PTL side. GPT rules:
- A liability cap should reference the account's annualized contract value/n-trailing-12-months fees.
- Uncap carve-outs (IP, confidentiality breach, survivor) are normal; ADIT-for-negligence is not.
- State whether the derived stance is "ready to accept" or "negotiation required".`,
    userTpl: `Extraction relevant to liability:
{{{{entityTable}}}}

Risk engine findings:
{{{{riskFindings}}}}

ACV envelope: {{acv}}

Return JSON with per-clause verdict.`,
    schema: [
      { area: 'cap', capBasis: '…', carveOuts: ['…'], stance: 'meet | negotiate | block', suggestedClause: '…' },
      { area: 'indemnity', scopeOfDuty: '…', control: '…', stance: '…' }
    ]
  });

  /* ---------------------------------------------------------------- */
  P.push({
    id: 'P04', code: 'REV-REC', name: 'Revenue-Recognition Impact Map (ASC 606 / IFRS 15)',
    category: 'Revenue & Booking', tags: ['ASC606', 'IFRS15', 'deferred', 'milestone'],
    summary: 'Maps billing events to revenue recognition — separates one-time deliverables from over-time services.',
    system: `You are a revenue-engineering controller. Apply ASC 606 / IFRS 15.
Ground rules:
- Identify separate performance obligations vs combined services.
- Milestone billing does NOT equal recognition if services are delivered over time. Track it explicitly.
- Use tables for journal & recognition pattern.`,
    steps: `1. Bin service & one-time elements from the extracted billing entities & SOW amounts.
2. Determine each element's timing pattern (point-in-time vs over-time).
3. Highlight deferral risk: amounts invoiced vs recognized; unbilled vs accrued.
4. Produce a booking action to record the revenue class.`,
userTpl: `Billing-basis extraction:
{{billingEntities}}

Scope of services: {{scopeSummary}}

Risk engine findings: {{riskFindings}}

Pursuit: {{pursuit}} / region: {{region}}

Return the recognition map JSON.`,
    schema: {
      obligations: [{ name: 'initial service', timing: 'point-in-time' }, { name: 'sustaining service', timing: 'over-time' }],
      deferralRisk: ['…'],
      booking: { revenueClass: '…', unbilled: '…' },
      recommendation: 'String'
    }
  });

  /* ---------------------------------------------------------------- */
  P.push({
    id: 'P05', code: 'LABOR-PRICE', name: 'Labor Rate & Indexation Review (dMPS)',
    category: 'Labor & Rate', tags: ['rate', 'CPI', 'indexation', 'labor', 'uncover'],
    summary: 'Reviews labor rate locks, indexation and volume re-learning risk for factory or site-based managed delivery.',
    system: `You are a pricing & margin controller for managed operation agreements.
Rules:
- Long-term rate lock without CPI/indexation = uncovered cost risk.
- Volume/site commitments need an annual re-base or guardrail.
- Always produce a run-rate guardrail: e.g., "rates floor 2% / cap 5%".`,
    userTpl: `Rate / indexation entities: {{entityTable}}
Term: {{term}}

Risk findings: {{riskfindings}}

Provide a pricing action plan.`,
    schema: [{ issue: '…', severity: '…', guardrail: '…', action: 'negotiate | price-in | accept' }]
  });

  /* ---------------------------------------------------------------- */
  P.push({
    id: 'P06', code: 'TERM-EXIT', name: 'Term, Auto-Renewal & Exit Strategy',
    category: 'Term & Renewal', tags: ['term', 'renewal', 'exit', 'lock'],
    summary: 'Cesses term length, renewal triggers, notice windows and exit ramp options.',
    system: `You are a negotiation-simulation coach for the pursuit team. You reason about term structures only.
- Clarity: risk collectors for auto-renew + no notice window.
- For years ≥ 4, propose exit-from-year-3 options.
- Never advise legal drafting outside a contract lawyer final pass.`,
    userTpl: `Term data: {{termVars}}
Risk findings: {{riskList}}

Recommend an exit & renewal strategy (as bullets for the sales armour).`,
    schema: { currentTerm: '…', renewTrigger: '…', noticeWindow: '…', strategy: ['…'], draftClause: '…' }
  });

  /* ---------------------------------------------------------------- */
  P.push({
    id: 'P07', code: 'DATA-SEC', name: 'Data Residency & Security-Standards Box',
    category: 'Data & Security', tags: ['GDPR', 'residency', 'CMMC', 'NIST', 'breach'],
    summary: 'Box checks data residency, sovereign tiers and security flow-down against client and regulation expectations.',
    system: `You are the data-protection & security-review node. For each applicable jurisdiction and security list you must bind facts to the extraction, no hallucinations.`,
    steps: `1. Determine residency tier(s) applicable to {{region}} and the entity feed.
2. Match security standards in the scope (NIST 800-171 / CMMC / FedRAMP / SOC 2 / ISO 27001).
3. Flag gap between regulation-implied security posture and contract-level commitments.
4. Output the compliance box.`,
    userTpl: `Processing & residency data: {{entityTable}}

Risk: {{risk}}

Output compliance box with dev in JSON.`,
    schema: [{ control: 'residency', current: '…', gap: '…', action: '…' }, { control: 'standards', current: '…', gap: '…' }]
  });

  /* ---------------------------------------------------------------- */
  P.push({
    id: 'P08', code: 'CUSTOM-FLAG', name: 'Custom Workflow / Red-Flag Parser',
    category: 'Custom & Ops', tags: ['custom', 'flagging', 'workflow', 'exceptions'],
    summary: 'Scan scope for custom account-provided watchwords / workflow risk markers (eg debt ratio, back-office, F&B) and surface them as flags.',
    system: `You are a catch-all flag parser. External handlers pass a list of custom keywords and predicates; you must extract matching sentences from the contract text and grade them.`,
    userTpl: `Custom flags library:
{{customRules}}

Extraction feed: {{entityTable}}

Body of text to scan: {{contractText}} (limited)

Output a JSON list, one entry per matched flag.`,
    schema: [{ flagId: 'FLAG-01', matchedText: '…', severity: 'High|Moderate|Compliant', recommendation: '…' }]
  });

  /* ---------------------------------------------------------------- */
  P.push({
    id: 'P09', code: 'AUDIT-REPORT', name: 'Audit-Ready Scoping Report Generator',
    category: 'Reporting', tags: ['report', 'export', 'review', 'risk register'],
    summary: 'Compiles ingestion/extraction/assessment/compliance into a single audit-ready executive report narrative.',
    system: `You are an audit-proofing writer. Produce an executive scoping report for internal review and pursuit leadership.
Rules:
- One summary sentence + a section per domain.
- Every finding includes an audited reference from the extraction, a recommendation, and a suggested clause.
- Tone: neutral, fact-based, no hyperbole.`,
    userTpl: `Toolkit outputs to compile:
- Scope summary: {{scopeSummary}}
- Extraction table: {{entityTable}}
- Risk findings: {{riskFindings}}
- Compliance cross-check: {{complianceMatrix}}
Pursuit: {{pursuitVersion}}

Declared governance: {{policies}}

Generate the report as markdown (title, meta, exec summary, domain sections, compliance matrix, APPENDIX clauses).`,
    schema: 'Markdown document'
  });

  root.ContractScope = root.ContractScope || {};
  root.ContractScope.PROMPTS = P;
})(typeof window !== 'undefined' ? window : globalThis);