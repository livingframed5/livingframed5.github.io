/*
 * CONTRACT SCOPE TOOLKIT — UI LAYER (Layer 6 presentation)
 *  Renders: ing/, extraction, assessment, prompt library, compliance, export.
 *  Global app state: window.CURR = { scope }.
 */
(function (root) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var sevClass = function (s) { return s === 'high' ? 'sev-high' : s === 'moderate' ? 'sev-mod' : 'sev-low'; };

  /* ---------------- meta from form ------------------------------------- */
  function readMeta() {
    return {
      pursuit: $('in-pursuit').value.trim(),
      region: $('in-region').value.trim(),
      acv: $('in-acv').value.trim(),
      govPursuit: $('in-gov').checked,
      customRules: $('in-rules').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    };
  }

  function setMeta(m) {
    $('in-pursuit').value = m.pursuit || '';
    $('in-region').value = m.region || '';
    $('in-acv').value = m.acv || '';
    $('in-gov').checked = !!m.govPursuit;
    $('in-rules').value = (m.customRules || []).join(', ');
  }

  /* ---------------- analyze -------------------------------------------- */
  function analyzeNow() {
    var raw = $('raw-input').value;
    var meta = readMeta();
    if (!raw.trim()) { alert('Paste an MSA / SOW / RFP excerpt first (or load a sample).'); return; }
    var scope = root.ContractScope.engine.analyze(raw, meta);
    root.Current = scope;
    refreshHeader();
    nav('extract');
    renderExtract(scope);
    renderAssess(scope);
    renderCompliance(scope);
    renderReport(scope);
  }

  function loadSample(key) {
    var s = root.ContractScope.SAMPLES[key];
    $('raw-input').value = s.text;
    setMeta(s);
    analyzeNow();
  }

  function refreshHeader() {
    var s = root.Current;
    if (!s) return;
    var chip = $('status-chip');
    chip.textContent = s.scopeId + ' · ' + s.type + ' · score ' + s.score.score + '/' + s.score.grade;
    chip.className = 'chip ' + (s.score.score >= 70 ? 'chip-ok' : s.score.score >= 55 ? 'chip-warn' : 'chip-bad');
  }

  /* ---------------- renderers ------------------------------------------ */
  function renderExtract(scope) {
    var meta = ['Scope ID: ' + scope.scopeId, 'Instrument: ' + esc(scope.type), 'Gov context: ' + (scope.govContext ? 'YES' : 'no'),
      'Clause blocks: ' + scope.blocks, 'Entity matches: ' + scope.mentions, 'Words: ' + scope.textLen].map(function (t) {
      return '<div class="stat">' + t + '</div>'; }).join('');
    $('extract-meta').innerHTML = meta;

    var rows = [];
    Object.keys(scope.entities).forEach(function (k) {
      var h = scope.entities[k][0];
      rows.push('<tr><td><b>' + esc(h.entityLabel) + '</b><div class="sub">' + esc(k) + '</div></td>' +
        '<td>' + esc(h.category) + '</td>' +
        '<td>' + esc(h.detail) + '</td>' +
        '<td><span class="conf">' + Math.round(h.conf * 100) + '%</span></td>' +
        '<td class="mono sm">clause ' + h.clause + ': ' + esc(h.clauseTitle || '(body)') + '</td></tr>');
    });
    $('extract-rows').innerHTML = rows.length ? rows.join('') :
      '<tr><td colspan="5" class="empty">No variables matched. Try the sample scopes or paste more complete section headers.</td></tr>';
    $('extract-count').textContent = Object.keys(scope.entities).length;
  }

  function renderAssess(scope) {
    var s = scope.score;
    var ring = '<div class="scorebox score-' + (s.grade) + '"><div class="num">' + s.score + '</div><div class="grade">' + s.grade + '</div>' +
      '<div class="meta-1">compliance posture · ' + s.verified + '/' + scope.compliance.length + ' controls verified</div></div>';
    var summary = [];
    var list = {
    };
    ['High', 'Moderate', 'Low'].forEach(function (lbl) {
      var count = scope.findings.filter(function (f) { return f.severity === lbl.toLowerCase(); }).length;
      summary.push('<span class="pill pill-' + lbl.toLowerCase() + '">' + lbl + ': ' + count + '</span>');
    });

    var cards = scope.findings.length ? scope.findings.map(function (f) {
      return '<div class="finding ' + sevClass(f.severity) + '">' +
        '<div class="f-head"><span class="f-sev">' + f.severity.toUpperCase() + '</span><span class="f-id">' + esc(f.id) + '</span><span class="f-cat">' + esc(f.category) + '</span></div>' +
        '<div class="f-title">' + esc(f.title) + '</div>' +
        '<div class="f-ev"><b>Evidence</b><br>' + esc(f.evidence) + '</div>' +
        '<div class="f-ev"><b>Recommendation</b><br>' + esc(f.recommendation) + '</div>' +
        (f.suggestedClause ? '<div class="f-clause"><b>Suggested clause</b><br>' + esc(f.suggestedClause) + '</div>' : '') +
        '</div>';
    }).join('') : '<div class="empty">No findings. Paste a scope and re-analyze, or load a sample with known clauses.</div>';

    $('assess-root').innerHTML =
      '<div class="assess-top"><div class="score-side">' + ring + '</div><div class="how"><div class="h3">Verdict map</div>' +
      summary.join(' ') +
      '<div class="legend">Rule engine flags deviations from the governance baseline (FAR/DFARS, ASC 606, laboration, order booking). ' +
      'Every finding cites an extracted variable and a suggested guardrail clause.</div></div></div>' +
      '<div class="find-grid">' + cards + '</div>';
  }

  function renderCompliance(scope) {
    var rows = scope.compliance.map(function (c) {
      return '<tr><td><b>' + esc(c.code) + '</b><div class="sub">' + esc(c.label) + '</div></td>' +
        '<td>' + esc(c.domain) + '</td>' +
        '<td>' + esc(c.check) + '</td>' +
        '<td><span class="chip ' + (c.status === 'verified' ? 'chip-ok' : 'chip-warn') + '">' + c.status + '</span></td>' +
        '<td class="sm">' + esc(c.flag) + '</td></tr>';
    }).join('');
    $('compliance-rows').innerHTML = rows || '<tr><td colspan="5">no rows</td></tr>';
  }

  /* ---------------- prompt library ------------------------------------- */
  function renderPrompts() {
    var pro = root,
      PRO = root.ContractScope.PROMPTS || [];
    var groups = {};
    var seen = [];
    PRO.forEach(function (p) {
      if (seen.indexOf(p.category) < 0) seen.push(p.category);
      (groups[p.category] = groups[p.category] || []).push(p);
    });
    var html = '<div class="prompt-filters">' + ['All'].concat(seen).map(function (g) {
      return '<button class="pf" data-g="' + esc(g) + '">' + esc(g) + '</button>';
    }).join('') + '</div>';
    html += '<div class="prompt-grid">' + PRO.map(function (p) {
      return '<div class="prompt-card" data-cat="' + esc(p.category) + '">' +
        '<div class="p-head"><span class="p-code">' + esc(p.code) + '</span><span class="p-cat">' + esc(p.category) + '</span></div>' +
        '<div class="p-name">' + esc(p.name) + '</div>' +
        '<div class="p-sum">' + esc(p.summary) + '</div>' +
        '<div class="p-meta">' + (p.tags && p.tags.length ? '<span class="tags">' + p.tags.map(function (t) { return '#' + esc(t); }).join(' ') + '</span>' : '') + '</div>' +
        '<details class="p-reveal"><summary>SYS·USR·STEPS</summary>' +
        '<div class="mono-sm"><b>System:</b><br>' + esc(p.system) + '</div>' +
        '<div class="mono-sm"><b>Steps:</b><br><pre>' + esc(Array.isArray(p.steps) ? p.steps.join('\n') : (p.steps || '')) + '</pre></div>' +
        '<div class="mono-sm"><b>User template:</b><br><pre>' + esc(p.userTpl) + '</pre></div>' +
        '<div class="mono-sm"><b>Output schema:</b><br><pre>' + esc(JSON.stringify(p.schema, null, 1)) + '</pre></div>' +
        '</details>' +
        '<div class="p-actions"><button class="btn btn-go" onclick="ContractScope.ui.runPrompt(\'' + p.id + '\')">Run sandbox</button>' +
        '<button class="btn btn-ghost" onclick="ContractScope.ui.copy(\'' + p.id + '\')">Copy spec</button></div>' +
        '<div class="p-result mono-sm" data-for="' + p.id + '"></div>' +
        '</div>';
    }).join('') + '</div>';
    $('prompt-root').innerHTML = html;
    bindPromptFilters();
  }

  function bindPromptFilters() {
    Array.prototype.forEach.call(document.querySelectorAll('.pf, .chip-prompt'), function () { });
    var btn = document.querySelectorAll('[data-g]');
    Array.prototype.forEach.call(btn, function (b) {
      b.addEventListener('click', function () {
        var g = b.getAttribute('data-g');
        Array.prototype.forEach.call(document.querySelectorAll('.prompt-card'), function (c) {
          c.style.display = (g === 'All' || c.getAttribute('data-cat') === g) ? '' : 'none';
        });
      });
    });
  }

  function runPrompt(id) {
    var p = (root.ContractScope.PROMPTS || []).find(function (x) { return x.id === id; });
    var target = document.querySelector('[data-for="' + id + '"]');
    if (!p) return;
    if (!root.Current) { target.innerText = 'Analyze a contract first.'; return; }
    root.ContractScope.query.runPrompt(p, root.Current).then(function (res) {
      var h = '';
      h += '<div class="out-label">generated ' + p.code + ' · ' + (res.simulated ? 'sandbox (heuristic)' : 'LLM') + '</div>';
      h += '<pre>' + esc(JSON.stringify(res.result, null, 2)) + '</pre>';
      target.innerHTML = h;
    });
  }

  function copyPrompt(id) {
    var p = root.ContractScope.PROMPTS.find(function (x) { return x.id === id; });
    if (!p) return;
    var payload = root.Current ? root.ContractScope.query.buildPayload(root.Current) : {};
    var txt = 'SYS:\n' + p.system + '\n\nUSR:\n' + (root.Current ? root.ContractScope.query.fillSlots(p.userTpl, payload) : p.userTpl);
    navigator.clipboard && navigator.clipboard.writeText(txt).then(function () {
      var b = document.activeElement; if (b) { var o = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = o; }, 1200); }
    });
  }

  /* ---------------- report / export ------------------------------------ */
  function renderReport(scope) {
    if (!scope) return;
    var md = root.ContractScope.query.buildMarkdown(scope);
    $('export-md').textContent = md;
    $('export-html').srcdoc = root.ContractScope.query.buildHtml(scope);
  }

  function exportFile(kind) {
    var s = root.Current;
    if (!s) return;
    var q = root.ContractScope.query;
    var fn = s.scopeId.toLowerCase();
    if (kind === 'md') q.download(fn + '.report.md', q.buildMarkdown(s), 'text/markdown');
    if (kind === 'html') q.download(fn + '.report.html', q.buildHtml(s), 'text/html');
    if (kind === 'csv') q.download(fn + '.risk-register.csv', q.buildCsv(s), 'text/csv');
    if (kind === 'json') q.download(fn + '.scope.json', JSON.stringify(s, null, 2), 'application/json');
  }

  /* ---------------- nav ------------------------------------------------- */
  function nav(name) {
    var panels = ['guide', 'ingest', 'extract', 'assess', 'prompts', 'compliance', 'export'];
    panels.forEach(function (p) {
      var el = $('panel-' + p);
      if (el) el.style.display = p === name ? 'block' : 'none';
    });
    var n = document.querySelectorAll('.nav a');
    Array.prototype.forEach.call(n, function (a) {
      a.classList.toggle('active', a.getAttribute('data-p') === name);
    });
    if (name === 'prompts') renderPrompts();
    if (name === 'export' && root.Current) renderReport(root.Current);
  }

  function printReport() {
    var win = window.open('', '_blank');
    if (win) { win.document.write(root.ContractScope.query.buildHtml(root.Current || {})); win.document.close(); win.print(); }
  }

  /* ---------------- theme ---------------------------------------------- */
  function getTheme() {
    var t = null;
    try { t = root.localStorage.getItem('ct-theme'); } catch (e) { t = null; }
    return t === 'dark' ? 'dark' : 'light';
  }
  function setTheme(t) {
    if (t !== 'dark') t = 'light';
    root.document.body.setAttribute('data-theme', t);
    var b = $('theme-toggle');
    if (b) b.textContent = t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    try { root.localStorage.setItem('ct-theme', t); } catch (e) { /* storage unavailable */ }
  }
  function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  root.ContractScope = root.ContractScope || {};
  root.ContractScope.ui = {
    analyzeNow: analyzeNow,
    loadSample: loadSample,
    nav: nav,
    renderPrompts: renderPrompts,
    runPrompt: runPrompt,
    copyPrompt: copyPrompt,
    exportFile: exportFile,
    printReport: printReport,
    refreshHeader: refreshHeader,
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    esc: esc
  };
  setTheme(getTheme());
})(window);