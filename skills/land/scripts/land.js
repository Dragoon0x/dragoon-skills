#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { landReport } = require('../../../lib/ship-extra-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon land - post-merge sanity check (synced with remote, working tree clean)

USAGE
  dragoon land [--json]

CHECKS
  - current branch
  - HEAD sha
  - local matches remote (no unpushed/unpulled)
  - working tree clean (no uncommitted changes)

dragoon does NOT trigger deploys. wire your platform into a separate step
after \`dragoon land\` returns 0.

FLAGS
  --json          machine-readable
  --help, -h      this help

EXIT CODES
  0  ready to deploy
  1  one or more checks failed
  2  bad usage / not a git repo
`;

function parseArgs(argv) {
  const args = { json: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return args;
}

function symFor(s) {
  if (s === 'ok') return `${c.green}✓${c.reset}`;
  if (s === 'fail') return `${c.red}✗${c.reset}`;
  return `${c.yellow}!${c.reset}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const root = process.cwd();
  if (!fs.existsSync(path.join(root, '.git'))) {
    console.error('land: not a git repo (no .git directory)');
    return 2;
  }
  const result = landReport(root);

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return result.passed ? 0 : 1;
  }
  process.stdout.write(header('land'));
  for (const step of result.steps) {
    process.stdout.write(`${symFor(step.status)} ${c.bold}${step.name.padEnd(15)}${c.reset}  ${c.gray}${step.detail}${c.reset}\n`);
  }
  process.stdout.write('\n');
  if (result.passed) process.stdout.write(`${c.green}clean. ready to deploy.${c.reset}\n`);
  else process.stdout.write(`${c.red}not ready. fix the failed checks first.${c.reset}\n`);
  return result.passed ? 0 : 1;
}

process.exit(main());
