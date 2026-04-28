'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runRules, RULES } = require('../lib/slop-rules');

function find(rule, content, ext, manifest) {
  const findings = runRules(content, { file: 'test.' + ext.slice(1), ext, manifest, root: '.' });
  return findings.filter(f => f.rule === rule);
}

test('RULES: every rule has id, name, severity, description, detect', () => {
  for (const r of RULES) {
    assert.ok(r.id, `rule missing id: ${JSON.stringify(r)}`);
    assert.ok(r.name);
    assert.ok(['low', 'medium', 'high'].includes(r.severity));
    assert.ok(r.description);
    assert.equal(typeof r.detect, 'function');
  }
});

test('slop-001 too-many-shadow-variants: fires on >3 distinct shadows', () => {
  const css = `
    .a { box-shadow: 0 1px 2px #000; }
    .b { box-shadow: 0 2px 4px #000; }
    .c { box-shadow: 0 4px 8px #000; }
    .d { box-shadow: 0 8px 16px #000; }
    .e { box-shadow: 0 16px 32px #000; }
  `;
  const out = find('slop-001', css, '.css');
  assert.equal(out.length, 1);
  assert.match(out[0].message, /distinct box-shadow/);
});

test('slop-001: does not fire on 3 or fewer', () => {
  const css = `
    .a { box-shadow: 0 1px 2px #000; }
    .b { box-shadow: 0 2px 4px #000; }
    .c { box-shadow: 0 4px 8px #000; }
  `;
  const out = find('slop-001', css, '.css');
  assert.equal(out.length, 0);
});

test('slop-002 too-many-radius-variants: fires on >4 distinct radii', () => {
  const css = `
    .a { border-radius: 4px; }
    .b { border-radius: 8px; }
    .c { border-radius: 12px; }
    .d { border-radius: 16px; }
    .e { border-radius: 20px; }
  `;
  const out = find('slop-002', css, '.css');
  assert.equal(out.length, 1);
});

test('slop-003 ai-default-gradient: fires on tailwind blue-violet-pink combo', () => {
  const tsx = `<div className="bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500" />`;
  const out = find('slop-003', tsx, '.tsx');
  assert.ok(out.length >= 1);
});

test('slop-003: fires on linear-gradient with AI defaults', () => {
  const css = `.hero { background: linear-gradient(to right, #3b82f6, #8b5cf6); }`;
  const out = find('slop-003', css, '.css');
  assert.equal(out.length, 1);
});

test('slop-003: does not fire on custom brand gradient', () => {
  const tsx = `<div className="bg-gradient-to-r from-[#fef9c3] to-[#fb7185]" />`;
  const out = find('slop-003', tsx, '.tsx');
  assert.equal(out.length, 0);
});

test('slop-004 lorem-ipsum-leftover: fires on lorem ipsum', () => {
  const tsx = `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`;
  const out = find('slop-004', tsx, '.tsx');
  assert.ok(out.length >= 1);
});

test('slop-004: does not fire on ordinary text', () => {
  const tsx = `<p>Welcome to Dragoon, the design intelligence pack.</p>`;
  const out = find('slop-004', tsx, '.tsx');
  assert.equal(out.length, 0);
});

test('slop-005 inline-styles-in-jsx: fires on inline style', () => {
  const tsx = `<div style={{ color: 'red', padding: 8 }}>x</div>`;
  const out = find('slop-005', tsx, '.tsx');
  assert.equal(out.length, 1);
});

test('slop-005: aggregates when many inline styles present', () => {
  const tsx = `
    <div style={{ color: 'red' }}>1</div>
    <div style={{ color: 'green' }}>2</div>
    <div style={{ color: 'blue' }}>3</div>
    <div style={{ color: 'yellow' }}>4</div>
    <div style={{ color: 'pink' }}>5</div>
    <div style={{ color: 'cyan' }}>6</div>
    <div style={{ color: 'orange' }}>7</div>
  `;
  const out = find('slop-005', tsx, '.tsx');
  // first 5 individual + 1 aggregate = 6
  assert.equal(out.length, 6);
});

