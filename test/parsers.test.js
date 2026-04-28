'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractStyles, extractTailwind, extractAccessibilitySignals, estimateComponentCount } = require('../lib/parsers');

test('extractStyles pulls hex colors from CSS', () => {
  const css = `
    .a { color: #3b82f6; }
    .b { background: #fff; border: 1px solid rgb(0, 0, 0); }
    .c { color: hsla(0, 100%, 50%, 0.5); }
  `;
  const out = extractStyles(css);
  assert.equal(out.colors.length, 4);
});

test('extractStyles parses font-size in px and rem', () => {
  const css = `
    body { font-size: 16px; }
    h1 { font-size: 2rem; }
    h2 { font-size: 24px; }
  `;
  const out = extractStyles(css);
  assert.deepEqual(out.fontSizes.sort((a, b) => a - b), [16, 24, 32]);
});

test('extractStyles parses border-radius', () => {
  const css = `
    .card { border-radius: 12px; }
    .pill { border-radius: 9999px; }
  `;
  const out = extractStyles(css);
  assert.deepEqual(out.radii, [12, 9999]);
});

test('extractStyles parses box-shadow', () => {
  const css = `
    .a { box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .b { box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
  `;
  const out = extractStyles(css);
  assert.equal(out.shadows.length, 2);
});

test('extractStyles parses transition durations', () => {
  const css = `
    .a { transition: 200ms ease-out; }
    .b { transition-duration: 0.3s; }
  `;
  const out = extractStyles(css);
  assert.deepEqual(out.durationsMs.sort((a, b) => a - b), [200, 300]);
});

test('extractStyles parses cubic-bezier', () => {
  const css = `.a { transition: 200ms cubic-bezier(0.4, 0, 0.2, 1); }`;
  const out = extractStyles(css);
  assert.ok(out.easings.some(e => e.includes('cubic-bezier')));
});

test('extractStyles parses spacing only from spacing properties', () => {
  const css = `
    .a { padding: 16px; margin: 8px 12px; gap: 24px; }
    .b { width: 100px; }
  `;
  const out = extractStyles(css);
  // should include 16, 8, 12, 24 but NOT the 100 from width
  const sorted = [...new Set(out.spacingPx)].sort((a, b) => a - b);
  assert.deepEqual(sorted, [8, 12, 16, 24]);
});

test('extractStyles parses media query breakpoints', () => {
  const css = `
    @media (min-width: 768px) { .a { color: red; } }
    @media (max-width: 640px) { .b { color: blue; } }
  `;
  const out = extractStyles(css);
  assert.deepEqual(out.breakpointsPx.sort((a, b) => a - b), [640, 768]);
});

test('extractTailwind: spacing token to px (4px unit)', () => {
  const jsx = `<div className="p-4 m-2 gap-8 px-6">`;
  const out = extractTailwind(jsx);
  // p-4 -> 16, m-2 -> 8, gap-8 -> 32, px-6 -> 24
  const sorted = [...new Set(out.spacingPx)].sort((a, b) => a - b);
  assert.deepEqual(sorted, [8, 16, 24, 32]);
});

test('extractTailwind: rounded variants', () => {
  const jsx = `<div className="rounded-md rounded-lg rounded-2xl">`;
  const out = extractTailwind(jsx);
  // rounded-md=6, rounded-lg=8, rounded-2xl=16
  assert.ok(out.radii.includes(6));
  assert.ok(out.radii.includes(8));
  assert.ok(out.radii.includes(16));
});

test('extractAccessibilitySignals: counts img alt presence', () => {
  const html = `
    <img src="a.jpg" alt="logo" />
    <img src="b.jpg" />
    <img src="c.jpg" alt="" />
  `;
  const out = extractAccessibilitySignals(html);
  assert.equal(out.imagesWithAlt, 2);
  assert.equal(out.imagesWithoutAlt, 1);
});

test('extractAccessibilitySignals: counts button labels', () => {
  const html = `
    <button>Click me</button>
    <button aria-label="Close"></button>
    <button></button>
  `;
  const out = extractAccessibilitySignals(html);
  assert.equal(out.buttonsWithLabel, 2);
  assert.equal(out.buttonsWithoutLabel, 1);
});

test('extractAccessibilitySignals: counts semantic tags', () => {
  const html = `<nav></nav><main></main><article></article><div></div>`;
  const out = extractAccessibilitySignals(html);
  assert.equal(out.semanticTagUsage, 3);
});

test('estimateComponentCount: counts function and arrow components', () => {
  const tsx = `
    function Card() { return <div />; }
    const Button = () => <button />;
    function helper() { return 1; }  // not a component (lowercase)
    const x = 5;
  `;
  assert.equal(estimateComponentCount(tsx, '.tsx'), 2);
});
