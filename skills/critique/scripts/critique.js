#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { scan } = require('../../../lib/scan-engine');
const { critique, grade } = require('../../../lib/critique-engine');
const { c, header, fmtScores } = require('../../../lib/output');

const HELP = `dragoon critique - 0-100 design quality scores with breakdown

USAGE
  dragoon critique [root] [--manifest path] [--json] [--quiet] [--no-breakdown]

FLAGS
  --manifest <p>  use existing manifest instead of re-scanning
  --json          machine-readable output (suitable for CI)
  --no-breakdown  show scores only, skip the per-category reasons
  --quiet         only print the overall score
  --threshold <n> exit non-zero if overall score below n (CI gate)
  --help, -h      show this help

EXIT CODES
  0  success (or threshold met)
  1  threshold not met
  2  bad usage

EXAMPLES
  dragoon critique
  dragoon critique --threshold 80
  dragoon critique --manifest ./dragoon.json --json
`;

function parseArgs(argv) {
  const args = { _: [], manifest: null, json: false, quiet: false, noBreakdown: false, threshold: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--manifest') args.manifest = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--no-breakdown') args.noBreakdown = true;
    else if (a === '--threshold') args.threshold = parseInt(argv[++i], 10);
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }

  let manifest;
  if (args.manifest) {
    if (!fs.existsSync(args.manifest)) { console.error(`critique: manifest not found: ${args.manifest}`); return 2; }
    try { manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8')); }
    catch (e) { console.error(`critique: invalid manifest: ${e.message}`); return 2; }
  } else {
    const root = path.resolve(args._[0] || process.cwd());
    const conventional = path.join(root, 'dragoon.json');
    if (fs.existsSync(conventional)) {
      try { manifest = JSON.parse(fs.readFileSync(conventional, 'utf8')); }
      catch (_e) { /* fall through to scan */ }
    }
    if (!manifest) {
      process.stderr.write(`${c.gray}no dragoon.json found, scanning ${root}...${c.reset}\n`);
      try { manifest = scan(root); }
      catch (e) { console.error(`critique: scan failed: ${e.message}`); return 1; }
    }
  }

  const result = critique(manifest);

  if (args.json) {
    process.stdout.write(JSON.stringify({
      project: manifest.project,
      ...result,
      grade: grade(result.scores.overall)
    }, null, 2) + '\n');
  } else if (args.quiet) {
    process.stdout.write(`${result.scores.overall}/100  ${grade(result.scores.overall)}\n`);
  } else {
    process.stdout.write(header(`design critique - ${manifest.project.name}`));
    process.stdout.write(fmtScores(result.scores, args.noBreakdown ? null : result.breakdown));
    process.stdout.write(`\ngrade: ${grade(result.scores.overall)}  (${result.scores.overall}/100)\n`);
  }

  if (args.threshold !== null && result.scores.overall < args.threshold) {
    if (!args.json && !args.quiet) {
      process.stdout.write(`${c.red}threshold not met: ${result.scores.overall} < ${args.threshold}${c.reset}\n`);
    }
    return 1;
  }
  return 0;
}

process.exit(main());
