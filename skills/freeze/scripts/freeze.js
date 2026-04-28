#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { generateFreezeManifest, generateFreezeHook } = require('../../../lib/power-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon freeze - declare directories that are off-limits to edits

USAGE
  dragoon freeze list                          show current frozen paths
  dragoon freeze add <path> [<path>...] --apply
  dragoon freeze remove <path> --apply
  dragoon freeze hook --apply                  install a pre-commit hook to enforce
  dragoon freeze check                         check the working tree against frozen paths

FLAGS
  --apply       write changes (default: dry-run for add/remove/hook)
  --json        machine-readable
  --help, -h    this help
`;

const REL_PATH = '.dragoon/freeze.json';
const HOOK_PATH = '.dragoon/check-freeze.sh';

function parseArgs(argv) {
  const args = { _: [], apply: false, json: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function load(root) {
  const p = path.join(root, REL_PATH);
  if (!fs.existsSync(p)) return { version: '1.0', notes: '', paths: [], updatedAt: null };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (_e) { return { version: '1.0', notes: '', paths: [], updatedAt: null }; }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const sub = args._[0];
  if (!sub) { process.stdout.write(HELP); return 2; }
  const root = process.cwd();
  const cur = load(root);

  switch (sub) {
    case 'list': {
      if (args.json) { process.stdout.write(JSON.stringify(cur, null, 2) + '\n'); return 0; }
      process.stdout.write(header('freeze'));
      if (cur.paths.length === 0) {
        process.stdout.write(`${c.gray}no frozen paths.${c.reset}\n`);
      } else {
        for (const p of cur.paths) process.stdout.write(`  ${p}\n`);
        process.stdout.write(`\n${c.gray}${cur.paths.length} frozen, last updated ${cur.updatedAt || 'never'}${c.reset}\n`);
      }
      return 0;
    }
    case 'add': {
      const newPaths = args._.slice(1);
      if (newPaths.length === 0) { console.error('freeze add: at least one path required'); return 2; }
      let content;
      try {
        const merged = [...new Set([...cur.paths, ...newPaths])];
        content = generateFreezeManifest({ paths: merged });
      } catch (e) { console.error(`freeze: ${e.message}`); return 2; }
      const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: true });
      try { patcher.writeFile(REL_PATH, content); }
      catch (e) { console.error(`freeze: ${e.message}`); return 1; }
      if (args.json) { process.stdout.write(JSON.stringify({ added: newPaths, mode: args.apply ? 'apply' : 'dry-run' }) + '\n'); return 0; }
      process.stdout.write(`${args.apply ? c.green + '+ added' : c.yellow + 'would add'}: ${newPaths.join(', ')}${c.reset}\n`);
      return 0;
    }
    case 'remove':
    case 'rm': {
      const target = args._[1];
      if (!target) { console.error('freeze remove: path required'); return 2; }
      const remaining = cur.paths.filter(p => p !== target);
      if (remaining.length === cur.paths.length) {
        if (args.json) process.stdout.write(JSON.stringify({ removed: false }) + '\n');
        else process.stdout.write(`${c.gray}not in freeze list${c.reset}\n`);
        return 1;
      }
      const content = generateFreezeManifest({ paths: remaining });
      const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: true });
      try { patcher.writeFile(REL_PATH, content); }
      catch (e) { console.error(`freeze: ${e.message}`); return 1; }
      if (args.json) process.stdout.write(JSON.stringify({ removed: true, path: target, mode: args.apply ? 'apply' : 'dry-run' }) + '\n');
      else process.stdout.write(`${args.apply ? c.green + '- removed' : c.yellow + 'would remove'}: ${target}${c.reset}\n`);
      return 0;
    }
    case 'hook': {
      const hook = generateFreezeHook();
      const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: true });
      try {
        patcher.writeFile(HOOK_PATH, hook);
        if (args.apply) try { fs.chmodSync(path.join(root, HOOK_PATH), 0o755); } catch (_e) {}
      } catch (e) { console.error(`freeze: ${e.message}`); return 1; }
      if (args.json) {
        process.stdout.write(JSON.stringify({ mode: args.apply ? 'apply' : 'dry-run', path: HOOK_PATH }) + '\n');
        return 0;
      }
      process.stdout.write(header('freeze hook'));
      if (args.apply) {
        process.stdout.write(`${c.green}+ wrote ${HOOK_PATH}${c.reset}\n\n`);
        process.stdout.write(`${c.bold}install:${c.reset}\n`);
        process.stdout.write(`  ${c.cyan}ln -s ../../${HOOK_PATH} .git/hooks/pre-commit${c.reset}\n`);
      } else {
        process.stdout.write(`${c.yellow}would write ${HOOK_PATH}${c.reset}\n`);
      }
      return 0;
    }
    case 'check': {
      // simulate the hook in JS, useful for CI
      if (cur.paths.length === 0) {
        if (args.json) process.stdout.write(JSON.stringify({ violations: [] }) + '\n');
        else process.stdout.write(`${c.gray}no frozen paths${c.reset}\n`);
        return 0;
      }
      const { execSync } = require('child_process');
      let staged;
      try { staged = execSync('git diff --cached --name-only', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); }
      catch (_e) { staged = []; }
      const violations = [];
      for (const f of staged) {
        for (const p of cur.paths) {
          if (f === p || f.startsWith(p.endsWith('/') ? p : p + '/')) {
            violations.push({ file: f, frozenPath: p });
          }
        }
      }
      if (args.json) { process.stdout.write(JSON.stringify({ violations }) + '\n'); return violations.length > 0 ? 1 : 0; }
      process.stdout.write(header('freeze check'));
      if (violations.length === 0) process.stdout.write(`${c.green}✓ no violations${c.reset}\n`);
      else {
        for (const v of violations) process.stdout.write(`  ${c.red}${v.file}${c.reset}  ${c.gray}(frozen: ${v.frozenPath})${c.reset}\n`);
      }
      return violations.length > 0 ? 1 : 0;
    }
    default:
      console.error(`freeze: unknown subcommand "${sub}"`);
      return 2;
  }
}

process.exit(main());
