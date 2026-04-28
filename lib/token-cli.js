'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('./patch');
const { scan } = require('./scan-engine');
const { c, header } = require('./output');
const { defaultFormat } = require('./token-applier');

// shared CLI for typography/color/spacing/motion skills.
// each skill calls makeTokenCli({ name, generate, helpExtra }) with its specific generator.
function makeTokenCli({ name, generate, helpExtra = '' }) {
  const HELP = `dragoon ${name} - generate ${name} tokens from your codebase

USAGE
  dragoon ${name} [--format css|tailwind|js] [--dir path] [--apply]

FLAGS
  --format <f>    css | tailwind | js (default: auto-detected from stack)
  --dir <path>    output directory relative to project root (default: src/styles)
  --apply         actually write files (default: dry-run preview)
  --manifest <p>  use a specific dragoon.json
  --overwrite     overwrite existing token files
  --json          machine-readable output
  --help, -h      this help

${helpExtra}EXAMPLES
  dragoon ${name}                           # preview
  dragoon ${name} --apply                   # write
  dragoon ${name} --format tailwind --apply
`;

  function parseArgs(argv) {
    const args = { format: null, dir: 'src/styles', apply: false, manifest: null, overwrite: false, json: false, help: false };
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === '--help' || a === '-h') args.help = true;
      else if (a === '--format') args.format = argv[++i];
      else if (a === '--dir') args.dir = argv[++i];
      else if (a === '--apply') args.apply = true;
      else if (a === '--manifest') args.manifest = argv[++i];
      else if (a === '--overwrite') args.overwrite = true;
      else if (a === '--json') args.json = true;
      else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    }
    return args;
  }

  function loadOrScan(root, manifestPath) {
    if (manifestPath) return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const conventional = path.join(root, 'dragoon.json');
    if (fs.existsSync(conventional)) {
      try { return JSON.parse(fs.readFileSync(conventional, 'utf8')); } catch (_e) { /* fall through */ }
    }
    return scan(root);
  }

  return function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { process.stdout.write(HELP); return 0; }

    const root = process.cwd();
    let manifest;
    try { manifest = loadOrScan(root, args.manifest); }
    catch (e) { console.error(`${name}: ${e.message}`); return 1; }

    if (!args.format) args.format = defaultFormat(manifest.stack);
    if (!['css', 'tailwind', 'js'].includes(args.format)) {
      console.error(`${name}: invalid format "${args.format}". Use css, tailwind, or js.`);
      return 2;
    }

    let files;
    try { files = generate({ manifest, format: args.format, dir: args.dir }); }
    catch (e) { console.error(`${name}: generation failed: ${e.message}`); return 1; }

    const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
    const errors = [];
    for (const f of files) {
      try { patcher.writeFile(f.relPath, f.content); }
      catch (e) { errors.push({ path: f.relPath, error: e.message }); }
    }

    if (args.json) {
      process.stdout.write(JSON.stringify({
        name, format: args.format, mode: args.apply ? 'apply' : 'dry-run',
        changes: patcher.changes.map(c => ({ kind: c.kind, path: c.path, bytes: c.after.length })),
        errors
      }, null, 2) + '\n');
      return errors.length > 0 ? 1 : 0;
    }

    process.stdout.write(header(`${name}: ${args.format} tokens`));
    process.stdout.write(`${c.gray}mode:  ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run (use --apply to write)'}${c.reset}\n\n`);
    for (const ch of patcher.changes) {
      const sym = ch.kind === 'create' ? `${c.green}+ create${c.reset}` : `${c.yellow}~ modify${c.reset}`;
      process.stdout.write(`${sym}  ${ch.path}  ${c.gray}(${ch.after.length} bytes)${c.reset}\n`);
    }
    if (errors.length > 0) {
      process.stdout.write(`\n${c.red}errors:${c.reset}\n`);
      for (const e of errors) process.stdout.write(`  ${e.path}: ${e.error}\n`);
    }
    if (!args.apply && patcher.changes.length > 0 && errors.length === 0) {
      process.stdout.write(`\n${c.gray}preview only. re-run with --apply to write files.${c.reset}\n`);
    }
    return errors.length > 0 ? 1 : 0;
  };
}

module.exports = { makeTokenCli };
