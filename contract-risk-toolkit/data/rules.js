/*
 * ============================================================================
 *  CONTRACT SCOPE TOOLKIT — RISK RULE ENGINE & COMPLIANCE CROSS-REFERENCE
 * ----------------------------------------------------------------------------
 *  Two structures live here:
 *
 *  1. RULES   — business / legal risk rules. Each returns a matching finding
 *               (or null). Evaluated by the assessment layer (Layer 3).
 *
 *  2. COMPLIANCE_MATRIX — regulatory cross-reference rows (Layer 4). Each row
 *      maps a governance control domain (order booking, labor tracking,
 *      revenue recognition, data) to regulations and a heuristic check.
 * ============================================================================
 */
(function (root) {
  'use strict';

  /* ---------------- shared rule helpers -------------------------------- */
  function hitsOf(ctx, id) {
    var h = ctx && ctx.hits ? ctx.hits[id] : null;
    if (!h) return [];
    return h.slice().sort(function (a, b) { return (b.conf || 0) - (a.conf || 0); });
  }
  function first(ctx, id) { var a = hitsOf(ctx, id); return a.length ? a[0] : null; }
  function firstHit(ctx, id) { return first(ctx, id); }
  function parseFloatRaw(v) { var n = typeof v === 'number' ? v : parseFloat(v); return isNaN(n) ? 0 : n; }
  function govContext(ctx) {
    if (ctx && ctx.gov) return true;
    return /government|federal|procurement|state\s+of|public\s+sector|FAR|DFARS|CLIN|agency/i.test(ctx.raw || '');
  }
  function govOk(ctx) { return govContext(ctx); }

  /* --------------------------------------------------------------------------
   *  RULES
   *  Each rule: { id, category, severity, weight, title, test(ctx) -> finding|null }
   *  finding: { evidence, recommendation, suggestedClause, severity?, flags? }
   * ------------------------------------------------------------------------ */
  var RULES = [

    /* ---------------- Term & Renewal ------------------------------------ */
    {
      id: 'TERM-301', category: 'Term & Renewal', severity: 'high', weight: 7,
      title: 'Automatic renewal without a workable opt-out window',
      test: function (ctx) {
        var auto = firstHit(ctx, 'autoRenewal');
        var notice = firstHit(ctx, 'renewalNotice');
        if (auto && !notice) {
          return { evidence: 'Contract auto-renews but the non-renewal notice obligation was not located.',
            recommendation: 'Add an explicit right to non-renew by written notice, no later than 90–120 days before the end of any term.',
            suggestedClause: 'This Agreement renews automatically unless either Party serves written notice of non-renewal at least 120 days before the end of the then-current term.' };
        }
        if (auto && notice) {
          var days = parseInt(notice.value, 10) || 0;
          if (days < 90) {
            return { evidence: 'Non-renewal window of \u201c' + notice.detail + '\u201d is tight against procurement lead-times.',
              recommendation: 'Negotiate a minimum 120-day non-renewal notice window.',
              suggestedClause: '\u2026no later than 120 days before the end of the term on mutual written notice\u2026' };
          }
        }
        return null;
      }
    },

    {
      id: 'TERM-302', category: 'Term & Renewal', severity: 'moderate', weight: 4,
      title: 'Long initial term without reciprocal early-exit',
      test: function (ctx) {
        var t = firstHit(ctx, 'termLength');
        var conv = firstHit(ctx, 'terminationConvenience');
        var gov = govOk(ctx);
        if (!t) return null;
        var years = typeof t.value === 'number' ? t.value : 0;
        var trigger = gov ? years >= 4 : years >= 4;
        if (trigger && !conv) {
          return { evidence: 'Initial term ' + (t.detail || '') + ' with no identified termination-for-convenience (gov context: ' + (gov ? 'yes' : 'no') + ').',
            recommendation: 'For ' + (gov ? 'government' : 'enterprise') + ' accounts, add exit rights from year 3 (180 days notice).',
            suggestedClause: 'From year three either party may terminate at the end of a calendar quarter on 180 days\u2019 written notice.' };
        }
        return null;
      }
    },

    {
      id: 'TERM-303', category: 'Term & Renewal', severity: 'moderate', weight: 3,
      title: 'Renewal ties in further financial commitments',
      test: function (ctx) {
        var auto = firstHit(ctx, 'autoRenewal');
        var comm = firstHit(ctx, 'revenueMultiYear');
        if (auto && comm) {
          return { evidence: 'Auto-renewal combined with "minimum commitment / guaranteed fees" language.',
            recommendation: 'Cap the renewal commitment to the then-current order value.',
            suggestedClause: 'No renewal period carries a minimum-fee commitment greater than the preceding period unless separately priced.' };
        }
        return null;
      }
    },

    /* ---------------- Service levels ------------------------------------ */
    {
      id: 'SLA-401', category: 'Service Levels', severity: 'high', weight: 8,
      title: 'SLA credit-heavy or uncapped credit exposure',
      test: function (ctx) {
        var h = firstHit(ctx, 'slaPenalty');
        if (!h) return null;
        var pct = parseFloatRaw(h.value);
        if (pct >= 5) {
          return { evidence: 'Service-credit exposure of ' + pct + '% of fees per incident.',
            recommendation: 'Cap total credits to ' + Math.min(10, Math.round(pct / 2)) + '% of the applicable month and exclude force majeure / customer-caused outages.',
            suggestedClause: 'Total SLA credits shall not exceed ' + Math.min(10, Math.round(pct / 2)) + '% of the applicable monthly fees in any calendar month.' };
        }
        if (pct >= 1) {
          return { evidence: 'Credit basis ' + pct + '% of fees exceeds the 1% benchmark model.',
            recommendation: 'Verify credit exposure against the account margin before acceptance.',
            severity: 'moderate',
            suggestedClause: 'Credits are the sole remedy for the SLA failure and are credited against the applicable month\u2019s fees.' };
        }
        return null;
      }
    },

    {
      id: 'SLA-402', category: 'Service Levels', severity: 'moderate', weight: 3,
      title: 'SLA commitment with no quantified remedy',
      test: function (ctx) {
        var sla = firstHit(ctx, 'sla');
        var pen = firstHit(ctx, 'slaPenalty');
        if (sla && !pen) {
          return { evidence: 'SLA present but no quantified service-credit / penalty remedy located.',
            recommendation: 'Attach a measurable credit formula to each service metric; avoid best-efforts language for SLA-regulated accounts.',
            suggestedClause: 'Each service metric is measured monthly against the Service Target; any failure triggers a Service Credit per the credit schedule.' };
        }
        return null;
      }
    },

    /* ---------------- Liability & indemnity ------------------------------ */
    {
      id: 'LIA-101', category: 'Liability & Indemnity', severity: 'high', weight: 9,
      title: 'Uncapped aggregate liability',
      test: function (ctx) {
        var uncapped = firstHit(ctx, 'uncappedLiability');
        var capped = firstHit(ctx, 'aggregateLiability');
        if (uncapped) {
          return { evidence: 'Unlimited-liability language located: \u201c' + uncapped.detail + '\u201d.',
            recommendation: 'Negotiate an aggregate cap referenced to contract value / trailing twelve-month fees.',
            suggestedClause: 'Each party\u2019s aggregate liability for all claims shall not exceed the total fees paid or payable by Client in the 12 months preceding the claim.' };
        }
        if (!capped) {
          return { severity: 'moderate',
            evidence: 'No aggregate-liability cap located in the parsed scope.',
            recommendation: 'If the MSA terms define an aggregate cap elsewhere, confirm it; otherwise add one.',
            suggestedClause: 'Add an aggregate liability cap priced at no more than 1x annual fees unless the deal is escalatable.' };
        }
        return null;
      }
    },

    {
      id: 'LIA-002', category: 'Liability & Indemnity', severity: 'moderate', weight: 3,
      title: 'Cap expressed as a low multiple / % of fees',
      test: function (ctx) {
        var h = firstHit(ctx, 'aggregateLiability');
        if (h && /x fees|times|%/.test(h.detail || '')) {
          return { evidence: 'Capped: \u201c' + h.detail + '\u201d.',
            recommendation: 'Benchmark cap against contract value; if below 100% of ACV confirm third-party claims are inside the cap.',
            suggestedClause: '\u2026not to exceed the greater of (a) 3x the LTM fees, or (b) the insurance proceeds actually recovered\u2026' };
        }
        return null;
      }
    },

    {
      id: 'IND-001', category: 'Liability & Indemnity', severity: 'high', weight: 8,
      title: 'Broad indemnity without carve-outs for negligence',
      test: function (ctx) {
        var ind = firstHit(ctx, 'indemnity');
        var excl = firstHit(ctx, 'indemnityExclusion');
        if (ind && !excl) {
          return { evidence: 'Indemnity duties located but no carve-out for gross negligence / wilful misconduct / client fault.',
            recommendation: 'Add standard carve-outs: (a) gross negligence or wilful misconduct, (b) failure of Client to follow documented instructions, (c) settlement without consent.',
            suggestedClause: 'Indemnity obligations exclude claims caused by (i) Payer\u2019s gross negligence or wilful misconduct, (ii) Client\u2019s failure to follow documented instructions, or (iii) settlement without Client\u2019s written consent.' };
        }
        return null;
      }
    },

    /* ---------------- Labor & rate -------------------------------------- */
    {
      id: 'LBR-001', category: 'Labor & Rate', severity: 'moderate', weight: 4,
      title: 'Long-term rate lock without indexation',
      test: function (ctx) {
        var lock = firstHit(ctx, 'laborRateLock');
        var idx = firstHit(ctx, 'rateIndex');
        var t = firstHit(ctx, 'termLength');
        if (lock && !idx) {
          var yrs = (t && typeof t.value === 'number') ? t.value : 0;
          var msg = 'Rates locked with no CPI/indexation located' + (yrs >= 3 ? ' over the ' + yrs + '-year horizon' : '') + '.';
          return { evidence: msg,
            recommendation: 'Add annual CPI/escalation guardrail (floor & cap) to protect labor margin on a ' + (yrs || 'TBD') + '-year deal.',
            severity: yrs >= 3 ? 'high' : 'moderate',
            suggestedClause: 'Each anniversary, the rate card re-bases to reflect the published wage index with a ' + (yrs >= 3 ? '2% floor / 5% cap' : 'guardrail') + ' on labor cost elements.' };
        }
        return null;
      }
    },

    {
      id: 'LBR-002', category: 'Labor & Rate', severity: 'moderate', weight: 3,
      title: 'Volume / site commitments without escalation',
      test: function (ctx) {
        var pop = /(sites|geography|factories|listening|manufacturing|dedicated)/i.test(ctx.raw || '');
        var idx = first(ctx, 'rateIndex');
        if (pop && idx) {
          return { evidence: 'Deal-scale language present while indexation only covers rates, not volume.',
            recommendation: 'Add annual re-base of volume commitments tied to a published index / plan.',
            suggestedClause: 'Volume commitments re-base each annual review against the published site-cost index attributable to the account.' };
        }
        return null;
      }
    },

    /* ---------------- Revenue recognition -------------------------------- */
    {
      id: 'REV-001', category: 'Revenue & Booking', severity: 'high', weight: 7,
      title: 'Event-based billing without over-time alignment',
      test: function (ctx) {
        var b = first(ctx, 'billingBasis');
        if (b && /milestone|event|upon\s*(acceptance|completion|signing)/i.test(b.detail || '')) {
          return { evidence: 'Event / milestone billing located: \u201c' + b.detail + '\u201d.',
            recommendation: 'For a managed-service revenue stream recognised over time (ASC 606 / IFRS 15), separate one-time deliverables (eg. license/implementation) from ongoing services so recognition is accurate.',
            revenueFlag: true,
            suggestedClause: 'One-time initialisation and ongoing service obligations are distinct segments; each revenue stream is recognised per its distinct pattern on the schedule.' };
        }
        return null;
      }
    },

    {
      id: 'REV-002', category: 'Revenue & Booking', severity: 'moderate', weight: 3,
      title: 'Multi-year commitment needs booking-threshold review',
      test: function (ctx) {
        var t = firstHit(ctx, 'termLength');
        if (!t) return null;
        var yrs = (typeof t.value === 'number') ? t.value : 0;
        if (yrs >= 4) return { evidence: 'Multi-year commitment detected over ' + yrs + ' years.',
          recommendation: 'Confirm order-booking & revenue-native classification against approval thresholds before order registers as booked.',
          suggestedClause: 'Order placement confirms committed term as per the assigned booking class.' };
        return null;
      }
    },

    /* ---------------- Data & security ------------------------------------ */
    {
      id: 'DAT-001', category: 'Data & Security', severity: 'high', weight: 8,
      title: 'Personal-data processing without a DPA term',
      test: function (ctx) {
        var p = first(ctx, 'dataPrivacy');
        if (p && ctx.raw && !/data\s+processing\s+(?:agreement|addendum)|processing\s*(?:terms|annex)|\bDPA\b/i.test(ctx.raw)) {
          return { evidence: 'Personal-data processing detected (' + p.detail + ') without a data-processing addendum in the parsed text.',
            recommendation: 'Execute a standard data-protection addendum + standard contractual clauses, define controller/processor roles and a DSR workflow.',
            suggestedClause: 'The Data Processing Annex (Schedule-2) forms part of this Agreement and binds both Parties.' };
        }
        return null;
      }
    },

    {
      id: 'DAT-002', category: 'Data & Security', severity: 'moderate', weight: 3,
      title: 'Data residency / locality terms missing',
      test: function (ctx) {
        var reg = first(ctx, 'dataResidency');
        if (!reg) {
          return { evidence: 'No explicit clause constraining the storage or movement of Client data.',
            recommendation: 'For sovereign/regulated accounts define data residency (onshore/offshore) up front.',
            suggestedClause: 'Client data shall be processed and stored only in [regions]; no transmission outside those countries without Client\u2019s prior written consent.' };
        }
        return null;
      }
    },

    {
      id: 'SEC-001', category: 'Data & Security', severity: 'moderate', weight: 4,
      title: 'Security-control requirements absent for regulated scope',
      test: function (ctx) {
        var gov = govOk(ctx);
        var regulated = /health|finance|defen[sz]e|public|utiliti/i.test(ctx.raw || '');
        if (!gov && !regulated) return null;
        var std = first(ctx, 'complianceStd');
        if (!std) {
          return { evidence: 'Regulated scope in play but no enumerated security standard (NIST 800-171 / CMMC / SOC 2 / ISO 27001) located.',
            recommendation: 'State the applicable security posture and flow-down obligations in the SOW before delivery planning.',
            suggestedClause: 'Provider shall maintain SOC 2 Type II (or equivalent) and implement NIST SP 800-171 controls per the applicable government appendices.' };
        }
        return null;
      }
    },

    /* ---------------- Procurement / government ---------------------------- */
    {
      id: 'GOV-001', category: 'Procurement', severity: 'high', weight: 8,
      title: 'Public-sector scope without FAR/DFARS/CLIN flow-down',
      test: function (ctx) {
        if (!govOk(ctx)) return null;
        var far = first(ctx, 'farDFARS');
        var clin = first(ctx, 'clin');
        if (!far && !clin) {
          return { evidence: 'Government/public-sector scope detected but the parsed text lacks FAR/DFARS or CLIN/ACRN references.',
            recommendation: 'Route pursuit to the government-contracting team; map FAR 52.212-4 terms and CLIN structure before booking.',
            flags: { procurement: true },
            suggestedClause: 'This SOW incorporates the FAR/DFARS clauses set out in the T&M/unit-price CLIN structure for all on-ordering.' };
        }
        return null;
      }
    },

    {
      id: 'GOV-002', category: 'Procurement', severity: 'moderate', weight: 3,
      title: 'Gov billing & CLIN alignment',
      test: function (ctx) {
        if (!govOk(ctx)) return null;
        var b = first(ctx, 'billingBasis');
        if (b) {
          return { evidence: 'Billing basis \u201c' + b.detail + '\u201d without evidenced CLIN alignment.',
            recommendation: 'Align the billing basis to the CLIN/ACRN so order-to-book flows cleanly and invoices reference the order number.',
            suggestedClause: 'Invoicing references the unique contract line item (CLIN) or order number for government accounts.' };
        }
        return null;
      }
    },

    /* ---------------- Commercial ----------------------------------------- */
    {
      id: 'INS-001', category: 'Commercial', severity: 'moderate', weight: 3,
      title: 'Insurance / COI obligations not located',
      test: function (ctx) {
        if (ctx.raw && !/insur|COI|evidence of insurance/i.test(ctx.raw)) return null;
        var ins = first(ctx, 'insurance');
        if (ins) return null;
        return { evidence: 'Insurance is referenced in scope but coverage limits / certificates not documented.',
          recommendation: 'Confirm GL / PL / cyber limits and obtain a certificate of insurance before go-live.',
          suggestedClause: 'Provider shall maintain commercial general liability, professional liability and cyber insurance per the Limits + COI Holder in the Implementation Plan.' };
      }
    },

    {
      id: 'SUB-001', category: 'Commercial', severity: 'moderate', weight: 3,
      title: 'Subcontracting without client consent',
      test: function (ctx) {
        var s = first(ctx, 'subcontract');
        if (s) return { evidence: 'Subcontracting language located; confirm client consent & flow-down.',
          recommendation: 'Add explicit client consent for subcontractors and flow down the agreement obligations to them.',
          suggestedClause: 'Provider may subcontract only on prior written notice and consent, always flowing downward all obligations and protections.' };
        return null;
      }
    },

    {
      id: 'OPL-001', category: 'Commercial', severity: 'low', weight: 1,
      title: 'Force majeure / change-control presence gaps',
      test: function (ctx) {
        var fm = first(ctx, 'forceMajeure');
        var cc = first(ctx, 'changeControl');
        if (!fm || !cc) return { evidence: (fm ? '' : 'Force majeure clause ') + (cc ? '' : 'change control ') + 'not located in scope.',
          recommendation: 'Complete the exhibit set (FM + change control) so ops can trigger, prohibit or veto.',
          suggestedClause: 'Insert a standard FM clause and a variation / change-control process for out-of-scope work.' };
        return null;
      }
    }
  ];

  /* ==========================================================================
   *  COMPLIANCE CROSS-REFERENCE MATRIX (Layer 4)
   *  Each row is a governance control the account team must confirm.
   *  test(ctx) -> true when the contract scope *references* the control.
   * ======================================================================== */
  var COMPLIANCE_MATRIX = [
    { code: 'FAR', domain: 'Procurement', labeling: 'Federal Acquisition Regulations (FAR 52… )',
      sequence: 'FAR flow-downs / commercial items common-clause 52.212-4', flag: 'Order booking sign-off', test: function (ctx) { return first(ctx, 'farDFARS'); } },
    { code: 'DFARS', domain: 'Defense / Cyber', labeling: 'DFARS 252.204-7012',
      check: 'DoD data + NIST SP 800-171 breach reporting', flag: 'Cyber posture & incident response',
      test: function (ctx) { return /DFARS|SP\s*800-171|CMMC|FedRAMP/i.test(ctx.raw || ''); } },
    { code: 'CLIN-ACRN', domain: 'Procurement', labeling: 'Contract Line Items / ACRN',
      check: 'Order booking and invoicing tied to CLIN', flag: 'Order booking & revenue coding',
      test: function (ctx) { return first(ctx, 'clin'); } },
    { code: 'TERM-BOOK', domain: 'Booking', labeling: 'Order-to-booking controls',
      check: 'Minimum term, auto-renew, commitments priced', flag: 'Booking & term control',
      test: function (ctx) { return first(ctx, 'termLength') || first(ctx, 'autoRenewal') || first(ctx, 'revenueMultiYear'); } },
    { code: 'REV-REC', domain: 'Revenue Recognition', labeling: 'ASC 606 / IFRS 15',
      check: 'over-time vs point-in-time, milestone billing impact', flag: 'Revenue recognition remediation',
      test: function (ctx) { return first(ctx, 'billingBasis'); } },
    { code: 'LABOR', domain: 'Labor', labeling: 'Cost-of-labor / rate framework',
      check: 'rate locks, escalation floors & caps, laboration', flag: 'Labor tracking & price uncover coverage',
      test: function (ctx) { return first(ctx, 'laborRate') || first(ctx, 'laborRateLock') || first(ctx, 'rateIndex'); } },
    { code: 'DATA-RES', domain: 'Data Protection', labeling: 'Data residency & sovereignty',
      check: 'onshore / offshore processing + movement', flag: 'Data placement review',
      test: function (ctx) { return first(ctx, 'dataResidency'); } },
    { code: 'CYBER', domain: 'Security', labeling: 'Security controls flow-down',
      check: 'cyber requirements w/ standards enumerated', flag: 'Security & incident-reporting review',
      test: function (ctx) { return first(ctx, 'complianceStd'); } }
  ];

  root.ContractScope = root.ContractScope || {};
  root.ContractScope.RULES = RULES;
  root.ContractScope.COMPLIANCE_MATRIX = COMPLIANCE_MATRIX;
})(typeof window !== 'undefined' ? window : globalThis);