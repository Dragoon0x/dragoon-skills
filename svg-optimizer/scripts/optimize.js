#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REMOVE_ATTRS = [
  'xmlns:xlink', 'xml:space', 'data-name', 'class',
  'style', 'id', 'sketch:type', 'xmlns:sketch',
  'xmlns:dc', 'xmlns:cc', 'xmlns:rdf', 'xmlns:svg',
  'xmlns:sodipodi', 'xmlns:inkscape', 'sodipodi:docname',
  'inkscape:version', 'sodipodi:nodetypes',
];

const REMOVE_ELEMENTS = [
  '<title>[^<]*</title>', '<desc>[^<]*</desc>',
  '<metadata[\\s\\S]*?</metadata>', '<!--[\\s\\S]*?-->',
  '<defs>\\s*</defs>', '<g>\\s*</g>',
];

function optimize(svg) {
  let result = svg;
  // Remove elements
  REMOVE_ELEMENTS.forEach(pattern => {
    result = result.replace(new RegExp(pattern, 'gi'), '');
  });
  // Remove attributes
  REMOVE_ATTRS.forEach(attr => {
    result = result.replace(new RegExp(` ${attr}="[^"]*"`, 'g'), '');
  });
  // Shorten hex colors
  result = result.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/gi, '#$1$2$3');
  // Round numbers to 2 decimal places
  result = result.replace(/(\d+\.\d{3,})/g, (m) => parseFloat(m).toFixed(2));
  // Collapse whitespace
  result = result.replace(/\n\s*\n/g, '\n').trim();
  return result;
}

const args = process.argv.slice(2);
if (args.length === 0) { console.log('Usage: node optimize.js <file.svg|dir/> [--recursive] [--output dir]'); process.exit(0); }

const target = args[0];
const outputDir = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf-8');
  const optimized = optimize(original);
  const savings = ((1 - optimized.length / original.length) * 100).toFixed(1);

  if (outputDir) {
    const outPath = path.join(outputDir, path.basename(filePath));
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outPath, optimized);
  } else {
    fs.writeFileSync(filePath, optimized);
  }
  console.log(`  ✓ ${path.basename(filePath)}: ${original.length}B → ${optimized.length}B (-${savings}%)`);
}

const stat = fs.statSync(target);
if (stat.isDirectory()) {
  const files = fs.readdirSync(target).filter(f => f.endsWith('.svg')).map(f => path.join(target, f));
  console.log(`\nOptimizing ${files.length} SVGs...\n`);
  files.forEach(processFile);
} else {
  processFile(target);
}
