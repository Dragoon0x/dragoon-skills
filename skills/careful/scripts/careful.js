#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { generateCarefulList } = require('../../../lib/power-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon careful - write a checklist of destructive commands to think twice about

USAGE
  dragoon careful [--apply] [--show] [--json]

WHAT IT DOES
  writes .dragoon/CAREFUL.md - a list your agent (and you) read before
  running risky commands. dragoon does not block commands at runtime;
  this is a discipline tool, not a security boundary.

FLAGS
  --apply       write the file (default: dry-run)
  --show        print the current file's contents
  --overwrite   overwrite if exists
  --json        machine-readable
  --help, -h    this help
`;

const REL_PATH = '.dragoon/CAREFUL.md';

function parseArgs(argv) {
  const args = { apply: false, show: false, overwrite: false, json: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--show') args.show = true;
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const root = process.cwd();
  const fullPath = path.join(root, REL_PATH);

  if (args.show) {
    if (!fs.existsSync(fullPath)) { console.error(`careful: ${REL_PATH} not found. run with --apply first.`); return 1; }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (args.json) process.stdout.write(JSON.stringify({ path: REL_PATH, content }) + '\n');
    else process.stdout.write(content);
    return 0;
  }

  const content = generateCarefulList();
  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  let error = null;
  try { patcher.writeFile(REL_PATH, content); }
  catch (e) { error = e.message; }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      mode: args.apply ? 'apply' : 'dry-run',
      path: REL_PATH, bytes: content.length, error
    }, null, 2) + '\n');
    return error ? 1 : 0;
  }
  process.stdout.write(header('careful'));
  process.stdout.write(`${c.gray}mode: ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  if (error) { process.stdout.write(`${c.red}error: ${error}${c.reset}\n`); return 1; }
  if (args.apply) process.stdout.write(`${c.green}+ wrote ${REL_PATH}${c.reset}\n`);
  else process.stdout.write(`${c.yellow}would write ${REL_PATH}${c.reset}\n`);
  return 0;
}

process.exit(main());
