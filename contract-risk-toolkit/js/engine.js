/*
 * CONTRACT SCOPE TOOLKIT — ENGINE CORE (Layers 1-4)
 * segment()  -> clause segmentation
 * runEntities() -> Layer-2 extraction (data/patterns.js)
 * evaluate() -> Layer-3 rules + Layer-4 compliance xref (data/rules.js)
 * analyze()  -> end-to-end pipeline entry point
 */
(function (root) {
  'use strict';

  /* ---------------- 1. Segmentation ----------------------------------- */
  function segment(text) {
    if (!text) return [];
    var blocks = [];
    var cur = null, pos = 0;
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();
      var len = line.length;
      if (t) {
        if (isHeading(t)) {
          cur = { index: blocks.length, title: t, start: pos, end: pos + len, body: '' };
          blocks.push(cur);
        } else {
          if (!cur) { cur = { index: 0, title: 'Preamble', start: 0, end: 0, body: '' }; blocks.push(cur); }
          cur.body += (cur.body ? ' ' : '') + t;
        }
      }
      pos += len + 1;
    }
    if (blocks.length === 1 && !blocks[0].body && blocks[0].title) {
      blocks[0].body = blocks[0].title;
      blocks[0].title = 'Contract body';
    }
    return blocks;
  }

  function isHeading(t) {
    if (t.length < 3 || t.length > 110) return false;
    if (/^(#+\s|\d+\.\s|\d+\)\s|\([a-z\d]\)\s)/i.test(t)) return true;
    if (t === t.toUpperCase() && /\s/.test(t) && t.length <= 90) return true;
    return false;
  }

  function blockAt(blocks, start) {
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].start <= start && start <= blocks[i].end + 2) return blocks[i];
    }
    return blocks[0] || null;
  }

  function snippet(text, start, pad) {
    pad = pad || 90;
    var s = Math.max(0, start - 30);
    var e = Math.min(text.length, start + pad);
    return (s > 0 ? '\u2026' : '') + text.slice(s, e).replace(/\s+/g, ' ').trim() + (e < text.length ? '\u2026' : '');
  }

  /* ---------------- 2. Layer-2 extraction ------------------------------ */
  function runEntities(text) {
    var hits = [];
    var blocks = segment(text);
    (root.ContractScope.ENTITIES || []).forEach(function (def) {
      (def.patterns || []).forEach(function (pat) {
        var re = new RegExp(pat.re.source, pat.re.flags);
        var m;
        while ((m = re.exec(text)) !== null) {
          if (m.index === re.lastIndex) re.lastIndex++;
          var value = typeof pat.value === 'function' ? pat.value(m) : (pat.value !== undefined ? pat.value : null);
          var det = pat.capture ? pat.capture(m) : m[0].trim();
          if (typeof det !== 'string') det = m[0].trim();
          var blk = blockAt(blocks, m.index);
          hits.push({
            entity: def.id,
            entityLabel: def.label,
            category: def.category,
            conf: pat.conf || 0.6,
            value: value,
            detail: det,
            raw: m[0].trim(),
            snippet: snippet(text, m.index, 100),
            start: m.index,
            clause: blk ? blk.index : 0,
            clauseTitle: blk ? blk.title : ''
          });
        }
      });
    });
    return hits;
  }

  function consolidate(hits) {
    var by = {};
    hits.forEach(function (h) { (by[h.entity] = by[h.entity] || []).push(h); });
    Object.keys(by).forEach(function (k) {
      by[k].sort(function (a, b) { return b.conf - a.conf; });
    });
    return { byEntity: by, total: hits.length };
  }

  /* ---------------- 3. Layer-3 rules + Layer-4 xref -------------------- */
  function evaluate(ctx) {
    var findings = [];
    (root.ContractScope.RULES || []).forEach(function (rule) {
      try {
        var f = rule.test(ctx);
        if (f) {
          findings.push({
            id: rule.id,
            category: rule.category,
            severity: f.severity || rule.severity,
            weight: rule.weight,
            title: rule.title,
            evidence: f.evidence,
            recommendation: f.recommendation,
            suggestedClause: f.suggestedClause,
            hasRec: !!f.suggestedClause,
            flags: f.flags || {}
          });
        }
      } catch (e) { /* one rule failing never blocks the pass */ }
    });
    var compliance = (root.ContractScope.COMPLIANCE_MATRIX || []).map(function (row) {
      var pass = false;
      try { pass = !!row.test(ctx); } catch (e) { pass = false; }
      return {
        code: row.code,
        domain: row.domain,
        label: row.labeling || row.label || '',
        check: row.check || '',
        status: pass ? 'verified' : 'watch',
        flag: row.flag || 'Governance control'
      };
    });
    return { findings: findings, compliance: compliance };
  }

  function scoreFrom(findings, compliance) {
    var deduct = { high: 13, moderate: 6, low: 1 };
    var loss = 0;
    (findings || []).forEach(function (f) { loss += deduct[f.severity] || 0; });
    var verified = (compliance || []).filter(function (c) { return c.status === 'verified'; });
    var score = Math.max(0, Math.min(100, 100 - loss + (verified.length * 2)));
    var grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';
    return { score: Math.round(score), grade: grade, verified: verified.length };
  }

  /* ---------------- 4. Analyze pipeline -------------------------------- */
  function analyze(rawText, meta) {
    meta = meta || {};
    var text = rawText || '';
    var hits = runEntities(text);
    var grouped = consolidate(hits);

    var gov = !!meta.govPursuit;
    if (!gov && /government|federal|procurement|FAR|DFARS|CLIN|public sector/i.test(text)) gov = true;

    var ctx = { raw: text, hits: grouped.byEntity, gov: gov, meta: meta };
    var res = evaluate(ctx);
    var score = scoreFrom(res.findings, res.compliance);
    var blocks = segment(text);
    var type = (grouped.byEntity.contractType && grouped.byEntity.contractType[0]) ? grouped.byEntity.contractType[0].detail : 'Unstructured text';

    return {
      type: type,
      govContext: gov,
      textLen: text.length,
      blocks: blocks.length,
      mentions: hits.length,
      entities: grouped.byEntity,
      allHits: hits,
      findings: res.findings,
      compliance: res.compliance,
      score: score,
      scopeId: 'SC-' + Date.now().toString(36).toUpperCase(),
      analyzedAt: new Date().toISOString(),
      meta: meta
    };
  }

  root.ContractScope = root.ContractScope || {};
  root.ContractScope.engine = {
    segment: segment,
    runEntities: runEntities,
    consolidate: consolidate,
    evaluate: evaluate,
    scoreFrom: scoreFrom,
    analyze: analyze
  };
})(typeof window !== 'undefined' ? window : globalThis);