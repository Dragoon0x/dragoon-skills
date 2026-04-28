'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('../lib/component-builder');
const {
  generateTypeScale, generateColorPalette, generateSpacingScale, generateMotionTokens,
  defaultFormat
} = require('../lib/token-applier');

const baseManifest = {
  stack: { framework: 'react', styling: ['tailwind'], language: 'typescript' },
  tokens: {
    color: {
      palette: [
        { value: '#0a0a0a', count: 100, role: 'foreground' },
        { value: '#fafafa', count: 80, role: 'background' },
        { value: '#3b82f6', count: 30, role: 'accent' }
      ],
      totalDistinct: 8
    },
    spacing: { values: [{ px: 8, count: 30 }, { px: 16, count: 25 }], inferredGrid: 8, gridConfidence: 0.9 },
    type: {
      fontFamilies: [{ value: 'Inter', count: 50 }],
      fontSizes: [{ px: 16, count: 30 }, { px: 20, count: 10 }, { px: 25, count: 5 }],
      inferredScaleRatio: 1.25, scaleName: 'major-third', scaleConfidence: 0.85
    },
    radius: { values: [{ px: 8, count: 20 }, { px: 12, count: 5 }] },
    shadow: { values: [] },
    motion: {
      durations: [{ ms: 200, count: 5 }, { ms: 400, count: 2 }],
      easings: [{ value: 'cubic-bezier(0.4,0,0.2,1)', count: 3 }]
    },
    breakpoints: []
  },
  metrics: { files: { scanned: 0 }, components: { estimated: 0 }, accessibility: {} },
  rules: { spacingGrid: 8, typeScaleRatio: 1.25, allowedColors: ['#0a0a0a', '#fafafa', '#3b82f6'] }
};

// ---------- component generator ----------

test('component: react+tailwind generates a tsx with utility classes', () => {
  const files = generate({
    name: 'Card', kebab: 'card',
    framework: 'react', styling: ['tailwind'], language: 'typescript',
    dir: 'src/components', manifest: baseManifest
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].relPath, 'src/components/Card.tsx');
  assert.match(files[0].content, /export function Card/);
  assert.match(files[0].content, /className=/);
  assert.match(files[0].content, /rounded/);
});

test('component: vue generates an SFC', () => {
  const files = generate({
    name: 'Card', kebab: 'card',
    framework: 'vue', styling: [], language: 'typescript',
    dir: 'src/components', manifest: baseManifest
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].relPath, 'src/components/Card.vue');
  assert.match(files[0].content, /<template>/);
  assert.match(files[0].content, /<script setup/);
});

test('component: svelte generates a .svelte file', () => {
  const files = generate({
    name: 'Card', kebab: 'card',
    framework: 'svelte', styling: [], language: 'typescript',
    dir: 'src/components', manifest: baseManifest
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].relPath, 'src/components/Card.svelte');
  assert.match(files[0].content, /<style>/);
});

test('component: react+css-modules generates two files', () => {
  const files = generate({
    name: 'Card', kebab: 'card',
    framework: 'react', styling: ['css-modules'], language: 'typescript',
    dir: 'src/components', manifest: baseManifest
  });
  assert.equal(files.length, 2);
  assert.ok(files.find(f => f.relPath.endsWith('.tsx')));
  assert.ok(files.find(f => f.relPath.endsWith('.module.css')));
});

test('component: javascript stack uses .jsx extension', () => {
  const files = generate({
    name: 'Card', kebab: 'card',
    framework: 'react', styling: ['tailwind'], language: 'javascript',
    dir: 'src/components', manifest: baseManifest
  });
  assert.equal(files[0].relPath, 'src/components/Card.jsx');
});

