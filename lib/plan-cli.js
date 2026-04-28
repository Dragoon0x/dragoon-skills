'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('./patch');
const { scan } = require('./scan-engine');
const { c, header } = require('./output');

function makePlanCli({ name, generate, defaultOutDir = '.dragoon/plans' }) {
  const HELP = `dragoon ${name} - generate a ${name} document for an idea

USAGE
  dragoon ${name} "<idea>" [--apply] [--manifest p] [--out path] [--json]

ARGS
  idea            one-line idea or feature title (use quotes)

FLAGS
  --apply         actually write the file (default: dry-run preview)
  --manifest <p>  use a specific dragoon.json
  --out <path>    output path override (default: ${defaultOutDir}/...)
  --overwrite     overwrite if the same plan exists for today
  --json          machine-readable output
  --help, -h      this help

EXAMPLES
  dragoon ${name} "add user invites"
  dragoon ${name} "add user invites" --apply
`;

  function parseArgs(argv) {
    const args = { _: [], apply: false, manifest: null, out: null, overwrite: false, json: false, help: false };
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === '--help' || a === '-h') args.help = true;
      else if (a === '--apply') args.apply = true;
      else if (a === '--manifest') args.manifest = argv[++i];
      else if (a === '--out') args.out = argv[++i];
      else if (a === '--overwrite') args.overwrite = true;
      else if (a === '--json') args.json = true;
      else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
      else args._.push(a);
    }
    return args;
  }

  function loadManifest(root, manifestPath) {
    if (manifestPath) {
      try { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
      catch (_e) { return null; }
    }
    const conventional = path.join(root, 'dragoon.json');
    if (fs.existsSync(conventional)) {
      try { return JSON.parse(fs.readFileSync(conventional, 'utf8')); } catch (_e) { return null; }
    }
    // try a quick scan, but tolerate failure (planning shouldn't require code)
    try { return scan(root); } catch (_e) { return null; }
  }

  return function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { process.stdout.write(HELP); return 0; }
    const idea = args._.join(' ').trim();
    if (!idea) { console.error(`${name}: <idea> is required (in quotes)\n`); process.stderr.write(HELP); return 2; }
    if (idea.length > 200) { console.error(`${name}: idea too long (max 200 chars)`); return 2; }

    const root = process.cwd();
    const manifest = loadManifest(root, args.manifest);

    let file;
    try { file = generate({ idea, manifest, root }); }
    catch (e) { console.error(`${name}: generation failed: ${e.message}`); return 1; }

    if (args.out) file.relPath = args.out;

    const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
    let error = null;
    try { patcher.writeFile(file.relPath, file.content); }
    catch (e) { error = e.message; }

    if (args.json) {
      process.stdout.write(JSON.stringify({
        name, idea, mode: args.apply ? 'apply' : 'dry-run',
        path: file.relPath, bytes: file.content.length,
        manifestUsed: !!manifest,
        error
      }, null, 2) + '\n');
      return error ? 1 : 0;
    }

    process.stdout.write(header(`${name}`));
    process.stdout.write(`${c.gray}idea: ${idea}${c.reset}\n`);
    process.stdout.write(`${c.gray}mode: ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run (use --apply to write)'}${c.reset}\n`);
    process.stdout.write(`${c.gray}manifest: ${manifest ? 'loaded' : 'not found (using defaults)'}${c.reset}\n\n`);

    if (error) {
      process.stdout.write(`${c.red}error: ${error}${c.reset}\n`);
      process.stdout.write(`${c.gray}tip: pass --overwrite if you want to replace today's plan${c.reset}\n`);
      return 1;
    }

    if (args.apply) {
      process.stdout.write(`${c.green}+ wrote ${file.relPath}${c.reset}  ${c.gray}(${file.content.length} bytes)${c.reset}\n`);
    } else {
      process.stdout.write(`${c.yellow}would write ${file.relPath}${c.reset}  ${c.gray}(${file.content.length} bytes)${c.reset}\n\n`);
      // show first 20 lines as preview
      const lines = file.content.split('\n').slice(0, 20);
      process.stdout.write(`${c.dim}${lines.join('\n')}\n${c.gray}... (${file.content.split('\n').length - 20} more lines)${c.reset}\n`);
    }
    return 0;
  };
}

module.exports = { makePlanCli };
