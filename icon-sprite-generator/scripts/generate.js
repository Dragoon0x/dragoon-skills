#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || './icons';
const output = process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output') + 1] : 'sprite.svg';

if (!fs.existsSync(dir)) { console.error(`Directory not found: ${dir}`); process.exit(1); }

const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg')).sort();
let symbols = '';

files.forEach(file => {
  let svg = fs.readFileSync(path.join(dir, file), 'utf-8');
  const id = path.basename(file, '.svg').toLowerCase().replace(/\s+/g, '-');
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 24 24';
  // Extract inner content (between <svg> tags)
  const inner = svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim();
  symbols += `  <symbol id="${id}" viewBox="${viewBox}">\n    ${inner}\n  </symbol>\n`;
});

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols}</svg>\n`;
fs.writeFileSync(output, sprite);
console.log(`\nSprite generated: ${output}`);
console.log(`Icons: ${files.length}`);
console.log(`\nUsage: <svg><use href="${output}#icon-name" /></svg>`);
