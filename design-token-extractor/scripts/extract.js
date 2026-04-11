#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function findFiles(dir) {
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') results.push(...findFiles(f));
    else if (/\.(css|scss)$/.test(e.name)) results.push(f);
  }
  return results;
}

function extractTokens(files) {
  const colors = new Set();
  const fontSizes = new Set();
  const fontFamilies = new Set();
  const spacings = new Set();
  const radii = new Set();
  const shadows = new Set();

  files.forEach(f => {
    const content = fs.readFileSync(f, 'utf-8');
    // Colors
    (content.match(/#[0-9a-fA-F]{3,8}/g) || []).forEach(c => colors.add(c.toLowerCase()));
    (content.match(/rgba?\([^)]+\)/g) || []).forEach(c => colors.add(c));
    // Font sizes
    (content.match(/font-size:\s*([\d.]+(?:px|rem|em))/g) || []).forEach(m => {
      const val = m.replace('font-size:', '').trim();
      fontSizes.add(val);
    });
    // Font families
    (content.match(/font-family:\s*([^;]+)/g) || []).forEach(m => {
      fontFamilies.add(m.replace('font-family:', '').trim().replace(/['"]/g, ''));
    });
    // Border radius
    (content.match(/border-radius:\s*([^;]+)/g) || []).forEach(m => {
      radii.add(m.replace('border-radius:', '').trim());
    });
    // Box shadow
    (content.match(/box-shadow:\s*([^;]+)/g) || []).forEach(m => {
      shadows.add(m.replace('box-shadow:', '').trim());
    });
  });

  return {
    colors: [...colors].sort(),
    fontSizes: [...fontSizes].sort(),
    fontFamilies: [...fontFamilies],
    radii: [...radii].sort(),
    shadows: [...shadows],
  };
}

function formatCSS(tokens) {
  let css = ':root {\n';
  tokens.colors.forEach((c, i) => { css += `  --color-${i + 1}: ${c};\n`; });
  tokens.fontSizes.forEach((s, i) => { css += `  --font-size-${i + 1}: ${s};\n`; });
  tokens.radii.forEach((r, i) => { css += `  --radius-${i + 1}: ${r};\n`; });
  css += '}';
  return css;
}

const args = process.argv.slice(2);
const target = args[0] || '.';
const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'json';
const stat = fs.statSync(target);
const files = stat.isDirectory() ? findFiles(target) : [target];
const tokens = extractTokens(files);

console.log(`\nDesign Token Extraction — ${files.length} files\n`);
console.log(`Colors: ${tokens.colors.length}, Font sizes: ${tokens.fontSizes.length}, Radii: ${tokens.radii.length}\n`);

if (format === 'css') console.log(formatCSS(tokens));
else console.log(JSON.stringify(tokens, null, 2));
