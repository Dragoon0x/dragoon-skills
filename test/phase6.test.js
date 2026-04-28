'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { buildMap } = require('../lib/map-engine');
const { generateResearch } = require('../lib/research-engine');
const { inventory } = require('../lib/inventory-engine');
const { generateInvestigate, generateSecondOpinion } = require('../lib/review-extra-engine');
const { landReport, canaryScript, generateStorybookScaffold, discoverComponents } = require('../lib/ship-extra-engine');
const { generateRetro, loadMemory, saveMemory, validKey, captureBenchmark, compareBenchmarks } = require('../lib/reflect-engine');
const {
  generateSkillScaffold, generateFigmaTokens, generateTailwindConfig,
  generateCarefulList, generateFreezeManifest, generateFreezeHook
} = require('../lib/power-engine');

function withTmp(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dragoon-p6-'));
  try { return fn(tmp); }
  finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_e) {} }
}

const minimalManifest = {
  version: '1.0.0',
  stack: { framework: 'react', styling: ['tailwind'], language: 'typescript' },
  tokens: {
    color: { palette: [
      { value: '#0a0a0a', count: 100, role: 'foreground' },
      { value: '#fafafa', count: 80, role: 'background' },
      { value: '#3b82f6', count: 30, role: 'accent' }
    ], totalDistinct: 8 },
    spacing: { values: [{ px: 8, count: 30 }], inferredGrid: 8, gridConfidence: 0.9 },
    type: { fontFamilies: [{ value: 'Inter', count: 50 }], fontSizes: [{ px: 16, count: 30 }, { px: 20, count: 10 }, { px: 25, count: 5 }], inferredScaleRatio: 1.25, scaleName: 'major-third', scaleConfidence: 0.9 },
    radius: { values: [{ px: 4, count: 5 }, { px: 8, count: 10 }, { px: 12, count: 3 }] },
    shadow: { values: [{ value: '0 1px 2px rgba(0,0,0,0.06)', count: 5 }] },
    motion: { durations: [{ ms: 200, count: 3 }], easings: [] },
    breakpoints: []
  },
  metrics: { files: { scanned: 5 }, components: { estimated: 2, averageSizeLines: 30 }, accessibility: {} },
  rules: { spacingGrid: 8, typeScaleRatio: 1.25, allowedColors: ['#0a0a0a', '#fafafa', '#3b82f6'] }
};

// ---------- map ----------

test('buildMap: counts files, finds hot files', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/util.ts'), 'export const x = 1;');
    fs.writeFileSync(path.join(tmp, 'src/a.ts'), `import { x } from './util';\nexport const a = x;`);
    fs.writeFileSync(path.join(tmp, 'src/b.ts'), `import { x } from './util';\nexport const b = x;`);
    const r = buildMap(tmp);
    assert.equal(r.totals.files, 3);
    const hot = r.hot[0];
    assert.equal(hot.rel, 'src/util.ts');
    assert.equal(hot.importedBy, 2);
  });
});

test('buildMap: detects external dep frequency', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/a.ts'), `import React from 'react';\nimport _ from 'lodash';`);
    fs.writeFileSync(path.join(tmp, 'src/b.ts'), `import React from 'react';`);
    const r = buildMap(tmp);
    const react = r.externals.find(e => e.name === 'react');
    assert.equal(react.count, 2);
    const lodash = r.externals.find(e => e.name === 'lodash');
    assert.equal(lodash.count, 1);
  });
});

// ---------- research ----------

test('generateResearch: writes template with topic and slug in path', () => {
  const f = generateResearch({ topic: 'Should we adopt graphql' });
  assert.match(f.relPath, /\.dragoon\/research\/research-should-we-adopt-graphql-\d{8}\.md$/);
  assert.match(f.content, /^# research: Should we adopt graphql/m);
  assert.match(f.content, /## the question/);
  assert.match(f.content, /## decision/);
});

// ---------- inventory ----------

test('inventory: categorizes correctly', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src/pages'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'src/components'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/components/Card.tsx'), 'export function Card(){return null;}');
    fs.writeFileSync(path.join(tmp, 'src/components/useFoo.ts'), 'export function useFoo(){}');
    fs.writeFileSync(path.join(tmp, 'src/pages/index.tsx'), 'export default function(){return null;}');
    fs.writeFileSync(path.join(tmp, 'src/components/Card.stories.tsx'), 'export default {};');
    fs.writeFileSync(path.join(tmp, 'src/components/tokens.css'), '');
    const r = inventory(tmp);
    assert.equal(r.summary.components, 1);
    assert.equal(r.summary.hooks, 1);
    assert.equal(r.summary.pages, 1);
    assert.equal(r.summary.stories, 1);
    assert.equal(r.summary.tokens, 1);
  });
});

