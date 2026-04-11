#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const RULES = [
  { id: 'inline-style', regex: /style=\{\{/g, severity: 'warning', message: 'Inline style object — extract to className or CSS module' },
  { id: 'nested-ternary-class', regex: /className=\{[^}]*\?[^}]*\?/g, severity: 'error', message: 'Nested ternary in className — use clsx/cn utility' },
  { id: 'px-in-jsx', regex: /['""]\d+px['"]/g, severity: 'warning', message: 'Hardcoded px string — use spacing token' },
  { id: 'color-literal', regex: /color:\s*['"]#[0-9a-f]{3,8}['"]/gi, severity: 'warning', message: 'Hardcoded color in JSX — use theme token' },
  { id: 'div-button', regex: /<div[^>]*onClick/g, severity: 'error', message: 'div with onClick — use <button> for accessibility' },
  { id: 'index-key', regex: /key=\{(?:index|i|idx)\}/g, severity: 'warning', message: 'Array index as key — use stable identifier' },
  { id: 'console-log', regex: /console\.log/g, severity: 'info', message: 'console.log left in code' },
  { id: 'magic-number', regex: /(?:width|height|size):\s*\d{2,}/g, severity: 'info', message: 'Magic number in sizing — consider a token' },
];

function lintFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  content.split('\n').forEach((line, idx) => {
    RULES.forEach(({ id, regex, severity, message }) => {
      const re = new RegExp(regex.source, regex.flags);
      if (re.test(line)) {
        issues.push({ file: filePath, line: idx + 1, id, severity, message });
      }
    });
  });
  return issues;
}

function findFiles(dir) {
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) results.push(...findFiles(f));
    else if (/\.(tsx|jsx)$/.test(e.name)) results.push(f);
  }
  return results;
}

const target = process.argv[2] || '.';
const stat = fs.statSync(target);
const files = stat.isDirectory() ? findFiles(target) : [target];
const allIssues = [];
files.forEach(f => allIssues.push(...lintFile(f)));

console.log(`\nDesign Lint — ${files.length} files\n`);
console.log(`Issues: ${allIssues.length}\n`);
allIssues.forEach(i => {
  const icon = i.severity === 'error' ? '✗' : i.severity === 'warning' ? '!' : '·';
  console.log(`  ${icon} ${path.basename(i.file)}:${i.line} [${i.id}] ${i.message}`);
});
