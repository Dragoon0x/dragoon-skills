'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runShip, formatPrDescription } = require('../lib/ship-engine');
const { generateHandoff } = require('../lib/handoff-engine');
const { detectDrift } = require('../lib/docs-engine');

function withTmp(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dragoon-shipenv-'));
  try { return fn(tmp); }
  finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_e) {} }
}

const baseManifest = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  project: { name: 'sample', root: '/x' },
  stack: { framework: 'react', styling: ['tailwind'], language: 'typescript' },
  tokens: {
    color: { palette: [{ value: '#000', count: 10, role: 'foreground' }, { value: '#fff', count: 8, role: 'background' }], totalDistinct: 4 },
    spacing: { values: [{ px: 8, count: 20 }], inferredGrid: 8, gridConfidence: 0.95 },
    type: { fontFamilies: [{ value: 'Inter', count: 50 }], fontSizes: [{ px: 16, count: 30 }, { px: 20, count: 10 }], inferredScaleRatio: 1.25, scaleName: 'major-third', scaleConfidence: 0.9 },
    radius: { values: [{ px: 8, count: 5 }] },
    shadow: { values: [] },
    motion: { durations: [{ ms: 200, count: 3 }], easings: [{ value: 'cubic-bezier(0.4,0,0.2,1)', count: 2 }] },
    breakpoints: []
  },
  metrics: {
    files: { scanned: 5, css: 1, scss: 0, jsx: 0, tsx: 2, vue: 0, svelte: 0, html: 0 },
    components: { estimated: 2, averageSizeLines: 30 },
    accessibility: { imagesWithAlt: 0, imagesWithoutAlt: 0, buttonsWithLabel: 0, buttonsWithoutLabel: 0, ariaUsage: 0, semanticTagUsage: 0 }
  },
  rules: { spacingGrid: 8, typeScaleRatio: 1.25, allowedColors: ['#000', '#fff'] }
};

// ---------- ship engine ----------

test('runShip: clean manifest passes critique above threshold', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'dragoon.json'), JSON.stringify(baseManifest));
    const r = runShip(tmp, { threshold: 70 });
    const critiqueStep = r.steps.find(s => s.name === 'critique');
    assert.ok(critiqueStep);
    assert.equal(critiqueStep.status, 'ok');
  });
});

test('runShip: fails when threshold above achievable', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'dragoon.json'), JSON.stringify(baseManifest));
    const r = runShip(tmp, { threshold: 999 });
    assert.equal(r.passed, false);
  });
});

test('runShip: skips critique when flag set', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'dragoon.json'), JSON.stringify(baseManifest));
    const r = runShip(tmp, { skipCritique: true, skipSlop: true });
    assert.equal(r.steps.find(s => s.name === 'critique'), undefined);
    assert.equal(r.steps.find(s => s.name === 'slop'), undefined);
  });
});

test('runShip: detects high-severity slop', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'dragoon.json'), JSON.stringify(baseManifest));
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/Bad.tsx'), '<img src="x" /><p>Lorem ipsum dolor sit amet</p>');
    const r = runShip(tmp, { threshold: 0, skipCritique: true });
    const slop = r.steps.find(s => s.name === 'slop');
    assert.equal(slop.status, 'fail');
    assert.ok(slop.findings.length > 0);
  });
});

test('formatPrDescription: includes scores and changed files', () => {
  const r = {
    critique: { scores: { overall: 88, typography: 90, color: 85, spacing: 90, motion: 85, accessibility: 85, consistency: 90 } },
    steps: [
      { name: 'slop', status: 'ok', findings: [] }
    ],
    git: { changedFiles: ['src/a.tsx', 'src/b.tsx'] }
  };
  const md = formatPrDescription(r, 'add invites');
  assert.match(md, /## add invites/);
  assert.match(md, /design score: \*\*88\/100\*\*/);
  assert.match(md, /no high-severity findings/);
  assert.match(md, /src\/a\.tsx/);
});

// ---------- handoff engine ----------

test('generateHandoff: produces full markdown with palette table and components list', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/Card.tsx'), 'export function Card(){return null;}');
    fs.writeFileSync(path.join(tmp, 'src/Button.tsx'), 'export function Button(){return null;}');
    const f = generateHandoff({ root: tmp, manifest: baseManifest, feature: 'invites' });
    assert.match(f.relPath, /handoff-invites\.md$/);
    assert.match(f.content, /^# handoff: invites/m);
    assert.match(f.content, /Inter/);
    assert.match(f.content, /\| color \| role \| usage \|/);
    assert.match(f.content, /Card/);
    assert.match(f.content, /Button/);
  });
});

test('generateHandoff: handles missing manifest gracefully', () => {
  withTmp(tmp => {
    const f = generateHandoff({ root: tmp, manifest: null, feature: null });
    assert.match(f.content, /unknown/);
  });
});

// ---------- docs drift ----------

test('detectDrift: catches npm script that doesn\'t exist', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'echo' } }));
    fs.writeFileSync(path.join(tmp, 'README.md'), 'Run `npm run nope` to do the thing.');
    const r = detectDrift(tmp);
    const f = r.findings.find(x => x.rule === 'docs-001');
    assert.ok(f, 'expected docs-001 finding');
    assert.match(f.message, /nope/);
  });
});

test('detectDrift: catches broken file path reference', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'README.md'), 'See `src/missing.ts` for details.');
    const r = detectDrift(tmp);
    const f = r.findings.find(x => x.rule === 'docs-003');
    assert.ok(f);
    assert.match(f.snippet, /src\/missing\.ts/);
  });
});

test('detectDrift: existing file path is not flagged', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/exists.ts'), '');
    fs.writeFileSync(path.join(tmp, 'README.md'), 'See `src/exists.ts`.');
    const r = detectDrift(tmp);
    assert.equal(r.findings.filter(x => x.rule === 'docs-003').length, 0);
  });
});

test('detectDrift: catches undocumented npm scripts', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      name: 'x',
      scripts: { test: 'echo', deploy: 'echo', secret: 'echo' }
    }));
    fs.writeFileSync(path.join(tmp, 'README.md'), 'Run `npm run test` to test.');
    const r = detectDrift(tmp);
    const f = r.findings.find(x => x.rule === 'docs-004');
    assert.ok(f);
    assert.match(f.message, /aren't mentioned/);
  });
});

test('detectDrift: ignores http URLs in path-like inline code', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'README.md'), 'See `https://example.com/path.html`.');
    const r = detectDrift(tmp);
    assert.equal(r.findings.filter(x => x.rule === 'docs-003').length, 0);
  });
});
