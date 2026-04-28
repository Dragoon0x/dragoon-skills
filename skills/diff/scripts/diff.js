#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { generateDiffScaffold } = require('../../../lib/diff-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon diff - scaffold a playwright visual regression suite

USAGE
  dragoon diff [--routes path,path,...] [--apply] [--json]

WHAT IT WRITES
  playwright.visual.config.ts   playwright config tuned for snapshot tests
  tests/visual/routes.ts        list of routes to capture (default: /)
  tests/visual/snapshots.spec.ts spec that loops the routes and compares to baseline

DRAGOON DOES NOT PERFORM THE DIFFING. Playwright does it via toHaveScreenshot.

FLAGS
  --routes <list> comma-separated paths (e.g. "/,/about,/login")
  --apply         actually write files (default: dry-run preview)
  --overwrite     overwrite if the files exist
  --json          machine-readable output
  --help, -h      this help

NEXT STEPS AFTER --apply
  1. npm i -D @playwright/test
  2. npx playwright install --with-deps chromium
  3. npx playwright test tests/visual --update-snapshots   # first time, baselines
  4. npx playwright test tests/visual                      # subsequent runs detect drift
`;

function parseArgs(argv) {
  const args = { routes: null, apply: false, overwrite: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--routes') args.routes = argv[++i];
    else if (a === '--apply') args.apply = true;
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return args;
}

function parseRoutes(s) {
  if (!s) return null;
  return s.split(',').map(p => p.trim()).filter(Boolean).map(p => {
    const path = p.startsWith('/') ? p : '/' + p;
    const name = path === '/' ? 'home' : path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-');
    return { path, name };
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }

  const root = process.cwd();
  const routes = parseRoutes(args.routes);
  const files = generateDiffScaffold({ routes });
  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  const errors = [];
  for (const f of files) {
    try { patcher.writeFile(f.relPath, f.content); }
    catch (e) { errors.push({ path: f.relPath, error: e.message }); }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      mode: args.apply ? 'apply' : 'dry-run',
      routes: routes || [{ path: '/', name: 'home' }],
      changes: patcher.changes.map(c => ({ kind: c.kind, path: c.path, bytes: c.after.length })),
      errors
    }, null, 2) + '\n');
    return errors.length > 0 ? 1 : 0;
  }

  process.stdout.write(header('visual diff scaffold'));
  process.stdout.write(`${c.gray}routes: ${(routes || [{ path: '/' }]).map(r => r.path).join(', ')}${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:   ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run (use --apply to write)'}${c.reset}\n\n`);
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
    process.stdout.write(`  ${c.cyan}npx playwright install --with-deps chromium${c.reset}\n`);
    process.stdout.write(`  ${c.cyan}npx playwright test tests/visual --update-snapshots${c.reset}  ${c.gray}# first time${c.reset}\n`);
  }
  return errors.length > 0 ? 1 : 0;
}

process.exit(main());
