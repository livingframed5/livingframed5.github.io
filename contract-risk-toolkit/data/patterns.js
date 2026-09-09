/*
 * ============================================================================
 *  CONTRACT SCOPE PARSER — EXTRACTION PATTERN REGISTRY
 * ----------------------------------------------------------------------------
 *  Purpose : Named-entity / clause extraction rules for the
 *            Contract Ingestion & Scoping Parser layer.
 *  Layer   : Layer 2 (Extraction) of the toolkit architecture.
 *
 *  EDIT THIS FILE to add / tune extraction coverage for new contract types
 *  (e.g. public-cloud consumption terms, construction SOWs, SPLA).
 *
 *  Pattern shape:
 *    { re, label, mode: 'binary'|'text'|'number'|'percent'|'amount', conf }
 *
 *  conf        : confidence 0..1 (boosted when legalese triggers fire)
 *  capture().  optional map fn (m) => { value, detail }
 * ============================================================================
 */
(function (root) {
  'use strict';

  var ENTITIES = [
    /* ---- Identification ------------------------------------------------ */
    {
      id: 'contractType',
      label: 'Contract instrument',
      category: 'Identification',
      weight: 0,
      patterns: [
        { re: /\bMaster Services Agreement\b/gi, mode: 'binary', conf: 0.95, value: 'Master Services Agreement (MSA)' },
        { re: /\bMSA\b/gi, mode: 'binary', conf: 0.9, value: 'MSA' },
        { re: /\bFramework Agreement\b/gi, mode: 'binary', conf: 0.9, value: 'Framework Agreement' },
        { re: /\bStatement of Work\b/gi, label: 'SOW', mode: 'binary', conf: 0.95, value: 'Statement of Work (SOW)' },
        { re: /\bSOW\b/gi, mode: 'binary', conf: 0.85, value: 'SOW' },
        { re: /\bRequest for Proposal\b/gi, mode: 'binary', conf: 0.95, value: 'RFP' },
        { re: /\bRFP\b/gi, mode: 'binary', conf: 0.85, value: 'RFP' }
      ]
    },

    /* ---- TERM & TERMINATION ------------------------------------------- */
    {
      id: 'termLength',
      label: 'Initial term length',
      category: 'Term & Renewal',
      weight: 6,
      patterns: [
        { re: /\bminimum\s+(?:term|commitment|period)\s*(?:of|shall be)?\s*(\d{1,3})\s*(month|year)s?\b/gi,
          mode: 'number', value: termYears, capture: termDetail },
        { re: /\bterm\b[^.\n]{0,80}?\(\s*(\d{1,3})\s*\)\s*(month|year)s?\b/gi,
          mode: 'string', value: termYears, capture: termDetail },
        { re: /\bterm\b[^.\n]{0,80}?\b(\d{1,3})\s*(month|year)s?\b/gi,
          mode: 'string', value: termYears, capture: termDetail },
        { re: /\bfor\s+a\s+period\s+of\s+(?:(\d{1,3})\s+(months?|years?)|[a-z]+)\b/gi,
          mode: 'string', value: termYears, capture: termDetail }
      ]
    },

    {
      id: 'autoRenewal',
      label: 'Auto-renewal',
      category: 'Term & Renewal',
      weight: 6,
      patterns: [
        { re: /\bautomatically\s+renew(?:s|ed)?\b/gi, mode: 'binary', conf: 0.95, value: 'Auto-renews' },
        { re: /\brenew(?:s|ed)?\s+for\s+(?:another|each\s+successive|successive|an\s+additional|consecutive)/gi, mode: 'binary', conf: 0.9, value: 'Renews for successive terms' },
        { re: /\bsuccessive\s+(?:one\s+)?(\d+)?\s*(?:month|year)[s]?\s+(?:terms?|periods?)/gi, mode: 'binary', conf: 0.8, value: 'Successive renewal terms' },
        { re: /\brenew\s+for\s+like\s+periods?\b/gi, mode: 'binary', conf: 0.85, value: 'Renews for like periods' }
      ]
    },

    {
      id: 'renewalNotice',
      label: 'Non-renewal notice window',
      category: 'Term & Renewal',
      weight: 6,
      patterns: [
        { re: /\b(?:given|provided|furnished)?\s*(?:\d{1,3})\s*(?:calendar\s+|business\s+)?days?['\s]?(?:prior|before)/gi,
          mode: 'text', capture: function (m) { return m[0].replace(/\s+/g, ' ').trim(); } },
        { re: /\bnon[- ]?renewal(?:\s+notice)?\b[^.\n]{0,90}?(\d{1,3})\s*(?:calendar\s+|business\s+)?days?/gi,
          mode: 'number', value: function (m) { return parseFloat(m[1]); }, capture: function (m) { return m[1] + ' days'; } },
        { re: /\bat\s+least\s+(\d{1,3})\s*(?:calendar\s+|business\s+)?days?\b/gi,
          mode: 'number', value: function (m) { return parseFloat(m[1]); }, capture: function (m) { return '\u2265 ' + m[1] + ' days'; } }
      ]
    },

    {
      id: 'terminationConvenience',
      label: 'Termination for convenience',
      category: 'Term & Renewal',
      weight: 6,
      patterns: [
        { re: /\bterminat(?:e|ion)\s*[^.**\n]{0,60}?\bfor\s+convenience\b/gi, mode: 'binary', conf: 0.92, value: 'Termination-for-convenience present' },
        { re: /\bterminat(?:e|ion)\s*[^.**\n]{0,60}?\band\s+without\s+cause\b/gi, mode: 'binary', conf: 0.85, value: 'Termination without cause' },
        { re: /\bprovides\s+no\s+right\s+to\s+terminat\w*\s+for\s+convenience\b/gi, mode: 'binary', conf: 0.7, value: 'No convenience termination' }
      ]
    },

    {
      id: 'terminationCause',
      label: 'Termination for cause / cure',
      category: 'Term & Renewal',
      weight: 4,
      patterns: [
        { re: /\bterminat(?:e|ion)\b[^.\n]{0,80}?\b(?:materially\s+)?breach\b/gi, mode: 'binary', conf: 0.85, value: 'Termination for breach' },
        { re: /\bcure\s+period\b[^.\n]{0,60}?(\d{1,3})\s*(?:calendar\s+|business\s+)?days?/gi,
          mode: 'text', capture: function (m) { return 'Cure: ' + m[1] + ' days'; } }
      ]
    },

    /* ---- SERVICE LEVELS & PENALTIES ------------------------------------ */
    {
      id: 'sla',
      label: 'Service level commitments',
      category: 'Service Levels',
      weight: 7,
      patterns: [
        { re: /\bservice\s+level(?:\s+agreement)?s?\b/gi, mode: 'binary', conf: 0.9, value: 'SLA present' },
        { re: /\b(?:uptime|availability)\b[^.\n]{0,30}?(\d{2}(?:\.\d{1,3})?)\s*%/gi,
          mode: 'percent', value: function (m) { return parseFloat(m[1]); }, capture: function (m) { return 'Availability ' + m[1] + '%'; } },
        { re: /\b(?:service\s+level\s*:\s*\d+|response\s+time)\b/gi, mode: 'binary', conf: 0.7, value: 'Response-time SLA' }
      ]
    },

    {
      id: 'slaPenalty',
      label: 'SLA penalty / service credit',
      category: 'Service Levels',
      weight: 8,
      patterns: [
        { re: /\b(?:service\s+credit|credit\s+request|penalt|monetary\s+penalt|failure\s+credits)\b/gi, mode: 'binary', conf: 0.9, value: 'SLA credits exist' },
        { re: /\b(\d{1,3})(?:\.\d)?\s*%\s*of\s+(?:the\s+)?(?:applicable\s+)?(?:monthly|annual|quarterly)\s+(?:fees?|revenue|service\s+fees?)\b/gi,
          mode: 'percent', value: function (m) { return parseFloat(m[1]); }, capture: function (m) { return 'Credit %: ' + m[1] + '% of fees'; } },
        { re: /\b(?:not\s+more\s+than|up\s+to|less\s+than)\s+(\d{1,3})(?:\.\d)?\s*%\s+of\s+(?:the\s+)?(?:monthly|quarterly|annual)\s+(?:fees?|revenue)\b/gi,
          mode: 'percent', value: function (m) { return parseFloat(m[1]); }, capture: function (m) { return 'Cap ' + m[1] + '% of fees'; } }
      ]
    },

    /* ---- LIABILITY & INDEMNITY ------------------------------------------ */
    {
      id: 'aggregateLiability',
      label: 'Aggregate liability / cap',
      category: 'Liability & Indemnity',
      weight: 8,
      patterns: [
        { re: /\baggregate\s+liabilit(?:y|ies)\b[^.\n]{0,110}?\s+(?:shall\s+not\s+exceed|not\s+to\s+exceed|limited\s+to|total)\s+([\d,]+(?:\.\d+)?)\b/gi,
          mode: 'amount', value: function (m) { return parseMoney(m[1]); }, capture: function (m) { return 'Cap ' + fmtMoney(m[1]); } },
        { re: /\b(?:fees?\s+(?:paid|payable)|remuneration)\b[^.\n]{0,70}?(\d{1,3})\s*(?:times|x)\s*(?:the)?\s*(?:annual|monthly|quarterly)\s+fees?\b/gi,
          mode: 'text', capture: function (m) { return 'Cap = ' + m[1] + 'x fees'; } },
        { re: /\baggregate\s+liabilit(?:y|ies)\b[^.\n]{0,90}?(\d{1,3})\s*%\s+of\s+(?:the\s+)?(?:contract\s+)?(?:price|value|fees)\b/gi,
          mode: 'percent', value: function (m) { return parseFloat(m[1]); }, capture: function (m) { return 'Cap = ' + m[1] + '% of contract'; } }
      ]
    },

    {
      id: 'uncappedLiability',
      label: 'Uncapped / unlimited liability',
      category: 'Liability & Indemnity',
      weight: 9,
      patterns: [
        { re: /\b(?:shall\s+be\s+unlimited|unlimited\s+liabilit)\b/gi, mode: 'binary', conf: 0.9, value: 'Unlimited liability' },
        { re: /\bno\s+limit\s+on\s+(?:liabilit|the\s+aggregate)\b/gi, mode: 'binary', conf: 0.85, value: 'No limit on liability' }
      ]
    },

    {
      id: 'indemnity',
      label: 'Indemnification duties',
      category: 'Liability & Indemnity',
      weight: 6,
      patterns: [
        { re: /\bindemnif\w*\b/gi, mode: 'binary', conf: 0.9, value: 'Indemnity present' },
        { re: /\b(to\s+|and\s+)?hold\s+harmless\b/gi, mode: 'binary', conf: 0.85, value: 'Hold harmless' },
        { re: /\bthird[- ]party\s+(?:claim[s]?|liabilit)/gi, mode: 'binary', conf: 0.85, value: 'Third-party claims' }
      ]
    },

    {
      id: 'indemnityExclusion',
      label: 'Indemnity carve-outs',
      category: 'Liability & Indemnity',
      weight: 5,
      patterns: [
        { re: /\b(?:except\s+(?:for|to\s+the\s+extent)|excluding|to\s+the\s+extent)\b[^.\n]{0,80}?\b(?:gross\s+negligence|wilful|willful|intentional\s+misconduct)\b/gi,
          mode: 'binary', conf: 0.85, value: 'Carve-out for gross negligence' }
      ]
    },

    /* ---- LABOR / LABOUR RATE RULES ------------------------------------- */
    {
      id: 'laborRate',
      label: 'Labor / hourly rates',
      category: 'Labor & Rate Risk',
      weight: 6,
      patterns: [
        { re: /\b(?:hourly\s+rate|rate\s+card|labou?r\s+rate|loaded\s+rate)\b/gi, mode: 'binary', conf: 0.9, value: 'Rate card present' },
        { re: /\b\$[\d,]+(?:\.\d{2})?\s*\/\s*(?:hr|hour)\b/gi, mode: 'text', capture: function (m) { return m[0].trim(); } }
      ]
    },

    {
      id: 'laborRateLock',
      label: 'Rate lock / escalation pressure',
      category: 'Labor & Rate Risk',
      weight: 6,
      patterns: [
        { re: /\b(?:rates?\s+(?:shall\s+)?not\s+(?:increase|change)|fixed\s+rate|rates?\s+held\s+flat)\b/gi, mode: 'binary', conf: 0.85, value: 'Rates locked' },
        { re: /\bno\s+(?:increase|escalation)\s+in\s+(?:the\s+)?(?:labor|labour|rates)\b/gi, mode: 'binary', conf: 0.8, value: 'No escalation' },
        { re: /indexation\s+of\s+(?:rates|labour\s+costs)/gi, mode: 'binary', conf: 0.85, value: 'Indexation required' }
      ]
    },

    {
      id: 'rateIndex',
      label: 'Rate indexation',
      category: 'Labor & Rate Risk',
      weight: 5,
      patterns: [
        { re: /\b(?:consumer\s+price\s+index|CPI)\b/gi, mode: 'binary', conf: 0.9, value: 'CPI link' },
        { re: /\b(?:proofstone|annual\s+escalation|escalat(e|ion)\s+clause|index(?:ation)?)\b/gi, mode: 'binary', conf: 0.75, value: 'Escalation mechanism' }
      ]
    },

    /* ---- BILLING, REV REC, COMMERCIAL ---------------------------------- */
    {
      id: 'billingBasis',
      label: 'Billing basis',
      category: 'Commercial & Revenue',
      weight: 6,
      patterns: [
        { re: /\b(?:billed?|invoic\w*)\b[^.\n]{0,50}?(?:monthly|quarterly|weekly)\b/gi, mode: 'binary', conf: 0.8, value: 'Periodic invoicing' },
        { re: /\b(?:milestone|upon\s+completion|upon\s+acceptance|upon\s+signing|per\s+deliverable)\b[^.\n]{0,40}?(?:bill|invoice|payment|closure)\b/gi,
          mode: 'binary', conf: 0.8, value: 'Milestone / event-based billing' },
        { re: /\bin\s+(?:advance|arrears)\b/gi, mode: 'binary', conf: 0.7, value: 'Timing: advance/arrear rule present' }
      ]
    },

    {
      id: 'revenueMultiYear',
      label: 'Multi-year commitment',
      category: 'Commercial & Revenue',
      weight: 4,
      patterns: [
        { re: /\b(?:minimum\s+commitment|guaranteed\s+fees|minimum\s+(?:annual|monthly)\s+(?:fees|value))\b/gi,
          mode: 'text', capture: function (m) { return m[0].trim(); } }
      ]
    },

    /* ---- REGULATORY & GOVERNMENT --------------------------------------- */
    {
      id: 'govTrigger',
      label: 'Gov/public-sector context',
      category: 'Regulatory',
      weight: 7,
      patterns: [
        { re: /\b(?:federal|state\s+(?:government|procurement)|provincial|public\s+sector|government\s+contract|agency|municipal)\b/gi, mode: 'binary', conf: 0.75, value: 'Public sector context' },
        { re: /\bprocurement\b/gi, mode: 'binary', conf: 0.7, value: 'Procurement language' }
      ]
    },

    {
      id: 'farDFARS',
      label: 'FAR / DFARS references',
      category: 'Regulatory',
      weight: 8,
      patterns: [
        { re: /\bFAR\b|\bFederal\s+Acquisition\s+Regulation\b/gi, mode: 'binary', conf: 0.9, value: 'FAR referenced' },
        { re: /\bDFARS\b|\bDefense\s+Federal\s+Acquisition\b/gi, mode: 'binary', conf: 0.9, value: 'DFARS referenced' },
        { re: /\bGSA\s+Schedule\b|\bGWAC\b|\bIT\s+Schedule\b/gi, mode: 'binary', conf: 0.85, value: 'Schedules vehicle' }
      ]
    },

    {
      id: 'clin',
      label: 'CLIN / ACRN structure',
      category: 'Regulatory',
      weight: 6,
      patterns: [
        { re: /\bCLIN\b|\bACRN\b|\bContract\s+Line\s+Item\b/gi, mode: 'binary', conf: 0.85, value: 'CLIN/ACRN referenced' }
      ]
    },

    {
      id: 'complianceStd',
      label: 'Security & compliance standards',
      category: 'Regulatory',
      weight: 7,
      patterns: [
        { re: /\bNIST\b|\bSP\s*800-171\b|\bCMMC\b|\bFedRAMP\b/gi, mode: 'binary', conf: 0.9, value: 'US-federal security standards' },
        { re: /\bISO\s*27001\b|\bSOC\s*2\b|\bPCI\s*DSS\b/gi, mode: 'binary', conf: 0.85, value: 'Industry security standard' }
      ]
    },

    /* ---- DATA & PRIVACY ------------------------------------------------ */
    {
      id: 'dataPrivacy',
      label: 'Personal data / privacy triggers',
      category: 'Data & Security',
      weight: 6,
      patterns: [
        { re: /\bGDPR\b|\bGeneral\s+Data\s+Protection\s+Regulation\b/gi, mode: 'binary', conf: 0.95, value: 'GDPR' },
        { re: /\bHIPAA\b|\bHITECH\b/gi, mode: 'binary', conf: 0.95, value: 'HIPAA/HITECH' },
        { re: /\bpersonal\s+data\b|\bpersonal\s+information\b|\bPII\b/gi, mode: 'binary', conf: 0.85, value: 'Personal data processing' },
        { re: /\bdata\s+processing\s+(?:agreement|addendum)\b|\bprocessing\s+addendum|\bDPA\b/gi, mode: 'binary', conf: 0.85, value: 'Data-processing agreement referenced' }
      ]
    },

    {
      id: 'dataResidency',
      label: 'Data residency / locality',
      category: 'Data & Security',
      weight: 6,
      patterns: [
        { re: /\bdata\s+residenc|\bdata\s+locali[sz]\b|\bexpatriat|\bdata\s*center[s]?\s+locat|\bplace[s]?\s+of\s+storage/gi, mode: 'binary', conf: 0.9, value: 'Residency / locality clauses' },
        { re: /\bonsh[o0]re|\boffshore|\bcountry(?:ies)?\s+of\s+processing\b/gi, mode: 'binary', conf: 0.7, value: 'Onshore/offshore split' }
      ]
    },

    /* ---- SECURITY & OPS BACKSTOP --------------------------------------- */
    {
      id: 'insurance',
      label: 'Insurance & COI',
      category: 'Commercial',
      weight: 4,
      patterns: [
        { re: /\binsurance\b[^.\n]{0,80}?(?:limit|coverage|\$[\d,]+|profil)/gi, mode: 'binary', conf: 0.75, value: 'Insurance obligations' },
        { re: /\bCOI\b|\bcertificate\s+of\s+insurance\b/gi, mode: 'binary', conf: 0.9, value: 'COI requested' }
      ]
    },

    {
      id: 'subcontract',
      label: 'Subcontracting controls',
      category: 'Commercial',
      weight: 4,
      patterns: [
        { re: /\bsubcontract(?:ing|ed|or)?s?\b/gi, mode: 'binary', conf: 0.9, value: 'Subcontract language' }
      ]
    },

    {
      id: 'assignment',
      label: 'Assignment / change of control',
      category: 'Commercial',
      weight: 3,
      patterns: [
        { re: /\b(?:assignment|novat(?:ion|e))\b/gi, mode: 'binary', conf: 0.85, value: 'Assignment restrictions' },
        { re: /\bchange\s+of\s+control\b/gi, mode: 'binary', conf: 0.8, value: 'Change-of-control trigger' }
      ]
    },

    {
      id: 'forceMajeure',
      label: 'Force majeure',
      category: 'Commercial',
      weight: 3,
      patterns: [
        { re: /\bforce\s+majeure\b/gi, mode: 'binary', conf: 0.95, value: 'Force majeure clause present' }
      ]
    },

    {
      id: 'changeControl',
      label: 'Change control / variation',
      category: 'Commercial',
      weight: 3,
      patterns: [
        { re: /\bchange\s+control\b|\bchange\s+request\b|\bvariation\b/gi, mode: 'binary', conf: 0.75, value: 'Change control present' }
      ]
    }
  ];

  /* ---- helpers -------------------------------------------------------- */
  function termYears(m) {
    var n = parseFloat(m[1]);
    if (isNaN(n)) return n;
    return String(m[2] || '').charAt(0).toLowerCase() === 'y' ? n : n / 12;
  }
  function termDetail(m) {
    var n = m[1];
    var u = String(m[2] || '').toLowerCase();
    if (n === undefined) return (m[0] || '').trim();
    if (u.charAt(0) === 'y') return n + (n === '1' ? ' year' : ' years');
    return n + (n === '1' ? ' month' : ' months');
  }
  function parseMoney(s) { return parseFloat(String(s).replace(/[$,]/g, '')); }
  function fmtMoney(s) { return '$' + parseInt(s, 10).toLocaleString('en-US'); }

  root.ContractScope = root.ContractScope || {};
  root.ContractScope.ENTITIES = ENTITIES;
})(window);