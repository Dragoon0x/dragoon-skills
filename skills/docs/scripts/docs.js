#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { detectDrift } = require('../../../lib/docs-engine');
const { c, header, fmtFinding, fmtFindingsSummary } = require('../../../lib/output');

const HELP = `dragoon docs - detect drift between markdown docs and the real codebase

USAGE
  dragoon docs [root] [--json] [--severity low|medium|high]

CHECKS
  docs-001  npm scripts referenced in docs that don't exist in package.json
  docs-002  scoped dependencies referenced in docs that aren't installed
  docs-003  file paths in backticks that don't exist on disk
  docs-004  npm scripts that aren't mentioned in any doc

FLAGS
  --severity <s>  filter to severity at or above (low|medium|high)
  --json          machine-readable output
  --quiet         only show findings, no summary
  --help, -h      this help

EXIT CODES
  0  no drift
  1  drift detected
  2  bad usage

EXAMPLES
  dragoon docs
  dragoon docs --severity medium
  dragoon docs --json
`;

function parseArgs(argv) {
  const args = { _: [], json: false, severity: 'low', quiet: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a === '--severity') args.severity = argv[++i];
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

  const root = path.resolve(args._[0] || process.cwd());
  if (!fs.existsSync(root)) { console.error(`docs: root not found: ${root}`); return 2; }

  let result;
  try { result = detectDrift(root); }
  catch (e) { console.error(`docs: ${e.message}`); return 1; }

  const minRank = severityRank(args.severity);
  const findings = result.findings.filter(f => severityRank(f.severity) >= minRank);

  if (args.json) {
    process.stdout.write(JSON.stringify({
      root, docFiles: result.docFiles,
      summary: result.summary,
      findings
    }, null, 2) + '\n');
    return findings.length > 0 ? 1 : 0;
  }

  process.stdout.write(header('docs drift'));
  process.stdout.write(`${c.gray}${result.docFiles} markdown files scanned${c.reset}\n\n`);
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
