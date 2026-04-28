'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { critique, grade } = require('../lib/critique-engine');

function emptyManifest() {
  return {
    project: { name: 'test', root: '/x' },
    stack: { framework: 'react', styling: ['css'], language: 'typescript' },
    tokens: {
      color: { palette: [], totalDistinct: 0 },
      spacing: { values: [], inferredGrid: null, gridConfidence: 0 },
      type: { fontFamilies: [], fontSizes: [], inferredScaleRatio: null, scaleConfidence: 0 },
      radius: { values: [] },
      shadow: { values: [] },
      motion: { durations: [], easings: [] },
      breakpoints: []
    },
    metrics: {
      files: { scanned: 0, css: 0, scss: 0, jsx: 0, tsx: 0, vue: 0, svelte: 0, html: 0 },
      components: { estimated: 0, averageSizeLines: 0 },
      accessibility: { imagesWithAlt: 0, imagesWithoutAlt: 0, buttonsWithLabel: 0, buttonsWithoutLabel: 0, ariaUsage: 0, semanticTagUsage: 0 }
    }
  };
}

test('critique: empty manifest returns scores bounded 0-100', () => {
  const r = critique(emptyManifest());
  for (const s of Object.values(r.scores)) {
    assert.ok(s >= 0 && s <= 100, `score out of bounds: ${s}`);
  }
});

test('critique: clean small system gets high typography score', () => {
  const m = emptyManifest();
  m.tokens.type = {
    fontFamilies: [{ value: 'Inter', count: 50 }, { value: 'JetBrains Mono', count: 5 }],
    fontSizes: [{ px: 12, count: 5 }, { px: 14, count: 10 }, { px: 16, count: 30 }, { px: 20, count: 8 }, { px: 24, count: 4 }],
    inferredScaleRatio: 1.25,
    scaleConfidence: 0.85
  };
  const r = critique(m);
  assert.ok(r.scores.typography >= 90, `typography score too low: ${r.scores.typography}`);
});

test('critique: 5 font families penalizes typography', () => {
  const m = emptyManifest();
  m.tokens.type.fontFamilies = [
    { value: 'Inter', count: 1 },
    { value: 'Roboto', count: 1 },
    { value: 'Arial', count: 1 },
    { value: 'Helvetica', count: 1 },
    { value: 'Times', count: 1 }
  ];
  const r = critique(m);
  assert.ok(r.scores.typography < 80);
  // breakdown should mention font families
  assert.ok(r.breakdown.typography.some(b => /font families/.test(b.reason)));
});

test('critique: detected grid with high confidence yields high spacing score', () => {
  const m = emptyManifest();
  m.tokens.spacing = {
    values: [{ px: 8, count: 30 }, { px: 16, count: 25 }, { px: 24, count: 12 }],
    inferredGrid: 8, gridConfidence: 0.95
  };
  const r = critique(m);
  assert.ok(r.scores.spacing >= 85);
});

test('critique: no detected grid drops spacing score', () => {
  const m = emptyManifest();
  m.tokens.spacing = { values: [], inferredGrid: null, gridConfidence: 0 };
  const r = critique(m);
  assert.ok(r.scores.spacing < 80);
});

test('critique: 6 distinct shadows tanks consistency score', () => {
  const m = emptyManifest();
  m.tokens.shadow.values = Array.from({ length: 6 }, (_, i) => ({ value: `shadow-${i}`, count: 1 }));
  const r = critique(m);
  assert.ok(r.scores.consistency < 90);
});

test('critique: missing alt text penalizes accessibility', () => {
  const m = emptyManifest();
  m.metrics.accessibility = { imagesWithAlt: 5, imagesWithoutAlt: 5, buttonsWithLabel: 0, buttonsWithoutLabel: 0, ariaUsage: 0, semanticTagUsage: 0 };
  const r = critique(m);
  assert.ok(r.scores.accessibility < 90);
  assert.ok(r.breakdown.accessibility.some(b => /alt/.test(b.reason)));
});

test('critique: overall is weighted average of categories', () => {
  const m = emptyManifest();
  // give a clean signal in everything
  m.tokens.type.fontFamilies = [{ value: 'Inter', count: 50 }];
  m.tokens.spacing = { values: [{px: 8, count: 30}], inferredGrid: 8, gridConfidence: 0.9 };
  m.tokens.color = { palette: [{ value: '#000', count: 100 }, { value: '#fff', count: 50 }], totalDistinct: 8 };
  const r = critique(m);
  assert.ok(r.scores.overall >= 60);
  // weights are 1+1+1.2+0.8+1.2+1 = 6.2
  const sum = r.scores.typography * 1 + r.scores.color * 1 + r.scores.spacing * 1.2
    + r.scores.motion * 0.8 + r.scores.accessibility * 1.2 + r.scores.consistency * 1;
  const expected = Math.round(sum / 6.2);
  assert.equal(r.scores.overall, expected);
});

test('grade: thresholds', () => {
  assert.equal(grade(95), 'A');
  assert.equal(grade(85), 'B');
  assert.equal(grade(75), 'C');
  assert.equal(grade(65), 'D');
  assert.equal(grade(55), 'F');
});
