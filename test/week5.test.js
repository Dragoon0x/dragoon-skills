'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateQaScaffold } = require('../lib/qa-engine');
const { runA11y, RULES: A11Y_RULES } = require('../lib/a11y-engine');
const { staticPerfScan, summarizeLighthouse, STATIC_RULES: PERF_RULES } = require('../lib/perf-engine');
const { generateDiffScaffold } = require('../lib/diff-engine');

function withTmp(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dragoon-w5-'));
  try { return fn(tmp); }
  finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_e) {} }
}

// ---------- qa ----------

test('qa: scaffold writes config, smoke spec, runner', () => {
  const files = generateQaScaffold({ stack: { framework: 'next' } });
  assert.equal(files.length, 3);
  assert.ok(files.find(f => f.relPath === 'playwright.config.ts'));
  assert.ok(files.find(f => f.relPath === 'tests/e2e/smoke.spec.ts'));
  assert.ok(files.find(f => f.relPath === 'tests/e2e/run.sh'));
});

test('qa: next.js stack uses port 3000 baseURL', () => {
  const files = generateQaScaffold({ stack: { framework: 'next' } });
  const config = files.find(f => f.relPath === 'playwright.config.ts');
  assert.match(config.content, /localhost:3000/);
});

test('qa: sveltekit stack uses port 5173', () => {
  const files = generateQaScaffold({ stack: { framework: 'sveltekit' } });
  const config = files.find(f => f.relPath === 'playwright.config.ts');
  assert.match(config.content, /localhost:5173/);
});

test('qa: smoke spec covers four cases', () => {
  const files = generateQaScaffold({ stack: { framework: 'next' } });
  const spec = files.find(f => f.relPath === 'tests/e2e/smoke.spec.ts');
  assert.match(spec.content, /home page loads/);
  assert.match(spec.content, /main heading visible/);
  assert.match(spec.content, /no console errors/);
  assert.match(spec.content, /no broken images/);
});

// ---------- a11y ----------

function findA11y(rule, content, ext) {
  return runA11y(content, ext).filter(f => f.rule === rule);
}

test('a11y RULES: every rule has id, name, severity, description, detect', () => {
  for (const r of A11Y_RULES) {
    assert.ok(r.id);
    assert.ok(r.name);
    assert.ok(['low', 'medium', 'high'].includes(r.severity));
    assert.ok(r.description);
    assert.equal(typeof r.detect, 'function');
  }
});

test('a11y-001: img missing alt fires', () => {
  const f = findA11y('a11y-001', '<img src="x.jpg" />', '.tsx');
  assert.equal(f.length, 1);
});

test('a11y-001: img with alt does not fire', () => {
  const f = findA11y('a11y-001', '<img src="x.jpg" alt="" />', '.tsx');
  assert.equal(f.length, 0);
});

test('a11y-002: empty button without label fires', () => {
  const f = findA11y('a11y-002', '<button onClick={x}></button>', '.tsx');
  assert.equal(f.length, 1);
});

test('a11y-002: button with text does not fire', () => {
  const f = findA11y('a11y-002', '<button>Click</button>', '.tsx');
  assert.equal(f.length, 0);
});

test('a11y-002: button with aria-label does not fire', () => {
  const f = findA11y('a11y-002', '<button aria-label="close"></button>', '.tsx');
  assert.equal(f.length, 0);
});

test('a11y-003: empty <a> without aria fires', () => {
  const f = findA11y('a11y-003', '<a href="/x"></a>', '.tsx');
  assert.equal(f.length, 1);
});

test('a11y-004: input without label fires', () => {
  const f = findA11y('a11y-004', '<input type="text" />', '.tsx');
  assert.equal(f.length, 1);
});

test('a11y-004: input matched by <label htmlFor> does not fire', () => {
  const f = findA11y('a11y-004', '<label htmlFor="email">Email</label><input id="email" type="text" />', '.tsx');
  assert.equal(f.length, 0);
});

test('a11y-004: hidden input does not fire', () => {
  const f = findA11y('a11y-004', '<input type="hidden" />', '.tsx');
  assert.equal(f.length, 0);
});

test('a11y-005: tabIndex=5 fires', () => {
  const f = findA11y('a11y-005', '<div tabIndex={5} />', '.tsx');
  assert.equal(f.length, 1);
});

test('a11y-005: tabIndex=0 does not fire', () => {
  const f = findA11y('a11y-005', '<div tabIndex={0} />', '.tsx');
  assert.equal(f.length, 0);
});

test('a11y-006: div with onClick alone fires', () => {
  const f = findA11y('a11y-006', '<div onClick={x}>x</div>', '.tsx');
  assert.equal(f.length, 1);
});

test('a11y-006: div with onClick + role + onKeyDown does not fire', () => {
  const f = findA11y('a11y-006', '<div onClick={x} role="button" onKeyDown={y}>x</div>', '.tsx');
  assert.equal(f.length, 0);
});

