#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { generate } = require('../../../lib/component-builder');
const { validComponentName, toKebab } = require('../../../lib/safe-paths');
const { scan } = require('../../../lib/scan-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon component - generate a component in your codebase's style

USAGE
  dragoon component <Name> [--dir path] [--apply] [--manifest p] [--json]

ARGS
  Name            PascalCase component name (e.g., Card, UserMenu)

FLAGS
  --dir <path>    output directory relative to project root (default: src/components)
  --apply         actually write files (default: dry-run preview)
  --manifest <p>  use a specific dragoon.json (otherwise auto-detect)
  --overwrite     overwrite existing files
  --json          machine-readable output
  --help, -h      this help

EXIT CODES
  0  success
  1  failure (validation, file conflict, etc.)
  2  bad usage

EXAMPLES
  dragoon component Card                       # preview
  dragoon component Card --apply               # write to src/components/
  dragoon component UserMenu --dir src/ui --apply
`;

function parseArgs(argv) {
  const args = { _: [], dir: 'src/components', apply: false, manifest: null, overwrite: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--dir') args.dir = argv[++i];
    else if (a === '--apply') args.apply = true;
    else if (a === '--manifest') args.manifest = argv[++i];
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function loadOrScan(root, manifestPath) {
  if (manifestPath) {
    try { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
    catch (e) { throw new Error(`invalid manifest: ${e.message}`); }
  }
  const conventional = path.join(root, 'dragoon.json');
  if (fs.existsSync(conventional)) {
    try { return JSON.parse(fs.readFileSync(conventional, 'utf8')); } catch (_e) { /* fall through */ }
  }
  return scan(root);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const name = args._[0];
  if (!name) { console.error('component: <Name> is required\n'); process.stderr.write(HELP); return 2; }
  if (!validComponentName(name)) { console.error(`component: invalid name "${name}". Must be PascalCase identifier.`); return 2; }

  const root = process.cwd();
  let manifest;
  try { manifest = loadOrScan(root, args.manifest); }
  catch (e) { console.error(`component: ${e.message}`); return 1; }

  const stack = manifest.stack || { framework: 'react', styling: ['css'], language: 'typescript' };
  const files = generate({
    name,
    kebab: toKebab(name),
    framework: stack.framework,
    styling: stack.styling,
    language: stack.language,
    dir: args.dir,
    manifest
  });

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  const errors = [];
  for (const f of files) {
    try { patcher.writeFile(f.relPath, f.content); }
    catch (e) { errors.push({ path: f.relPath, error: e.message }); }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      name,
      stack,
      mode: args.apply ? 'apply' : 'dry-run',
      changes: patcher.changes.map(c => ({ kind: c.kind, path: c.path, bytes: c.after.length })),
      errors
    }, null, 2) + '\n');
    return errors.length > 0 ? 1 : 0;
  }

  process.stdout.write(header(`component: ${name}`));
  process.stdout.write(`${c.gray}stack: ${stack.framework} + ${(stack.styling || []).join(', ')}${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:  ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run (use --apply to write)'}${c.reset}\n\n`);

  for (const ch of patcher.changes) {
    const sym = ch.kind === 'create' ? `${c.green}+ create${c.reset}` : `${c.yellow}~ modify${c.reset}`;
    process.stdout.write(`${sym}  ${ch.path}  ${c.gray}(${ch.after.length} bytes)${c.reset}\n`);
  }
  if (errors.length > 0) {
    process.stdout.write(`\n${c.red}errors:${c.reset}\n`);
    for (const e of errors) process.stdout.write(`  ${e.path}: ${e.error}\n`);
  }
  if (!args.apply && errors.length === 0) {
    process.stdout.write(`\n${c.gray}preview only. re-run with --apply to write files.${c.reset}\n`);
  }
  return errors.length > 0 ? 1 : 0;
}

process.exit(main());
