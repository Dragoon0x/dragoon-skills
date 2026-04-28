'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateBrief, generatePlanEng, generatePlanDesign, slugify, dateStamp } = require('../lib/plan-engine');

const manifest = {
  project: { name: 'sample', root: '/x' },
  stack: { framework: 'next', styling: ['tailwind'], language: 'typescript' },
  tokens: {
    color: { palette: [
      { value: '#0a0a0a', count: 100, role: 'foreground' },
      { value: '#fafafa', count: 80, role: 'background' }
    ], totalDistinct: 8 },
    spacing: { values: [], inferredGrid: 8, gridConfidence: 0.9 },
    type: {
      fontFamilies: [{ value: 'Inter', count: 50 }],
      fontSizes: [], inferredScaleRatio: 1.25, scaleName: 'major-third', scaleConfidence: 0.9
    },
    radius: { values: [] }, shadow: { values: [] },
    motion: { durations: [], easings: [] }, breakpoints: []
  },
  metrics: { files: { scanned: 24 }, components: { estimated: 12 }, accessibility: {} },
  rules: { spacingGrid: 8, typeScaleRatio: 1.25, allowedColors: ['#0a0a0a'] }
};

test('slugify: clean characters', () => {
  assert.equal(slugify('Add User Invites'), 'add-user-invites');
  assert.equal(slugify('foo!!bar'), 'foo-bar');
  assert.equal(slugify(''), 'untitled');
  assert.equal(slugify('a'.repeat(60)).length, 40);
});

test('dateStamp: 8 digit YYYYMMDD', () => {
  const s = dateStamp();
  assert.match(s, /^\d{8}$/);
});

test('generateBrief: produces a markdown file with idea echoed', () => {
  const f = generateBrief({ idea: 'add user invites', manifest, root: '/x' });
  assert.match(f.relPath, /^\.dragoon\/plans\/brief-add-user-invites-\d{8}\.md$/);
  assert.match(f.content, /# brief: add user invites/);
  assert.match(f.content, /## one-line idea/);
  assert.match(f.content, /## codebase context/);
  assert.match(f.content, /Inter/);
  assert.match(f.content, /major-third/);
  assert.match(f.content, /next \+ tailwind/);
});

test('generateBrief: handles missing manifest gracefully', () => {
  const f = generateBrief({ idea: 'x', manifest: null, root: '/x' });
  assert.match(f.content, /run `dragoon scan`/);
});

test('generatePlanEng: includes test matrix table and edge cases', () => {
  const f = generatePlanEng({ idea: 'add invites', manifest, root: '/x' });
  assert.match(f.relPath, /plan-eng-add-invites/);
  assert.match(f.content, /## test matrix/);
  assert.match(f.content, /\| layer \| what to test \| tool \|/);
  assert.match(f.content, /## edge cases/);
});

test('generatePlanDesign: pulls palette colors and grid into constraints', () => {
  const f = generatePlanDesign({ idea: 'add invites', manifest, root: '/x' });
  assert.match(f.relPath, /plan-design-add-invites/);
  assert.match(f.content, /spacing grid: 8px/);
  assert.match(f.content, /#0a0a0a/);
  assert.match(f.content, /## accessibility plan/);
  assert.match(f.content, /WCAG AA/);
});

test('generatePlanDesign: handles empty palette', () => {
  const empty = JSON.parse(JSON.stringify(manifest));
  empty.tokens.color.palette = [];
  const f = generatePlanDesign({ idea: 'x', manifest: empty, root: '/x' });
  assert.match(f.content, /no palette detected/);
});