test('component: pulls bg/fg from manifest palette by role', () => {
  const files = generate({
    name: 'Card', kebab: 'card',
    framework: 'react', styling: [], language: 'typescript',
    dir: 'src/components', manifest: baseManifest
  });
  const css = files.find(f => f.relPath.endsWith('.css')).content;
  assert.match(css, /background: #fafafa/);
  assert.match(css, /color: #0a0a0a/);
});

// ---------- typography ----------

test('typography: produces 9-step css scale', () => {
  const files = generateTypeScale({ manifest: baseManifest, format: 'css' });
  assert.equal(files.length, 1);
  assert.equal(files[0].relPath, 'src/styles/tokens.type.css');
  assert.match(files[0].content, /--font-size-xs/);
  assert.match(files[0].content, /--font-size-base/);
  assert.match(files[0].content, /--font-size-4xl/);
  assert.match(files[0].content, /Inter/);
});

test('typography: tailwind format', () => {
  const files = generateTypeScale({ manifest: baseManifest, format: 'tailwind' });
  assert.match(files[0].content, /module\.exports/);
  assert.match(files[0].content, /fontSize/);
});

test('typography: js format', () => {
  const files = generateTypeScale({ manifest: baseManifest, format: 'js' });
  assert.match(files[0].content, /export const fontSize/);
});

test('typography: scale ratio is correct (1.25 base = 16, +1 = 20, -1 = 12.8)', () => {
  const files = generateTypeScale({ manifest: baseManifest, format: 'css' });
  // base=16, md (one step up) = 20
  assert.match(files[0].content, /--font-size-base: 16px/);
  assert.match(files[0].content, /--font-size-md: 20px/);
});

// ---------- color ----------

test('color: pulls top 8 by usage', () => {
  const big = JSON.parse(JSON.stringify(baseManifest));
  big.tokens.color.palette = Array.from({ length: 12 }, (_, i) => ({
    value: '#' + i.toString(16).padStart(6, '0'), count: 10, role: 'unknown'
  }));
  const files = generateColorPalette({ manifest: big, format: 'css' });
  // expect 8 lines of --color-*
  const matches = files[0].content.match(/--color-/g) || [];
  assert.equal(matches.length, 8);
});

test('color: uses role names where present', () => {
  const files = generateColorPalette({ manifest: baseManifest, format: 'css' });
  assert.match(files[0].content, /--color-foreground/);
  assert.match(files[0].content, /--color-background/);
  assert.match(files[0].content, /--color-accent/);
});

test('color: tailwind format', () => {
  const files = generateColorPalette({ manifest: baseManifest, format: 'tailwind' });
  assert.match(files[0].content, /colors:/);
  assert.match(files[0].content, /'foreground': '#0a0a0a'/);
});

// ---------- spacing ----------

test('spacing: scale anchored on detected grid (8px)', () => {
  const files = generateSpacingScale({ manifest: baseManifest, format: 'css' });
  // sm = grid * 1 = 8, md = grid * 2 = 16, xl = grid * 4 = 32
  assert.match(files[0].content, /--space-sm: 8px/);
  assert.match(files[0].content, /--space-md: 16px/);
  assert.match(files[0].content, /--space-xl: 32px/);
});

test('spacing: works on 4px grid', () => {
  const m = JSON.parse(JSON.stringify(baseManifest));
  m.rules.spacingGrid = 4;
  const files = generateSpacingScale({ manifest: m, format: 'css' });
  assert.match(files[0].content, /--space-sm: 4px/);
  assert.match(files[0].content, /--space-md: 8px/);
});

// ---------- motion ----------

test('motion: snaps durations to detected values', () => {
  const files = generateMotionTokens({ manifest: baseManifest, format: 'css' });
  // 200ms is detected, closest to 250 default → fast/normal pick from detected
  assert.match(files[0].content, /--duration-/);
  // verify 200 is somewhere in output
  assert.match(files[0].content, /200ms|400ms/);
});

test('motion: uses detected cubic-bezier as standard easing', () => {
  const files = generateMotionTokens({ manifest: baseManifest, format: 'css' });
  assert.match(files[0].content, /cubic-bezier/);
});

test('motion: tailwind format produces transitionDuration block', () => {
  const files = generateMotionTokens({ manifest: baseManifest, format: 'tailwind' });
  assert.match(files[0].content, /transitionDuration/);
  assert.match(files[0].content, /transitionTimingFunction/);
});

// ---------- defaultFormat ----------

test('defaultFormat: tailwind stack → tailwind', () => {
  assert.equal(defaultFormat({ framework: 'react', styling: ['tailwind'], language: 'typescript' }), 'tailwind');
});

test('defaultFormat: react+css → js', () => {
  assert.equal(defaultFormat({ framework: 'react', styling: ['css'], language: 'typescript' }), 'js');
});

test('defaultFormat: missing stack → css', () => {
  assert.equal(defaultFormat(null), 'css');
});
