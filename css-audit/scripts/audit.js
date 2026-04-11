#!/usr/bin/env node

/**
 * CSS Audit — Scans CSS for anti-patterns, hardcoded values, and AI slop.
 * Usage: node audit.js <path> [--recursive] [--format json|text] [--output file] [--strict] [--min-grade A-F]
 */

const fs = require('fs');
const path = require('path');

// ─── Pattern Definitions ───
const PATTERNS = [
  { id: 'hardcoded-color', severity: 'warning', regex: /(?<!var\()#[0-9a-fA-F]{3,8}(?!.*var)/g, message: 'Hardcoded hex color — use a design token' },
  { id: 'hardcoded-font-size', severity: 'warning', regex: /font-size:\s*\d+px/g, message: 'Hardcoded font-size — use a type scale token' },
  { id: 'important', severity: 'error', regex: /!important/g, message: '!important — likely a specificity problem' },
  { id: 'transition-all', severity: 'warning', regex: /transition:\s*all/g, message: 'transition: all — animate specific properties' },
  { id: 'opacity-50', severity: 'info', regex: /opacity:\s*0?\.5\b/g, message: 'opacity: 0.5 on disabled? Should be 0.38 (MD3 standard)' },
  { id: 'z-index-high', severity: 'error', regex: /z-index:\s*(\d{4,})/g, message: 'High z-index — use a z-index scale' },
  { id: 'magic-number', severity: 'warning', regex: /(?:margin|padding|gap|top|left|right|bottom):\s*\d*[13579]px/g, message: 'Odd pixel value — should align to spacing scale (base-4)' },
  { id: 'pure-black', severity: 'info', regex: /(?:background|bg|color).*#000000/gi, message: 'Pure black #000000 — use #09090B or similar for dark mode' },
  { id: 'pure-white-dark', severity: 'info', regex: /color:\s*#[Ff]{6}/g, message: 'Pure white text — may cause halation on dark backgrounds' },
  { id: 'border-radius-12', severity: 'info', regex: /border-radius:\s*12px/g, message: 'border-radius: 12px — the most common AI default. Intentional?' },
  { id: 'box-shadow-generic', severity: 'info', regex: /box-shadow:\s*0\s+4px\s+6px/g, message: 'Generic box-shadow — use an elevation token' },
  { id: 'inter-font', severity: 'info', regex: /font-family:.*\bInter\b/g, message: 'Inter font — is this an intentional choice or AI default?' },
  { id: 'outline-none', severity: 'error', regex: /outline:\s*none/g, message: 'outline: none without replacement — accessibility violation' },
  { id: 'line-height-flat', severity: 'warning', regex: /line-height:\s*1\.5(?:;|\s|$)/g, message: 'line-height: 1.5 everywhere — should vary by font size' },
];

// ─── File Discovery ───
function findCSSFiles(dir, recursive) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...findCSSFiles(full, true));
    } else if (/\.(css|scss|less)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ─── Audit Engine ───
function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;
    PATTERNS.forEach(({ id, severity, regex, message }) => {
      const re = new RegExp(regex.source, regex.flags);
      let match;
      while ((match = re.exec(line)) !== null) {
        issues.push({
          file: filePath,
          line: index + 1,
          column: match.index + 1,
          id,
          severity,
          message,
          source: line.trim().substring(0, 80),
        });
      }
    });
  });

  return issues;
}

// ─── Scoring ───
function calculateScore(issues) {
  let score = 100;
  issues.forEach(({ severity }) => {
    if (severity === 'error') score -= 5;
    if (severity === 'warning') score -= 2;
    if (severity === 'info') score -= 0.5;
  });
  return Math.max(0, Math.round(score));
}

function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ─── Output ───
function formatText(files, allIssues) {
  const score = calculateScore(allIssues);
  const grade = scoreToGrade(score);
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const infos = allIssues.filter(i => i.severity === 'info').length;

  let output = `\n╔══════════════════════════════════════╗\n`;
  output += `║  CSS Audit Report   Grade: ${grade} (${score}/100)  ║\n`;
  output += `╚══════════════════════════════════════╝\n\n`;
  output += `Files scanned: ${files.length}\n`;
  output += `Issues found:  ${allIssues.length} (${errors} errors, ${warnings} warnings, ${infos} info)\n\n`;

  if (allIssues.length === 0) {
    output += '  No issues found. Clean CSS.\n';
    return output;
  }

  // Group by file
  const byFile = {};
  allIssues.forEach(issue => {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  });

  for (const [file, issues] of Object.entries(byFile)) {
    output += `── ${path.relative(process.cwd(), file)} (${issues.length} issues) ──\n`;
    issues.forEach(({ line, severity, message, source }) => {
      const icon = severity === 'error' ? '✗' : severity === 'warning' ? '!' : '·';
      output += `  ${icon} L${line}: ${message}\n    ${source}\n`;
    });
    output += '\n';
  }

  return output;
}

// ─── Main ───
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node audit.js <path> [--recursive] [--format json|text] [--output file] [--strict] [--min-grade A-F]');
    process.exit(0);
  }

  const targetPath = args[0];
  const recursive = args.includes('--recursive') || args.includes('-r');
  const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'text';
  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
  const strict = args.includes('--strict');
  const minGradeArg = args.includes('--min-grade') ? args[args.indexOf('--min-grade') + 1] : null;

  let files = [];
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    files = findCSSFiles(targetPath, recursive);
  } else {
    files = [targetPath];
  }

  if (files.length === 0) {
    console.log('No CSS files found.');
    process.exit(0);
  }

  const allIssues = [];
  files.forEach(f => allIssues.push(...auditFile(f)));

  const score = calculateScore(allIssues);
  const grade = scoreToGrade(score);

  let result;
  if (format === 'json') {
    result = JSON.stringify({ score, grade, files: files.length, issues: allIssues }, null, 2);
  } else {
    result = formatText(files, allIssues);
  }

  if (outputFile) {
    fs.writeFileSync(outputFile, result);
    console.log(`Report written to ${outputFile}`);
  } else {
    console.log(result);
  }

  if (strict && minGradeArg) {
    const grades = ['A', 'B', 'C', 'D', 'F'];
    if (grades.indexOf(grade) > grades.indexOf(minGradeArg)) {
      console.error(`Grade ${grade} is below minimum ${minGradeArg}. Failing.`);
      process.exit(1);
    }
  }
}

main();
