#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { Patcher } = require('../../../lib/patch');
const { generateRetro } = require('../../../lib/reflect-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon retro - weekly retro template with git stats pre-loaded

USAGE
  dragoon retro [--weeks N] [--apply] [--json]

FLAGS
  --weeks N     how many weeks back to gather stats from (default: 1)
  --apply       write the file (default: dry-run)
  --overwrite   overwrite today's retro
  --out <path>  output path override
  --json        machine-readable
  --help, -h    this help
`;

function parseArgs(argv) {
  const args = { weeks: 1, apply: false, overwrite: false, out: null, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--weeks') args.weeks = parseInt(argv[++i], 10);
    else if (a === '--apply') args.apply = true;
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  if (!Number.isFinite(args.weeks) || args.weeks < 1 || args.weeks > 52) {
    console.error('retro: --weeks must be 1-52'); return 2;
  }
  const root = process.cwd();
  const file = generateRetro({ root, weeks: args.weeks });
  if (args.out) file.relPath = args.out;

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  let error = null;
  try { patcher.writeFile(file.relPath, file.content); } catch (e) { error = e.message; }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      mode: args.apply ? 'apply' : 'dry-run',
      path: file.relPath, bytes: file.content.length, error
    }, null, 2) + '\n');
    return error ? 1 : 0;
  }

  process.stdout.write(header('retro'));
  process.stdout.write(`${c.gray}weeks: ${args.weeks}${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:  ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  if (error) { process.stdout.write(`${c.red}error: ${error}${c.reset}\n`); return 1; }
  if (args.apply) process.stdout.write(`${c.green}+ wrote ${file.relPath}${c.reset}\n`);
  else process.stdout.write(`${c.yellow}would write ${file.relPath}${c.reset}\n`);
  return 0;
}

process.exit(main());
