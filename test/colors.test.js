'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toHex, hexToRgb, luminance, contrast, classifyRole, isAIDefaultPalette } = require('../lib/colors');

test('toHex normalizes #rgb shorthand', () => {
  assert.equal(toHex('#abc'), '#aabbcc');
  assert.equal(toHex('#ABC'), '#aabbcc');
});

test('toHex normalizes #rrggbb', () => {
  assert.equal(toHex('#3B82F6'), '#3b82f6');
  assert.equal(toHex('#3b82f6'), '#3b82f6');
});

test('toHex strips alpha from #rrggbbaa', () => {
  assert.equal(toHex('#3b82f6cc'), '#3b82f6');
});

test('toHex parses rgb/rgba', () => {
  assert.equal(toHex('rgb(59, 130, 246)'), '#3b82f6');
  assert.equal(toHex('rgba(59, 130, 246, 0.5)'), '#3b82f6');
  assert.equal(toHex('rgb(59 130 246)'), '#3b82f6');
});

test('toHex parses hsl', () => {
  // hsl(0, 0%, 0%) -> #000000
  assert.equal(toHex('hsl(0, 0%, 0%)'), '#000000');
  // hsl(0, 100%, 50%) -> #ff0000
  assert.equal(toHex('hsl(0, 100%, 50%)'), '#ff0000');
  // hsl(120, 100%, 50%) -> #00ff00
  assert.equal(toHex('hsl(120, 100%, 50%)'), '#00ff00');
});

test('toHex returns null for garbage', () => {
  assert.equal(toHex('not a color'), null);
  assert.equal(toHex(''), null);
  assert.equal(toHex(null), null);
  assert.equal(toHex(undefined), null);
});

test('luminance: black ~ 0, white ~ 1', () => {
  assert.equal(Math.round(luminance('#000000') * 1000), 0);
  assert.equal(Math.round(luminance('#ffffff') * 1000), 1000);
});

test('contrast: WCAG ratios match published values', () => {
  // Black on white = 21:1
  assert.ok(Math.abs(contrast('#000000', '#ffffff') - 21) < 0.01);
  // Same color = 1:1
  assert.equal(contrast('#3b82f6', '#3b82f6'), 1);
});

test('classifyRole: white is background, black is foreground', () => {
  assert.equal(classifyRole('#ffffff'), 'background');
  assert.equal(classifyRole('#000000'), 'foreground');
});

test('classifyRole: saturated red = danger', () => {
  assert.equal(classifyRole('#ef4444'), 'danger');
});

test('isAIDefaultPalette flags 3+ tailwind defaults', () => {
  const r = isAIDefaultPalette(['#3b82f6', '#8b5cf6', '#ec4899', '#222222']);
  assert.equal(r.hits, 3);
  assert.equal(r.isLikely, true);
});

test('isAIDefaultPalette does not flag custom palettes', () => {
  const r = isAIDefaultPalette(['#1a1a1a', '#fef9c3', '#fb7185']);
  assert.equal(r.hits, 0);
  assert.equal(r.isLikely, false);
});
