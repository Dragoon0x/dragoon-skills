#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { walk, readSafe } = require('../../../lib/files');
const { runA11y, RULES } = require('../../../lib/a11y-engine');
const { c, header, fmtFinding, fmtFindingsSummary } = require('../../../lib/output');

const HELP = `dragoon accessibility - file-level a11y rules with line locations

USAGE
  dragoon accessibility [path] [--severity s] [--rules] [--json] [--quiet]

RULES
  a11y-001  img-missing-alt                           [high]
  a11y-002  button-without-label                      [high]
  a11y-003  link-without-text                         [high]
  a11y-004  input-without-label                       [high]
  a11y-005  positive-tabindex                         [medium]
  a11y-006  click-handler-on-non-interactive          [medium]
  a11y-007  autofocus                                 [low]
  a11y-008  low-contrast-token-pair                   [medium]

FLAGS
  --severity <s>  filter to severity at or above (low|medium|high)
  --rules         list rules with descriptions and exit
  --json          machine-readable output
  --quiet         only show findings, no summary
  --help, -h      this help

EXIT CODES
  0  no findings
  1  findings present
  2  bad usage
`;

function parseArgs(argv) {
  const args = { _: [], severity: 'low', rules: false, json: false, quiet: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--severity') args.severity = argv[++i];
    else if (a === '--rules') args.rules = true;
    else if (a === '--json') args.json = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function severityRank(s) { return { low: 0, medium: 1, high: 2 }[s] ?? 0; }

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  if (args.rules) {
    for (const r of RULES) process.stdout.write(`${r.id}  ${r.name}  [${r.severity}]\n  ${r.description}\n\n`);
    return 0;
  }

  const target = path.resolve(args._[0] || process.cwd());
  if (!fs.existsSync(target)) { console.error(`accessibility: not found: ${target}`); return 2; }
  const root = fs.statSync(target).isDirectory() ? target : path.dirname(target);
  const files = fs.statSync(target).isDirectory() ? walk(target) : [target];

  const findings = [];
  const minRank = severityRank(args.severity);
  for (const file of files) {
    const content = readSafe(file);
    if (!content) continue;
    const ext = path.extname(file).toLowerCase();
    const rel = path.relative(root, file);
    const result = runA11y(content, ext);
    for (const f of result) {
      if (severityRank(f.severity) >= minRank) {
        findings.push({ ...f, file: rel });
      }
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ target, filesScanned: files.length, findings }, null, 2) + '\n');
    return findings.length > 0 ? 1 : 0;
  }

  process.stdout.write(header('accessibility'));
  if (!args.quiet) process.stdout.write(fmtFindingsSummary(findings));
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [, list] of byFile) {
    list.sort((a, b) => a.line - b.line);
    for (const f of list) process.stdout.write(fmtFinding(f));
  }
  return findings.length > 0 ? 1 : 0;
}

process.exit(main());
