#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { Patcher } = require('../../../lib/patch');
const { canaryScript } = require('../../../lib/ship-extra-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon canary - generate a canary watcher script for a deployed url

USAGE
  dragoon canary <url> [--status N] [--interval N] [--apply] [--json]

ARGS
  url             url to monitor (https://...)

FLAGS
  --status <N>    expected http status code (default: 200)
  --interval <N>  seconds between checks in --watch mode (default: 60)
  --out <path>    output path (default: scripts/canary.sh)
  --apply         actually write the file
  --overwrite     overwrite if exists
  --json          machine-readable
  --help, -h      this help

USAGE OF GENERATED SCRIPT
  bash scripts/canary.sh                # one-shot, exits 0/1
  bash scripts/canary.sh --watch        # continuous loop
`;

function parseArgs(argv) {
  const args = { _: [], status: 200, interval: 60, out: null, apply: false, overwrite: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--status') args.status = parseInt(argv[++i], 10);
    else if (a === '--interval') args.interval = parseInt(argv[++i], 10);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--apply') args.apply = true;
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const url = args._[0];
  if (!url) { console.error('canary: <url> required'); return 2; }
  // strict URL validation: must be http(s) and parseable
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('only http and https supported');
    }
  } catch (e) {
    console.error(`canary: invalid url: ${e.message}`);
    return 2;
  }
  if (!Number.isFinite(args.status) || args.status < 100 || args.status > 599) {
    console.error('canary: --status must be a number 100-599'); return 2;
  }
  if (!Number.isFinite(args.interval) || args.interval < 5 || args.interval > 86400) {
    console.error('canary: --interval must be a number 5-86400'); return 2;
  }

  const root = process.cwd();
  const relPath = args.out || 'scripts/canary.sh';
  let content;
  try {
    content = canaryScript({ url, expectStatus: args.status, intervalSeconds: args.interval });
  } catch (e) {
    console.error(`canary: ${e.message}`);
    return 2;
  }

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  let error = null;
  try {
    patcher.writeFile(relPath, content);
    if (args.apply) {
      try { fs.chmodSync(path.join(root, relPath), 0o755); } catch (_e) { /* best effort */ }
    }
  } catch (e) { error = e.message; }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      url, status: args.status, interval: args.interval,
      mode: args.apply ? 'apply' : 'dry-run', path: relPath, bytes: content.length, error
    }, null, 2) + '\n');
    return error ? 1 : 0;
  }

  process.stdout.write(header('canary'));
  process.stdout.write(`${c.gray}url:      ${url}${c.reset}\n`);
  process.stdout.write(`${c.gray}status:   ${args.status}${c.reset}\n`);
  process.stdout.write(`${c.gray}interval: ${args.interval}s${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:     ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  if (error) { process.stdout.write(`${c.red}error: ${error}${c.reset}\n`); return 1; }
  if (args.apply) {
    process.stdout.write(`${c.green}+ wrote ${relPath}${c.reset} (${content.length} bytes)\n`);
    process.stdout.write(`\n${c.bold}usage:${c.reset}\n`);
    process.stdout.write(`  ${c.cyan}bash ${relPath}${c.reset}            ${c.gray}# one-shot${c.reset}\n`);
    process.stdout.write(`  ${c.cyan}bash ${relPath} --watch${c.reset}    ${c.gray}# continuous${c.reset}\n`);
  } else {
    process.stdout.write(`${c.yellow}would write ${relPath}${c.reset}\n`);
  }
  return 0;
}

process.exit(main());
