#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { scan } = require('../../../lib/scan-engine');
const { generateQaScaffold } = require('../../../lib/qa-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon qa - scaffold a playwright e2e test suite

USAGE
  dragoon qa [--apply] [--manifest p] [--json]

WHAT IT WRITES
  playwright.config.ts         playwright config tuned to your stack's dev server
  tests/e2e/smoke.spec.ts      4 smoke tests: page loads, h1 visible, no console errors, no broken images
  tests/e2e/run.sh             one-line runner that installs deps and browsers if missing

DRAGOON DOES NOT INSTALL BROWSERS. The runner script does that on first run.

FLAGS
  --apply         actually write files (default: dry-run preview)
  --manifest <p>  use a specific dragoon.json
  --overwrite     overwrite if the files exist
  --json          machine-readable output
  --help, -h      this help

NEXT STEPS AFTER --apply
  1. npm i -D @playwright/test
  2. bash tests/e2e/run.sh            # installs browsers if needed, runs tests
  3. add more spec files in tests/e2e/
`;

function parseArgs(argv) {
  const args = { apply: false, manifest: null, overwrite: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--manifest') args.manifest = argv[++i];
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return args;
}

function loadManifest(root, manifestPath) {
  if (manifestPath) {
    try { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_e) { return null; }
  }
  const conventional = path.join(root, 'dragoon.json');
  if (fs.existsSync(conventional)) {
    try { return JSON.parse(fs.readFileSync(conventional, 'utf8')); } catch (_e) { return null; }
  }
  try { return scan(root); } catch (_e) { return null; }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const root = process.cwd();
  const manifest = loadManifest(root, args.manifest);
  const stack = (manifest && manifest.stack) || { framework: 'unknown', styling: [] };

  const files = generateQaScaffold({ stack });
  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  const errors = [];
  for (const f of files) {
    try {
      patcher.writeFile(f.relPath, f.content);
      if (args.apply && f.mode) {
        try { fs.chmodSync(path.join(root, f.relPath), f.mode); } catch (_e) { /* best effort */ }
      }
    } catch (e) { errors.push({ path: f.relPath, error: e.message }); }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      mode: args.apply ? 'apply' : 'dry-run',
      stack,
      changes: patcher.changes.map(c => ({ kind: c.kind, path: c.path, bytes: c.after.length })),
      errors
    }, null, 2) + '\n');
    return errors.length > 0 ? 1 : 0;
  }

  process.stdout.write(header('qa scaffold'));
  process.stdout.write(`${c.gray}stack: ${stack.framework}${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:  ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run (use --apply to write)'}${c.reset}\n\n`);
  for (const ch of patcher.changes) {
    const sym = ch.kind === 'create' ? `${c.green}+ create${c.reset}` : `${c.yellow}~ modify${c.reset}`;
    process.stdout.write(`${sym}  ${ch.path}  ${c.gray}(${ch.after.length} bytes)${c.reset}\n`);
  }
  if (errors.length > 0) {
    process.stdout.write(`\n${c.red}errors:${c.reset}\n`);
    for (const e of errors) process.stdout.write(`  ${e.path}: ${e.error}\n`);
  }
  if (args.apply && errors.length === 0) {
    process.stdout.write(`\n${c.bold}next steps:${c.reset}\n`);
    process.stdout.write(`  ${c.cyan}npm i -D @playwright/test${c.reset}\n`);
    process.stdout.write(`  ${c.cyan}bash tests/e2e/run.sh${c.reset}\n`);
  } else if (!args.apply) {
    process.stdout.write(`\n${c.gray}preview only. re-run with --apply to write files.${c.reset}\n`);
  }
  return errors.length > 0 ? 1 : 0;
}

process.exit(main());