test('a11y-007: autoFocus fires', () => {
  const f = findA11y('a11y-007', '<input autoFocus />', '.tsx');
  assert.equal(f.length, 1);
});

test('a11y-008: low contrast color pair fires', () => {
  const css = `.weak { color: #cccccc; background: #ffffff; }`;
  const f = findA11y('a11y-008', css, '.css');
  assert.equal(f.length, 1);
});

test('a11y-008: high contrast pair does not fire', () => {
  const css = `.strong { color: #000000; background: #ffffff; }`;
  const f = findA11y('a11y-008', css, '.css');
  assert.equal(f.length, 0);
});

// ---------- perf ----------

test('perf RULES: every rule has id, name, severity', () => {
  for (const r of PERF_RULES) {
    assert.ok(r.id);
    assert.ok(r.name);
    assert.ok(['low', 'medium', 'high'].includes(r.severity));
  }
});

test('perf: catches img missing dimensions', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/x.tsx'), '<img src="hero.jpg" />');
    const findings = staticPerfScan(tmp);
    const dim = findings.filter(f => f.rule === 'perf-002');
    assert.ok(dim.length >= 1);
  });
});

test('perf: img with width/height does not fire perf-002', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/x.tsx'), '<img src="hero.jpg" width="100" height="100" />');
    const findings = staticPerfScan(tmp);
    assert.equal(findings.filter(f => f.rule === 'perf-002').length, 0);
  });
});

test('perf: catches sync script in HTML', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'index.html'), '<script src="big.js"></script>');
    const findings = staticPerfScan(tmp);
    assert.ok(findings.some(f => f.rule === 'perf-004'));
  });
});

test('perf: defer script does not fire', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'index.html'), '<script src="big.js" defer></script>');
    const findings = staticPerfScan(tmp);
    assert.equal(findings.filter(f => f.rule === 'perf-004').length, 0);
  });
});

test('perf: large image fires perf-001', () => {
  withTmp(tmp => {
    // create a 600KB stub
    fs.writeFileSync(path.join(tmp, 'big.jpg'), Buffer.alloc(600 * 1024));
    const findings = staticPerfScan(tmp);
    assert.ok(findings.some(f => f.rule === 'perf-001'));
  });
});

test('perf: small image does not fire perf-001', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'small.jpg'), Buffer.alloc(50 * 1024));
    const findings = staticPerfScan(tmp);
    assert.equal(findings.filter(f => f.rule === 'perf-001').length, 0);
  });
});

test('summarizeLighthouse: handles a sample report shape', () => {
  const report = {
    categories: {
      performance: { score: 0.85 },
      accessibility: { score: 0.92 },
      'best-practices': { score: 0.95 },
      seo: { score: 0.9 }
    },
    audits: {
      'largest-contentful-paint': { displayValue: '2.1s', score: 0.7 },
      'cumulative-layout-shift': { displayValue: '0.05', score: 0.95 },
      'unused-css-rules': { score: 0.5, title: 'Reduce unused CSS', description: 'remove unused', details: { overallSavingsMs: 800 } },
      'render-blocking-resources': { score: 0.6, title: 'Eliminate render-blocking', details: { overallSavingsMs: 400 } }
    }
  };
  const s = summarizeLighthouse(report);
  assert.equal(s.scores.performance, 85);
  assert.equal(s.scores.accessibility, 92);
  assert.equal(s.cwv.lcp, '2.1s');
  // failing audits sorted by savings desc
  assert.equal(s.failing[0].id, 'unused-css-rules');
  assert.equal(s.failing[1].id, 'render-blocking-resources');
});

test('summarizeLighthouse: returns null for malformed', () => {
  assert.equal(summarizeLighthouse({}), null);
  assert.equal(summarizeLighthouse(null), null);
});

// ---------- diff ----------

test('diff: scaffold writes 3 files', () => {
  const files = generateDiffScaffold({});
  assert.equal(files.length, 3);
  assert.ok(files.find(f => f.relPath === 'playwright.visual.config.ts'));
  assert.ok(files.find(f => f.relPath === 'tests/visual/routes.ts'));
  assert.ok(files.find(f => f.relPath === 'tests/visual/snapshots.spec.ts'));
});

test('diff: routes default to /', () => {
  const files = generateDiffScaffold({});
  const routes = files.find(f => f.relPath === 'tests/visual/routes.ts');
  assert.match(routes.content, /home/);
  assert.match(routes.content, /\/"/);
});

test('diff: custom routes echoed', () => {
  const files = generateDiffScaffold({
    routes: [{ path: '/about', name: 'about' }, { path: '/login', name: 'login' }]
  });
  const routes = files.find(f => f.relPath === 'tests/visual/routes.ts');
  assert.match(routes.content, /about/);
  assert.match(routes.content, /login/);
});

test('diff: spec uses toHaveScreenshot', () => {
  const files = generateDiffScaffold({});
  const spec = files.find(f => f.relPath === 'tests/visual/snapshots.spec.ts');
  assert.match(spec.content, /toHaveScreenshot/);
});
