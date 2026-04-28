#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { walk, readSafe } = require('../../../lib/files');
const { runRules, RULES } = require('../../../lib/slop-rules');
const { c, fmtFinding, fmtFindingsSummary } = require('../../../lib/output');

const HELP = `dragoon slop - detect AI-generated design slop

USAGE
  dragoon slop [path] [--manifest path] [--json] [--quiet] [--rules]

FLAGS
  --manifest <p>  path to dragoon.json. enables codebase-aware rules.
  --json          machine-readable output
  --quiet         only print findings, no summary
  --rules         list all rule ids and descriptions, then exit
  --severity <s>  only show findings at or above severity (low|medium|high)
  --help, -h      show this help

EXIT CODES
  0  no findings
  1  findings present
  2  bad usage

EXAMPLES
  dragoon slop
  dragoon slop src --manifest ./dragoon.json
  dragoon slop src/Card.tsx --severity high --json
`;

function parseArgs(argv) {
  const args = { _: [], manifest: null, json: false, quiet: false, rules: false, severity: 'low', help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--manifest') args.manifest = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--rules') args.rules = true;
    else if (a === '--severity') args.severity = argv[++i];
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
    for (const r of RULES) {
      process.stdout.write(`${r.id}  ${r.name}  [${r.severity}]\n  ${r.description}\n\n`);
    }
    return 0;
  }

  const target = path.resolve(args._[0] || process.cwd());
  if (!fs.existsSync(target)) { console.error(`slop: not found: ${target}`); return 2; }

  let manifest = null;
  if (args.manifest) {
    try { manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8')); }
    catch (e) { console.error(`slop: failed to read manifest: ${e.message}`); return 2; }
  } else {
    // try the conventional location
    const conventional = path.join(process.cwd(), 'dragoon.json');
    if (fs.existsSync(conventional)) {
      try { manifest = JSON.parse(fs.readFileSync(conventional, 'utf8')); } catch (_e) { /* ignore */ }
    }
  }

  const root = fs.statSync(target).isDirectory() ? target : path.dirname(target);
  const files = fs.statSync(target).isDirectory() ? walk(target) : [target];

  const findings = [];
  const minRank = severityRank(args.severity);
  for (const file of files) {
    const content = readSafe(file);
    if (!content) continue;
    const ext = path.extname(file).toLowerCase();
    const ctx = { file, ext, manifest, root, stack: manifest && manifest.stack };
    const result = runRules(content, ctx);
    for (const f of result) {
      if (severityRank(f.severity) >= minRank) findings.push(f);
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      target,
      manifestUsed: !!manifest,
      filesScanned: files.length,
      findings
    }, null, 2) + '\n');
    return findings.length > 0 ? 1 : 0;
  }

  if (!args.quiet) process.stdout.write(fmtFindingsSummary(findings));
  // group by file for readability
  const byFile = new Map();
  for (const f of findings) {
    const key = f.file || '<unknown>';
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(f);
  }
  for (const [file, list] of byFile) {
    list.sort((a, b) => a.line - b.line);
    for (const f of list) process.stdout.write(fmtFinding(f));
  }

  if (!args.quiet && findings.length > 0) {
    process.stdout.write(`\n${c.gray}run ${c.bold}dragoon slop --rules${c.reset}${c.gray} to see all rule descriptions${c.reset}\n`);
    if (!manifest) {
      process.stdout.write(`${c.gray}tip: run ${c.bold}dragoon scan${c.reset}${c.gray} first to enable codebase-aware rules${c.reset}\n`);
    }
  }
  return findings.length > 0 ? 1 : 0;
}

process.exit(main());