// ---------- investigate / second-opinion ----------

test('generateInvestigate: produces template with hypotheses table', () => {
  const f = generateInvestigate({ symptom: 'form hangs' });
  assert.match(f.relPath, /investigate-form-hangs-\d{8}\.md$/);
  assert.match(f.content, /## hypotheses/);
  assert.match(f.content, /## root cause/);
  assert.match(f.content, /reproduce, predict, and explain/);
});

test('generateSecondOpinion: includes git context structure', () => {
  withTmp(tmp => {
    const f = generateSecondOpinion({ topic: 'caching strategy', root: tmp, includeFiles: [] });
    assert.match(f.content, /^# second opinion request: caching strategy/m);
    assert.match(f.content, /## constraints/);
    assert.match(f.content, /no files attached/);
  });
});

test('generateSecondOpinion: rejects path traversal in includeFiles', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'safe');
    const f = generateSecondOpinion({ topic: 'x', root: tmp, includeFiles: ['../../../etc/passwd', 'a.txt'] });
    // traversal silently dropped, safe file included
    assert.match(f.content, /a\.txt/);
    assert.doesNotMatch(f.content, /etc\/passwd/);
  });
});

test('generateSecondOpinion: caps long files at 200 lines', () => {
  withTmp(tmp => {
    const big = Array.from({ length: 500 }, (_, i) => `line ${i}`).join('\n');
    fs.writeFileSync(path.join(tmp, 'big.ts'), big);
    const f = generateSecondOpinion({ topic: 't', root: tmp, includeFiles: ['big.ts'] });
    assert.match(f.content, /truncated to first 200 lines/);
  });
});

// ---------- land / canary / storybook ----------

test('landReport: returns steps array with passed flag', () => {
  withTmp(tmp => {
    // not a real git repo but the function should handle gracefully
    const r = landReport(tmp);
    assert.ok(Array.isArray(r.steps));
    assert.equal(typeof r.passed, 'boolean');
  });
});

test('canaryScript: includes url, status, interval, and check function', () => {
  const s = canaryScript({ url: 'https://example.com', expectStatus: 200, intervalSeconds: 60 });
  assert.match(s, /URL="https:\/\/example\.com"/);
  assert.match(s, /EXPECT_STATUS=200/);
  assert.match(s, /INTERVAL=60/);
  assert.match(s, /check\(\)/);
});

test('canaryScript: rejects shell metacharacters in url', () => {
  // either parser-level rejection or our own metachar guard - both are "throw"
  assert.throws(
    () => canaryScript({ url: 'https://example.com"; rm -rf /;"', expectStatus: 200, intervalSeconds: 60 }),
    /invalid url|forbidden characters/
  );
});

test('canaryScript: rejects backtick injection even if url-parseable', () => {
  // backticks inside the path component pass URL parsing but are dangerous
  assert.throws(
    () => canaryScript({ url: 'https://example.com/`whoami`', expectStatus: 200, intervalSeconds: 60 }),
    /forbidden characters/
  );
});

test('canaryScript: rejects non-http protocols', () => {
  assert.throws(
    () => canaryScript({ url: 'file:///etc/passwd', expectStatus: 200, intervalSeconds: 60 }),
    /http and https/
  );
});

test('canaryScript: rejects unparseable url', () => {
  assert.throws(
    () => canaryScript({ url: 'not a url at all', expectStatus: 200, intervalSeconds: 60 }),
    /invalid url/
  );
});

test('canaryScript: rejects bad status code', () => {
  assert.throws(
    () => canaryScript({ url: 'https://example.com', expectStatus: 99, intervalSeconds: 60 }),
    /expectStatus/
  );
});

test('discoverComponents: finds PascalCase exports', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/Card.tsx'), 'export function Card(){return null;}');
    fs.writeFileSync(path.join(tmp, 'src/Button.tsx'), 'export const Button = () => null;');
    fs.writeFileSync(path.join(tmp, 'src/Other.tsx'), 'function notExported(){return null;}');
    const found = discoverComponents(tmp);
    const names = found.map(f => f.name);
    assert.ok(names.includes('Card'));
    assert.ok(names.includes('Button'));
    assert.ok(!names.includes('Other'));
  });
});

test('generateStorybookScaffold: writes config + per-component story', () => {
  withTmp(tmp => {
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src/Card.tsx'), 'export function Card(){return null;}');
    const r = generateStorybookScaffold(tmp);
    const paths = r.files.map(f => f.relPath);
    assert.ok(paths.includes('.storybook/main.ts'));
    assert.ok(paths.includes('.storybook/preview.ts'));
    assert.ok(paths.some(p => p.endsWith('Card.stories.tsx')));
  });
});

// ---------- reflect ----------