test('slop-006 spacing-off-grid: fires when manifest has 8px grid and value is 7px', () => {
  const css = `.a { padding: 7px 8px; }`;
  const manifest = { rules: { spacingGrid: 8 } };
  const out = find('slop-006', css, '.css', manifest);
  assert.ok(out.length >= 1);
});

test('slop-006: does not fire without manifest', () => {
  const css = `.a { padding: 7px; }`;
  const out = find('slop-006', css, '.css', null);
  assert.equal(out.length, 0);
});

test('slop-006: does not fire on grid-aligned values', () => {
  const css = `.a { padding: 8px 16px 24px 32px; }`;
  const manifest = { rules: { spacingGrid: 8 } };
  const out = find('slop-006', css, '.css', manifest);
  assert.equal(out.length, 0);
});

test('slop-007 hardcoded-color-off-palette: fires when color outside allowedColors', () => {
  const css = `.a { color: #abc123; }`;
  const manifest = { rules: { allowedColors: ['#000000', '#ffffff', '#3b82f6'] } };
  const out = find('slop-007', css, '.css', manifest);
  assert.ok(out.length >= 1);
});

test('slop-007: does not fire when color matches palette', () => {
  const css = `.a { color: #3b82f6; }`;
  const manifest = { rules: { allowedColors: ['#000000', '#ffffff', '#3b82f6'] } };
  const out = find('slop-007', css, '.css', manifest);
  assert.equal(out.length, 0);
});

test('slop-008 tailwind-class-bloat: fires on >15 classes', () => {
  const tsx = `<div className="flex items-center justify-between px-4 py-2 mt-4 mb-2 bg-white text-gray-900 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">x</div>`;
  const out = find('slop-008', tsx, '.tsx');
  assert.equal(out.length, 1);
});

test('slop-008: does not fire on reasonable class count', () => {
  const tsx = `<div className="flex items-center px-4 py-2 rounded">x</div>`;
  const out = find('slop-008', tsx, '.tsx');
  assert.equal(out.length, 0);
});

test('slop-009 missing-alt-text: fires on img without alt', () => {
  const tsx = `<img src="hero.jpg" />`;
  const out = find('slop-009', tsx, '.tsx');
  assert.equal(out.length, 1);
});

test('slop-009: does not fire on img with alt (even empty)', () => {
  const tsx = `<img src="hero.jpg" alt="" /> <img src="x" alt="x" />`;
  const out = find('slop-009', tsx, '.tsx');
  assert.equal(out.length, 0);
});

test('slop-010 console-log-leftover: fires on console.log', () => {
  const ts = `function x() { console.log('debug'); }`;
  const out = find('slop-010', ts, '.ts');
  assert.equal(out.length, 1);
});

test('slop-010: does not fire on console.error', () => {
  const ts = `function x() { console.error('real error'); }`;
  const out = find('slop-010', ts, '.ts');
  assert.equal(out.length, 0);
});

test('slop-011 emoji-decoration-in-heading: fires on emoji in h1', () => {
  const tsx = `<h1>🚀 Welcome</h1>`;
  const out = find('slop-011', tsx, '.tsx');
  assert.equal(out.length, 1);
});

test('slop-011: does not fire on plain heading', () => {
  const tsx = `<h1>Welcome</h1>`;
  const out = find('slop-011', tsx, '.tsx');
  assert.equal(out.length, 0);
});

test('slop-012 transition-all-everywhere: fires on transition-all duration-200', () => {
  const tsx = `<div className="transition-all duration-200 hover:scale-105">x</div>`;
  const out = find('slop-012', tsx, '.tsx');
  assert.equal(out.length, 1);
});

test('slop-012: does not fire on transition-colors', () => {
  const tsx = `<div className="transition-colors duration-200">x</div>`;
  const out = find('slop-012', tsx, '.tsx');
  assert.equal(out.length, 0);
});
