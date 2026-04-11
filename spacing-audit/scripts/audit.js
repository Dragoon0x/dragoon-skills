#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE4_SCALE = [0,1,2,4,6,8,12,16,20,24,32,40,48,64,80,96,128];
const SPACING_PROPS = /(?:margin|padding|gap|top|left|right|bottom|inset)(?:-(?:top|right|bottom|left|x|y|inline|block))?/;

function findFiles(dir, ext) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) results.push(...findFiles(full, ext));
    else if (entry.name.match(/\.(css|scss|less)$/)) results.push(full);
  }
  return results;
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  const values = {};

  content.split('\n').forEach((line, idx) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;
    const propMatch = line.match(new RegExp(`(${SPACING_PROPS.source})\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i'));
    if (propMatch) {
      const prop = propMatch[1];
      const val = parseFloat(propMatch[2]);
      const absVal = Math.abs(val);
      values[absVal] = (values[absVal] || 0) + 1;

      if (absVal > 0 && !BASE4_SCALE.includes(absVal)) {
        const nearest = BASE4_SCALE.reduce((a, b) => Math.abs(b - absVal) < Math.abs(a - absVal) ? b : a);
        issues.push({
          file: filePath, line: idx + 1, property: prop, value: val,
          message: `${val}px is off the base-4 grid. Nearest: ${nearest}px`,
        });
      }
    }
  });

  return { issues, values };
}

const args = process.argv.slice(2);
const target = args[0] || '.';
const stat = fs.statSync(target);
const files = stat.isDirectory() ? findFiles(target, 'css') : [target];
const allIssues = [];
const allValues = {};

files.forEach(f => {
  const { issues, values } = auditFile(f);
  allIssues.push(...issues);
  Object.entries(values).forEach(([k, v]) => { allValues[k] = (allValues[k] || 0) + v; });
});

console.log(`\nSpacing Audit — ${files.length} files scanned\n`);
console.log(`Off-grid values: ${allIssues.length}\n`);
allIssues.slice(0, 20).forEach(i => {
  console.log(`  ! L${i.line} ${path.basename(i.file)}: ${i.property}: ${i.value}px — ${i.message}`);
});
if (allIssues.length > 20) console.log(`  ... and ${allIssues.length - 20} more\n`);

console.log('\nSpacing Distribution:');
Object.entries(allValues).sort((a, b) => +a[0] - +b[0]).forEach(([val, count]) => {
  const onGrid = BASE4_SCALE.includes(+val) ? '✓' : '✗';
  const bar = '█'.repeat(Math.min(count, 40));
  console.log(`  ${onGrid} ${val.padStart(4)}px: ${bar} (${count})`);
});
