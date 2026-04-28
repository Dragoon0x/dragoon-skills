#!/usr/bin/env node
'use strict';

const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { generateInvestigate } = require('../../../lib/review-extra-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon investigate - structured root-cause investigation template

USAGE
  dragoon investigate "<symptom>" [--apply] [--out path] [--json]

The rule encoded in this template: no patches until you can reproduce,
predict, and explain the bug. If you can't do all three, you haven't found
the root cause.

FLAGS
  --apply       write the file (default: dry-run preview)
  --overwrite   overwrite if today's investigation exists
  --out <path>  output path override
  --json        machine-readable
  --help, -h    this help
`;

function parseArgs(argv) {
  const args = { _: [], apply: false, overwrite: false, out: null, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const symptom = args._.join(' ').trim();
  if (!symptom) { console.error('investigate: <symptom> required (in quotes)'); return 2; }
  if (symptom.length > 200) { console.error('investigate: symptom too long (max 200)'); return 2; }

  const root = process.cwd();
  const file = generateInvestigate({ symptom });
  if (args.out) file.relPath = args.out;

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  let error = null;
  try { patcher.writeFile(file.relPath, file.content); } catch (e) { error = e.message; }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      symptom, mode: args.apply ? 'apply' : 'dry-run',
      path: file.relPath, bytes: file.content.length, error
    }, null, 2) + '\n');
    return error ? 1 : 0;
  }

  process.stdout.write(header('investigate'));
  process.stdout.write(`${c.gray}symptom: ${symptom}${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:    ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  if (error) { process.stdout.write(`${c.red}error: ${error}${c.reset}\n`); return 1; }
  if (args.apply) process.stdout.write(`${c.green}+ wrote ${file.relPath}${c.reset}\n`);
  else process.stdout.write(`${c.yellow}would write ${file.relPath}${c.reset}\n`);
  return 0;
}

process.exit(main());
