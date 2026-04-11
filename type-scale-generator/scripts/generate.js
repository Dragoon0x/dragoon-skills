#!/usr/bin/env node
/**
 * Type Scale Generator
 * Usage: node generate.js [--ratio N|name] [--base N] [--steps N] [--format css|tailwind|json|table]
 */

const RATIOS = {
  'minor-second': 1.067, 'major-second': 1.125, 'minor-third': 1.2,
  'major-third': 1.25, 'perfect-fourth': 1.333, 'augmented-fourth': 1.414,
  'perfect-fifth': 1.5, 'golden': 1.618,
};

const STEP_NAMES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl'];

function parseRatio(input) {
  if (!input) return 1.333;
  if (RATIOS[input]) return RATIOS[input];
  const num = parseFloat(input);
  return isNaN(num) ? 1.333 : num;
}

function generateScale(base, ratio, steps) {
  const scale = [];
  const start = -2; // Start 2 steps below base
  for (let i = start; i < start + steps; i++) {
    const px = base * Math.pow(ratio, i);
    const rem = px / 16;
    const name = STEP_NAMES[i - start] || `step-${i - start}`;
    // Clamp: scales from 320px to 1280px viewport
    const minPx = Math.max(11, px * 0.75);
    const maxPx = px;
    const minRem = minPx / 16;
    const maxRem = maxPx / 16;
    const vwSlope = ((maxPx - minPx) / (1280 - 320)) * 100;
    const intercept = minRem - (vwSlope / 100 * 320 / 16);
    const clamp = `clamp(${minRem.toFixed(3)}rem, ${intercept.toFixed(3)}rem + ${vwSlope.toFixed(2)}vw, ${maxRem.toFixed(3)}rem)`;

    scale.push({ name, px: Math.round(px * 10) / 10, rem: Math.round(rem * 1000) / 1000, clamp });
  }
  return scale;
}

function formatCSS(scale) {
  let css = ':root {\n';
  scale.forEach(s => { css += `  --font-size-${s.name}: ${s.clamp}; /* ${s.px}px */\n`; });
  css += '}';
  return css;
}

function formatTailwind(scale) {
  let obj = 'module.exports = {\n  theme: {\n    fontSize: {\n';
  scale.forEach(s => { obj += `      '${s.name}': ['${s.clamp}', { lineHeight: '${s.px > 40 ? '1.15' : s.px > 24 ? '1.3' : '1.5'}' }],\n`; });
  obj += '    },\n  },\n};';
  return obj;
}

function formatTable(scale) {
  let t = '| Step | px | rem | clamp() |\n|------|----|----|---------|\n';
  scale.forEach(s => { t += `| ${s.name} | ${s.px} | ${s.rem} | ${s.clamp} |\n`; });
  return t;
}

const args = process.argv.slice(2);
const ratio = parseRatio(args.includes('--ratio') ? args[args.indexOf('--ratio') + 1] : null);
const base = args.includes('--base') ? parseInt(args[args.indexOf('--base') + 1]) : 16;
const steps = args.includes('--steps') ? parseInt(args[args.indexOf('--steps') + 1]) : 8;
const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'table';

const scale = generateScale(base, ratio, steps);

console.log(`\nType Scale — Ratio: ${ratio}, Base: ${base}px, Steps: ${steps}\n`);

switch (format) {
  case 'css': console.log(formatCSS(scale)); break;
  case 'tailwind': console.log(formatTailwind(scale)); break;
  case 'json': console.log(JSON.stringify(scale, null, 2)); break;
  default: console.log(formatTable(scale));
}
