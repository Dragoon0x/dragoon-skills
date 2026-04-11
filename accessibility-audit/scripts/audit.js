#!/usr/bin/env node
const fs = require('fs');
const CHECKS = [
  { id: 'img-alt', regex: /<img(?![^>]*alt=)[^>]*>/gi, severity: 'error', message: 'Image missing alt attribute' },
  { id: 'img-alt-empty', regex: /<img[^>]*alt=""[^>]*>/gi, severity: 'info', message: 'Image with empty alt (decorative?)' },
  { id: 'input-label', regex: /<input(?![^>]*aria-label)[^>]*(?!.*<label)/gi, severity: 'error', message: 'Input may be missing associated label' },
  { id: 'button-empty', regex: /<button[^>]*>\s*<\/button>/gi, severity: 'error', message: 'Empty button — needs text or aria-label' },
  { id: 'heading-skip', regex: /dummy-never-match/g, severity: 'warning', message: 'Heading level skipped' },
  { id: 'outline-none', regex: /outline:\s*none/gi, severity: 'error', message: 'outline: none without replacement' },
  { id: 'tabindex-pos', regex: /tabindex="[1-9]/gi, severity: 'warning', message: 'Positive tabindex — disrupts natural tab order' },
  { id: 'autoplay', regex: /autoplay/gi, severity: 'warning', message: 'Autoplay media — needs user control' },
  { id: 'onclick-div', regex: /<div[^>]*onclick/gi, severity: 'error', message: 'onclick on div — use button or a element' },
  { id: 'lang-missing', regex: /<html(?![^>]*lang=)/gi, severity: 'error', message: 'html element missing lang attribute' },
];

const file = process.argv[2];
if (!file) { console.log('Usage: node audit.js <file.html>'); process.exit(0); }

const content = fs.readFileSync(file, 'utf-8');
const issues = [];

CHECKS.forEach(({ id, regex, severity, message }) => {
  const matches = content.match(regex);
  if (matches) matches.forEach(m => issues.push({ id, severity, message, match: m.substring(0, 60) }));
});

// Heading hierarchy check
const headings = [...content.matchAll(/<h([1-6])/gi)].map(m => +m[1]);
for (let i = 1; i < headings.length; i++) {
  if (headings[i] - headings[i-1] > 1) {
    issues.push({ id: 'heading-skip', severity: 'warning', message: `Heading skip: h${headings[i-1]} → h${headings[i]}` });
  }
}

const errors = issues.filter(i => i.severity === 'error').length;
const warnings = issues.filter(i => i.severity === 'warning').length;
console.log(`\nAccessibility Audit: ${file}\n`);
console.log(`Issues: ${issues.length} (${errors} errors, ${warnings} warnings)\n`);
issues.forEach(i => {
  const icon = i.severity === 'error' ? '✗' : '!';
  console.log(`  ${icon} [${i.id}] ${i.message}`);
});
if (issues.length === 0) console.log('  ✓ No issues detected.');
