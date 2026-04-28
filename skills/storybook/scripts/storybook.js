#!/usr/bin/env node
'use strict';

const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { generateStorybookScaffold } = require('../../../lib/ship-extra-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon storybook - scaffold storybook config + auto-generated stories per component

USAGE
  dragoon storybook [--apply] [--json]

WHAT IT WRITES
  .storybook/main.ts          storybook config (react-vite preset)
  .storybook/preview.ts       basic preview
  *.stories.tsx               one per discovered component (max 50)

DRAGOON DOES NOT INSTALL STORYBOOK. After --apply:
  npm i -D @storybook/react-vite @storybook/react @storybook/addon-essentials
  npx storybook init
  npm run storybook

FLAGS
  --apply         actually write files (default: dry-run)
  --overwrite     overwrite existing stories
  --json          machine-readable
  --help, -h      this help
`;

function parseArgs(argv) {
  const args = { apply: false, overwrite: false, json: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--apply') args.apply = true;
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
  const { files, componentsFound } = generateStorybookScaffold(root);

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  const errors = [];
  for (const f of files) {
    try { patcher.writeFile(f.relPath, f.content); }
    catch (e) { errors.push({ path: f.relPath, error: e.message }); }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      mode: args.apply ? 'apply' : 'dry-run',
      componentsFound,
      changes: patcher.changes.map(ch => ({ kind: ch.kind, path: ch.path, bytes: ch.after.length })),
      errors
    }, null, 2) + '\n');
    return errors.length > 0 ? 1 : 0;
  }

  process.stdout.write(header('storybook scaffold'));
  process.stdout.write(`${c.gray}components found: ${componentsFound}${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:             ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  for (const ch of patcher.changes.slice(0, 20)) {
    const sym = ch.kind === 'create' ? `${c.green}+ create${c.reset}` : `${c.yellow}~ modify${c.reset}`;
    process.stdout.write(`${sym}  ${ch.path}\n`);
  }
  if (patcher.changes.length > 20) {
    process.stdout.write(`${c.gray}  ... ${patcher.changes.length - 20} more${c.reset}\n`);
  }
  if (errors.length > 0) {
    process.stdout.write(`\n${c.red}errors (${errors.length}):${c.reset}\n`);
    for (const e of errors.slice(0, 10)) process.stdout.write(`  ${e.path}: ${e.error}\n`);
  }
  if (args.apply && errors.length === 0) {
    process.stdout.write(`\n${c.bold}next steps:${c.reset}\n`);
    process.stdout.write(`  ${c.cyan}npm i -D @storybook/react-vite @storybook/react @storybook/addon-essentials${c.reset}\n`);
    process.stdout.write(`  ${c.cyan}npx storybook init${c.reset}\n`);
  } else if (!args.apply) {
    process.stdout.write(`\n${c.gray}preview only. re-run with --apply to write.${c.reset}\n`);
  }
  return errors.length > 0 ? 1 : 0;
}

process.exit(main());
