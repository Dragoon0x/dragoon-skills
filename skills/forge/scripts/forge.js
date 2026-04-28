#!/usr/bin/env node
'use strict';

const { Patcher } = require('../../../lib/patch');
const { generateSkillScaffold } = require('../../../lib/power-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon forge - generate a new skill scaffold in .dragoon/forge/<name>/

USAGE
  dragoon forge <name> [--description "..."] [--apply]

ARGS
  name             skill name (a-z, A-Z, 0-9, _) - kebab-case derived for paths

dragoon does NOT auto-install forged skills. they land in .dragoon/forge/<name>/
for review. when you're ready, copy into ~/.dragoon/skills/<name>/ and add an
entry to bin/dragoon's COMMANDS map.

FLAGS
  --description   short description for SKILL.md frontmatter
  --apply         actually write files (default: dry-run)
  --overwrite     overwrite existing forge directory contents
  --json          machine-readable
  --help, -h      this help
`;

function parseArgs(argv) {
  const args = { _: [], description: null, apply: false, overwrite: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--description') args.description = argv[++i];
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
  const name = args._[0];
  if (!name) { console.error('forge: <name> required'); return 2; }

  let files;
  try { files = generateSkillScaffold({ name, description: args.description }); }
  catch (e) { console.error(`forge: ${e.message}`); return 2; }

  const patcher = new Patcher(process.cwd(), { dryRun: !args.apply, overwrite: args.overwrite });
  const errors = [];
  for (const f of files) {
    try { patcher.writeFile(f.relPath, f.content); }
    catch (e) { errors.push({ path: f.relPath, error: e.message }); }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      name, mode: args.apply ? 'apply' : 'dry-run',
      changes: patcher.changes.map(c => ({ kind: c.kind, path: c.path, bytes: c.after.length })),
      errors
    }, null, 2) + '\n');
    return errors.length > 0 ? 1 : 0;
  }

  process.stdout.write(header(`forge: ${name}`));
  process.stdout.write(`${c.gray}mode: ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  for (const ch of patcher.changes) {
    const sym = ch.kind === 'create' ? `${c.green}+ create${c.reset}` : `${c.yellow}~ modify${c.reset}`;
    process.stdout.write(`${sym}  ${ch.path}\n`);
  }
  if (errors.length > 0) {
    process.stdout.write(`\n${c.red}errors:${c.reset}\n`);
    for (const e of errors) process.stdout.write(`  ${e.path}: ${e.error}\n`);
  }
  if (args.apply && errors.length === 0) {
    process.stdout.write(`\n${c.gray}review the scaffold, then copy to ~/.dragoon/skills/<name>/${c.reset}\n`);
  }
  return errors.length > 0 ? 1 : 0;
}

process.exit(main());
