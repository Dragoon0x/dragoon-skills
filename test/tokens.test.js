'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inferGrid, inferTypeScale, topN, tally } = require('../lib/tokens');

test('inferGrid: detects 8px grid from clean values', () => {
  const r = inferGrid([8, 16, 24, 32, 48, 8, 16]);
  assert.equal(r.grid, 8);
  assert.equal(r.confidence, 1);
});

test('inferGrid: detects 4px grid', () => {
  const r = inferGrid([4, 8, 12, 16, 20, 24]);
  // 4 wins because all values are multiples
  assert.equal(r.grid, 4);
});

test('inferGrid: returns null for no clear grid', () => {
  const r = inferGrid([3, 7, 11, 13, 17]);
  assert.equal(r.grid, null);
});

test('inferGrid: handles too-few-values', () => {
  const r = inferGrid([8, 16]);
  assert.equal(r.grid, null);
});

test('inferTypeScale: detects major-third (1.25)', () => {
  // 16, 20, 25, 31.25 -- ratios of 1.25
  const r = inferTypeScale([16, 20, 25, 31.25]);
  assert.equal(r.ratio, 1.25);
  assert.equal(r.name, 'major-third');
});

test('inferTypeScale: detects perfect-fourth (1.333)', () => {
  // 12, 16, ~21.33, ~28.4
  const r = inferTypeScale([12, 16, 21.33, 28.4]);
  assert.equal(r.ratio, 1.333);
  assert.equal(r.name, 'perfect-fourth');
});

test('inferTypeScale: returns null for chaotic sizes', () => {
  // genuinely chaotic: ratios 1.22, 2.09, 1.35, 2.16 — no clustering
  const r = inferTypeScale([9, 11, 23, 31, 67]);
  assert.equal(r.ratio, null);
});

test('topN: returns top-n by count', () => {
  const out = topN(['a', 'a', 'a', 'b', 'b', 'c'], 2);
  assert.deepEqual(out, [{ value: 'a', count: 3 }, { value: 'b', count: 2 }]);
});

test('topN: applies key function', () => {
  const out = topN([1.001, 1.0, 1.999, 2.0], 2, v => Math.round(v));
  // 1.001 and 1.0 normalize to 1; 1.999 and 2.0 normalize to 2
  assert.equal(out.length, 2);
  assert.equal(out[0].count, 2);
  assert.equal(out[1].count, 2);
});

test('tally: counts occurrences', () => {
  const t = tally(['a', 'b', 'a', 'c', 'b', 'a']);
  assert.deepEqual(t[0], ['a', 3]);
  assert.deepEqual(t[1], ['b', 2]);
});
