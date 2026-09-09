/*
 * CONTRACT SCOPE TOOLKIT — QUERY ENGINE & REPORT BUILDER (Layers 2/5)
 *  buildPayload()   -> fills {{slot}} placeholders from a parsed scope
 *  simulatePrompt() -> deterministic sandbox AI answer per prompt code
 *  runPrompt()      -> returns filled prompt + sandbox result (API-ready)
 *  reporters        -> buildMarkdown / buildHtml / buildCsv / download
 */
(function (root) {
  'use strict';

  function mdTable(head, rows) {
    var out = ['| ' + head.join(' | ') + ' |',
      '| ' + head.map(function () { return '---'; }).join(' | ') + ' |'];
    (rows || []).forEach(function (r) {
      out.push('| ' + r.map(function (c) { return String(c == null ? '' : c).replace(/\|/g, '\\|').replace(/\n/g, ' '); }).join(' | ') + ' |');
    });
    return out.join('\n');
  }
  function escTable(head, rows) { return mdTable(head, rows); }

  function topHit(scope, key) { var a = scope.entities[key]; return a && a.length ? a[0] : null; }

  /* ---------------- Payload (fills {{slot}}s) -------------------------- */
  function buildPayload(scope) {
    if (!scope) return {};
    var rows = Object.keys(scope.entities).map(function (k) {
      var h = scope.entities[k][0];
      return [h.entityLabel || k, h.category, h.detail, Math.round(h.conf * 100) + '%'];
    });
    var riskRows = scope.findings.map(function (f) {
      return '- **[' + f.id + '] ' + f.severity.toUpperCase() + '** – ' + f.title + ' — evidence: ' + f.evidence;
    });
    if (!riskRows.length) riskRows = ['- No flagged findings on the current scope text.'];
    var compRows = [];
    (scope.compliance || []).forEach(function (c) {
      compRows.push([c.code, c.domain, c.label, c.check, c.status]);
    });
    var term = topHit(scope, 'termLength');
    var summaryPieces = [];
    summaryPieces.push('instrument=' + scope.type);
    summaryPieces.push('govContext=' + (scope.govContext ? 'yes' : 'no'));
    if (scope.meta.pursuit) summaryPieces.push('pursuit=' + scope.meta.pursuit);
    if (scope.meta.region) summaryPieces.push('region=' + scope.meta.region);
    if (scope.meta.acv) summaryPieces.push('acv=' + scope.meta.acv);
    summaryPieces.push('score=' + scope.score.score + '/' + scope.score.grade);

    return {
      scopeSummary: summaryPieces.join(' | '),
      entityTable: rows.length ? escTable(['Variable', 'Domain', 'Value', 'Confidence'], rows) : 'No variables extracted',
      riskFindings: riskRows,
      riskList: riskRows,
      riskItems: scope.findings.map(function (f) { return f.id + ' ' + f.title; }).join('; '),
      complianceMatrix: compRows.length ? escTable(['Code', 'Domain', 'Control', 'Check', 'Status'], compRows) : 'No compliance rows',
      term: term ? term.detail : 'n/a',
      termVars: [topHit(scope, 'termLength'), topHit(scope, 'autoRenewal'), topHit(scope, 'renewalNotice')].filter(Boolean).map(function (h) { return h.detail; }).join(' · '),
      billingEntities: topHit(scope, 'billingBasis') ? topHit(scope, 'billingBasis').detail : 'not located',
      pickupNotes: topHit(scope, 'govTrigger') ? topHit(scope, 'govTrigger').detail : 'n/a',
      pursuit: scope.meta.pursuit || 'Unnamed pursuit',
      govness: scope.govContext ? 'yes' : 'no',
      region: scope.meta.region || 'US',
      acv: scope.meta.acv || '$1.2M',
      securityStandards: topHit(scope, 'complianceStd') ? topHit(scope, 'complianceStd').detail : 'no standard named',
      customRules: (scope.meta.customRules || []).join('; ') || 'none configured',
      contractText: scope.raw || 'no text',
      entityFeed: rows.map(function (r) { return r[0] + '=' + r[2]; }).join('; '),
      policies: 'Order booking (MCT) · labor tracking (MOT) · revenue recognition (ASC 606 / IFRS 15)'
    };
  }

  function fillSlots(tpl, payload) {
    return String(tpl).replace(/{{(\w+)}}/g, function (_, name) {
      var v = payload[name];
      if (v === undefined) return '{{' + name + '}}';
      return Array.isArray(v) ? v.join('\n') : String(v);
    });
  }

  /* ---------------- Sandbox AI behavior -------------------------------- */
  function simulatePrompt(prompt, scope) {
    var findings = scope.findings || [];
    var p = buildPayload(scope);
    var code = prompt.code;
    var main = findings.filter(function (f) { return f.severity === 'high'; });
    var out;

    if (code === 'GOV-XREF') {
      out = {
        instrument: scope.type,
        clinOrStructure: topHit(scope, 'clin') ? 'CLIN/ACRN referenced' : 'absent',
        gaps: main.map(function (f) { return f.id + ' – ' + f.title; }),
        next: 'Confirm FAR/DFARS flow-downs with procurement; map CLIN structure before order entry.',
        stance: scope.govContext ? 'Escalate to gov-contract team' : 'Not a government scope'
      };
    } else if (code === 'SLA-SCORER') {
      var pen = topHit(scope, 'slaPenalty');
      out = {
        creditBasis: pen ? pen.detail : 'no credit mechanism found',
        worstCase: pen && pen.value > 0 ? pen.value + '% of applicable monthly fees per event' : 'n/a',
        guardrail: pen && pen.value >= 1 ? 'Cap total credits at ' + Math.min(10, Math.round(pen.value / 2)) + '% of monthly fees; exclude customer-caused outages.' : 'No cap-driven action triggered.',
        notes: findings.filter(function (f) { return /SLA/.test(f.id); }).map(function (f) { return f.recommendation; })
      };
    } else if (code === 'LIAB-CAP') {
      out = {
        capBasis: topHit(scope, 'aggregateLiability') ? topHit(scope, 'aggregateLiability').detail : 'none found',
        uncapped: !!topHit(scope, 'uncappedLiability'),
        stance: (topHit(scope, 'uncappedLiability') || !topHit(scope, 'aggregateLiability')) ? 'NEED NEGOTIATION' : 'acceptable with guardrails',
        suggestedClauses: findings.filter(function (f) { return f.suggestedClause; }).map(function (f) { return f.suggestedClause; })
      };
    } else if (code === 'REV-REC') {
      var bill = topHit(scope, 'billingBasis');
      out = {
        obligations: [
          { name: 'Implementation/onboarding', timing: bill && /milestone|accept|complete|signing/i.test(bill.detail) ? 'point-in-time candidate' : 'over-time' },
          { name: 'Sustained managed service', timing: 'over-time (ASC 606 blending)' }
        ],
        deferralRisks: bill && /milestone|event/i.test(bill.detail) ? ['Milestone invoices vs over-time revenue', 'Unbilled receivable alignment'] : ['Confirm absent billing-basis entity'],
        bookingAction: scope.govContext ? 'Register under Gov (T&M/unit price) revenue class' : 'Managed-services recurring class; monitor unbilled'
      };
    } else if (code === 'LABOR-PRICE') {
      out = {
        issues: findings.filter(function (f) { return /LBR/.test(f.id); }).map(function (f) { return { issue: f.evidence, severity: f.severity, guardrail: f.suggestedClause }; }),
        recommendation: topHit(scope, 'rateIndex')
          ? 'Indexation present — add volume re-base on site count.'
          : (topHit(scope, 'laborRateLock') ? 'Rate lock w/o indexation — price in a 2% floor / 5% cap.' : 'Confirm labor cost model & add escalation for dMPS factory scopes.')
      };
    } else if (code === 'TERM-EXIT') {
      out = {
        currentTerm: topHit(scope, 'termLength') ? topHit(scope, 'termLength').detail : 'not parsed',
        renewTrigger: topHit(scope, 'autoRenewal') ? 'automatic renewal' : 're-commercial / re-bid',
        noticeWindow: topHit(scope, 'renewalNotice') ? topHit(scope, 'renewalNotice').detail : 'no window located',
        strategy: ['Exit-from-year-3 for terms >= 4 years', 'Mutual 120-day non-renewal notice', 'Cap renewal commitment to preceding period'],
        draftClause: 'Either Party may provide non-renewal notice 120 days before term end; renewal carries no minimum commitment beyond the prior period.'
      };
    } else if (code === 'DATA-SEC') {
      out = {
        box: [
          { control: 'data residency', current: topHit(scope, 'dataResidency') ? topHit(scope, 'dataResidency').detail : 'not located', action: topHit(scope, 'dataResidency') ? 'keep annex' : 'define onshore/offshore processing' },
          { control: 'security standards', current: topHit(scope, 'complianceStd') ? topHit(scope, 'complianceStd').detail : 'none enumerated', action: 'map to SOW appendix' }
        ],
        riskLinks: findings.filter(function (f) { return /DAT|SEC/.test(f.id); }).map(function (f) { return f.id + ': ' + f.recommendation; })
      };
    } else if (code === 'CUSTOM-FLAG') {
      out = {
        flags: (scope.meta.customRules || []).map(function (w) {
          var found = scope.raw && scope.raw.toLowerCase().indexOf(String(w).toLowerCase()) >= 0;
          return { rule: w, detected: found, severity: found ? 'Moderate' : 'Compliant', recommendation: found ? 'Deep-dive with account team before sign-off.' : 'No term located for this watchword.' };
        })
      };
    } else if (code === 'AUDIT-REPORT') {
      out = { markdown: buildMarkdown(scope) };
    }
    return out;
  }

  function runPrompt(prompt, scope) {
    var payload = buildPayload(scope);
    var filled = fillSlots(prompt.userTpl, payload);
    var stepsTxt = Array.isArray(prompt.steps) ? prompt.steps.join('\n') : (prompt.steps || '');
    var systemTxt = prompt.system || '';
    return Promise.resolve({
      code: prompt.code,
      simulated: true,
      system: systemTxt,
      steps: stepsTxt,
      userPrompt: filled,
      payload: payload,
      result: simulatePrompt(prompt, scope)
    });
  }

  function topHitRate(s) { return topHit(s, 'rateIndex'); }

  /* ---------------- Report builders ------------------------------------- */
  function buildMarkdown(scope) {
    if (!scope) return '';
    var L = [];
    var count = { high: 0, moderate: 0, low: 0 };
    scope.findings.forEach(function (f) { count[f.severity] = (count[f.severity] || 0) + 1; });
    L.push('# Audit-Ready Scoping Report');
    L.push('');
    L.push('_' + scope.scopeId + '_ | analyzed ' + scope.analyzedAt + ' | instrument: **' + scope.type + '** | gov context: **' + (scope.govContext ? 'yes' : 'no') + '**');
    L.push('Compliance posture: **' + scope.score.grade + ' / ' + scope.score.score + '** with ' + scope.score.verified + ' governance controls verified.');
    L.push('');
    L.push('## 1. Executive summary');
    L.push('- ' + scope.findings.length + ' findings · ' + count.high + ' high, ' + count.moderate + ' moderate, ' + count.low + ' low');
    L.push('- ' + scope.mentions + ' entity matches across ' + scope.blocks + ' clause blocks.');
    L.push('');
    L.push('## 2. Extracted scope variables');
    L.push(mdTable(['Variable', 'Domain', 'Value', 'Confidence'], Object.keys(scope.entities).map(function (k) {
      var h = scope.entities[k][0];
      return [h.entityLabel || k, h.category, h.detail, Math.round(h.conf * 100) + '%'];
    })));
    L.push('');
    L.push('## 3. Risk register');
    if (scope.findings.length) {
      L.push(mdTable(['ID', 'Severity', 'Finding', 'Evidence', 'Recommendation'], scope.findings.map(function (f) {
        return [f.id, f.severity.toUpperCase(), f.title, f.evidence, f.recommendation];
      })));
    } else {
      L.push('No high/moderate findings surfaced on the current scope text.');
    }
    L.push('');
    L.push('## 4. Compliance cross-reference');
    L.push(mdTable(['Control', 'Domain', 'Check', 'Status'], scope.compliance.map(function (c) {
      return [c.code + ' · ' + c.label, c.domain, c.check, c.status];
    })));
    L.push('');
    L.push('## 5. Recommended clause bank');
    var recs = scope.findings.filter(function (f) { return f.suggestedClause; });
    if (recs.length) {
      L.push('_Pre-tested alternatives for pursuit and account teams_');
      recs.forEach(function (f, i) { L.push((i + 1) + '. **[' + f.id + ']** ' + f.suggestedClause); });
    } else {
      L.push('No guardrail clauses generated yet.');
    }
    return L.join('\n');
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function mdToHtml(md) {
    var lines = md.split('\n');
    var out = [];
    var i = 0;
    var inTable = false;
    while (i < lines.length) {
      var L = lines[i];
      if (/^\|/.test(L)) {
        if (!inTable) { out.push('<table>'); inTable = true; }
        var cells = L.split('|').slice(1, -1);
        var sepNext = i + 1;
        while (sepNext < lines.length && !lines[sepNext].trim()) sepNext++;
        var isHeader = sepNext < lines.length && /^\|/.test(lines[sepNext]) &&
          lines[sepNext].split('|').slice(1, -1).every(function (c) { return /^[\s\-:]+$/.test(c.trim()); });
        out.push('<tr>' + cells.map(function (c) {
          var tag = isHeader ? 'th' : 'td';
          return '<' + tag + '>' + esc(c.trim().replace(/\*\*/g, '')) + '</' + tag + '>';
        }).join('') + '</tr>');
        if (isHeader) { i += 2; continue; }
      } else {
        if (inTable) { out.push('</table>'); inTable = false; }
        var l = esc(L).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        if (/^##\s/.test(L)) out.push('<h2>' + l.slice(3) + '</h2>');
        else if (/^#\s/.test(L)) out.push('<h1>' + l.slice(2) + '</h1>');
        else if (/^(- )/.test(L)) out.push('<li>' + l.slice(2) + '</li>');
        else if (L.trim()) out.push('<p>' + l + '</p>');
      }
      i++;
    }
    if (inTable) out.push('</table>');
    return out.join('\n');
  }

  function buildHtml(scope) {
    if (!scope) return '';
    var md = buildMarkdown(scope);
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(scope.scopeId) + '</title>' +
      '<style>body{font:14px/1.55 -apple-system,Segoe UI,sans-serif;max-width:920px;margin:40px auto;color:#141426}' +
      'h1{font-size:22px;border-bottom:2px solid #303080}h2{font-size:17px;margin-top:26px}' +
      'table{border-collapse:collapse;width:100%;margin:14px 0}' +
      'th,td{border:1px solid #d5d5e8;padding:6px 8px;vertical-align:top;text-align:left}' +
      'th{background:#eef0ff}ul{margin:6px 0 6px 18px;padding:0}</style></head><body>' + mdToHtml(md) + '</body></html>';
  }

  function buildCsv(scope) {
    if (!scope) return 'id,severity,title\n';
    var rows = [['id', 'severity', 'category', 'title', 'evidence', 'recommendation', 'clause']];
    (scope.findings || []).forEach(function (f) {
      rows.push([f.id, f.severity, f.category, f.title, f.evidence, f.recommendation || '', f.suggestedClause || '']);
    });
    return rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  root.ContractScope = root.ContractScope || {};
  root.ContractScope.query = {
    buildPayload: buildPayload,
    fillSlots: fillSlots,
    simulatePrompt: simulatePrompt,
    runPrompt: runPrompt,
    buildMarkdown: buildMarkdown,
    buildHtml: buildHtml,
    buildCsv: buildCsv,
    download: download,
    topHit: topHit
  };
})(typeof window !== 'undefined' ? window : globalThis);