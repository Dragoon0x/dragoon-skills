'use strict';

// Consistent terminal output. Color-aware (respects NO_COLOR env). No deps.

const useColor = !process.env.NO_COLOR && process.stdout.isTTY;

const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  blue: useColor ? '\x1b[34m' : '',
  magenta: useColor ? '\x1b[35m' : '',
  cyan: useColor ? '\x1b[36m' : '',
  gray: useColor ? '\x1b[90m' : ''
};

function severityColor(sev) {
  if (sev === 'high') return c.red;
  if (sev === 'medium') return c.yellow;
  return c.gray;
}

function gradeColor(score) {
  if (score >= 80) return c.green;
  if (score >= 60) return c.yellow;
  return c.red;
}

function header(title) {
  return `${c.bold}${title}${c.reset}\n${c.gray}${'─'.repeat(title.length)}${c.reset}\n`;
}

function bar(score, width = 24) {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return `${gradeColor(score)}${'█'.repeat(filled)}${c.gray}${'░'.repeat(empty)}${c.reset}`;
}

function fmtScores(scores, breakdown) {
  const labels = Object.keys(scores).filter(k => k !== 'overall');
  const maxLabel = Math.max(...labels.map(l => l.length));
  let out = '';
  out += `${c.bold}overall${c.reset}        ${bar(scores.overall)}  ${gradeColor(scores.overall)}${scores.overall}/100${c.reset}\n\n`;
  for (const label of labels) {
    const padded = label.padEnd(maxLabel + 1);
    out += `${padded}  ${bar(scores[label])}  ${gradeColor(scores[label])}${scores[label]}/100${c.reset}\n`;
    if (breakdown && breakdown[label]) {
      for (const b of breakdown[label]) {
        const sym = b.kind === 'ok' ? `${c.green}✓${c.reset}` : `${c.red}-${b.amount}${c.reset}`;
        out += `  ${c.gray}${sym} ${b.reason}${c.reset}\n`;
      }
    }
  }
  return out;
}

function fmtFinding(f) {
  const sev = severityColor(f.severity);
  const file = f.file || '<unknown>';
  return `${sev}[${f.severity.toUpperCase()}] ${f.rule}${c.reset} ${c.bold}${f.ruleName}${c.reset}\n` +
         `  ${c.gray}${file}:${f.line}:${f.column}${c.reset}\n` +
         (f.snippet ? `  ${c.dim}${f.snippet}${c.reset}\n` : '') +
         `  ${f.message}\n` +
         (f.fix ? `  ${c.cyan}fix:${c.reset} ${f.fix}\n` : '');
}

function fmtFindingsSummary(findings) {
  if (findings.length === 0) {
    return `${c.green}✓ no findings${c.reset}\n`;
  }
  const bySev = { high: 0, medium: 0, low: 0 };
  const byRule = new Map();
  for (const f of findings) {
    bySev[f.severity]++;
    byRule.set(f.rule, (byRule.get(f.rule) || 0) + 1);
  }
  let out = `${c.bold}${findings.length} findings${c.reset}  `;
  out += `${c.red}${bySev.high} high${c.reset}  ${c.yellow}${bySev.medium} medium${c.reset}  ${c.gray}${bySev.low} low${c.reset}\n\n`;
  return out;
}

module.exports = { c, header, bar, fmtScores, fmtFinding, fmtFindingsSummary, useColor };