test('generateRetro: includes template sections and date stamp', () => {
  withTmp(tmp => {
    const f = generateRetro({ root: tmp, weeks: 1 });
    assert.match(f.relPath, /retro-\d{8}\.md$/);
    assert.match(f.content, /## what shipped/);
    assert.match(f.content, /## what slipped/);
    assert.match(f.content, /## next week/);
  });
});

test('memory: validKey accepts good, rejects bad', () => {
  assert.equal(validKey('foo'), true);
  assert.equal(validKey('foo.bar'), true);
  assert.equal(validKey('foo-bar_baz'), true);
  assert.equal(validKey(''), false);
  assert.equal(validKey('FOO'), false);
  assert.equal(validKey('foo bar'), false);
  assert.equal(validKey('a'.repeat(100)), false);
  assert.equal(validKey('../etc'), false);
});

test('memory: save and load roundtrip', () => {
  withTmp(tmp => {
    saveMemory(tmp, { entries: { 'foo': 'bar' } });
    const m = loadMemory(tmp);
    assert.equal(m.entries.foo, 'bar');
    assert.ok(m.updatedAt);
  });
});

test('memory: missing file returns empty entries', () => {
  withTmp(tmp => {
    const m = loadMemory(tmp);
    assert.deepEqual(m.entries, {});
  });
});

test('captureBenchmark: returns shape with files, totalLines, capturedAt', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'a.css'), 'body{}');
    const b = captureBenchmark(tmp);
    assert.equal(typeof b.files, 'number');
    assert.equal(typeof b.totalLines, 'number');
    assert.ok(b.capturedAt);
  });
});

test('compareBenchmarks: returns deltas', () => {
  const a = { files: 10, totalLines: 100, scores: { overall: 80 } };
  const b = { files: 12, totalLines: 130, scores: { overall: 85 } };
  const d = compareBenchmarks(a, b);
  assert.equal(d.files, 2);
  assert.equal(d.totalLines, 30);
  assert.equal(d.scores.overall, 5);
});

// ---------- power tools ----------

test('generateSkillScaffold: writes 4 files into sandbox dir', () => {
  const files = generateSkillScaffold({ name: 'MySkill', description: 'tagline' });
  assert.equal(files.length, 4);
  assert.ok(files.every(f => f.relPath.startsWith('.dragoon/forge/')));
  // SKILL.md present
  assert.ok(files.some(f => f.relPath.endsWith('/SKILL.md') && f.content.includes('name: my-skill')));
  // script present
  assert.ok(files.some(f => f.relPath.endsWith('/scripts/my-skill.js')));
});

test('generateSkillScaffold: rejects bad names', () => {
  assert.throws(() => generateSkillScaffold({ name: '../etc' }));
  assert.throws(() => generateSkillScaffold({ name: '' }));
});

test('generateFigmaTokens: produces tokens-studio shape', () => {
  const json = generateFigmaTokens(minimalManifest);
  const o = JSON.parse(json);
  assert.ok(o.color);
  assert.ok(o.spacing);
  assert.ok(o.typography);
  assert.equal(o.color.foreground.value, '#0a0a0a');
  assert.equal(o.color.foreground.type, 'color');
  assert.equal(o.spacing.sm.value, '8px');
});

test('generateFigmaTokens: throws without manifest', () => {
  assert.throws(() => generateFigmaTokens(null));
});

test('generateTailwindConfig: includes all token categories', () => {
  const c = generateTailwindConfig(minimalManifest);
  assert.match(c, /colors:/);
  assert.match(c, /spacing:/);
  assert.match(c, /fontFamily:/);
  assert.match(c, /fontSize:/);
  assert.match(c, /borderRadius:/);
  assert.match(c, /transitionDuration:/);
  assert.match(c, /Inter/);
});

test('generateCarefulList: includes destructive command list', () => {
  const c = generateCarefulList();
  assert.match(c, /rm -rf/);
  assert.match(c, /git push --force/);
  assert.match(c, /sudo/);
});

test('generateFreezeManifest: rejects path traversal', () => {
  assert.throws(() => generateFreezeManifest({ paths: ['../etc'] }));
  assert.throws(() => generateFreezeManifest({ paths: ['/etc/passwd'] }));
});

test('generateFreezeManifest: accepts safe paths', () => {
  const json = generateFreezeManifest({ paths: ['src/legacy', 'docs/old'] });
  const o = JSON.parse(json);
  assert.deepEqual(o.paths, ['src/legacy', 'docs/old']);
});

test('generateFreezeHook: produces an executable bash script', () => {
  const s = generateFreezeHook();
  assert.match(s, /#!\/usr\/bin\/env bash/);
  assert.match(s, /freeze\.json/);
  assert.match(s, /staged/);
});
