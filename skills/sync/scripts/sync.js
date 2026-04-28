#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { scan } = require('../../../lib/scan-engine');
const { generateFigmaTokens } = require('../../../lib/power-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon sync - export design tokens to figma.tokens.json (tokens-studio format)

USAGE
  dragoon sync [--apply] [--manifest p] [--out path] [--json]

dragoon does NOT live-sync with figma (that requires oauth + figma rest api).
this writes a json file the figma "tokens studio" plugin can import. for live
sync, see weeks 7+ of the dragoon roadmap.

FLAGS
  --apply         actually write the file (default: dry-run)
  --manifest <p>  use a specific dragoon.json
  --out <path>    output path (default: figma.tokens.json)
  --overwrite     overwrite if exists
  --json          machine-readable
  --help, -h      this help
`;

function parseArgs(argv) {
  const args = { apply: false, manifest: null, out: null, overwrite: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--manifest') args.manifest = argv[++i];
    else if (a === '--out') args.out = argv[++i];
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
  const conv = path.join(root, 'dragoon.json');
  if (fs.existsSync(conv)) {
    try { return JSON.parse(fs.readFileSync(conv, 'utf8')); } catch (_e) { return null; }
  }
  try { return scan(root); } catch (_e) { return null; }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const root = process.cwd();
  const manifest = loadManifest(root, args.manifest);
  if (!manifest) { console.error('sync: no manifest available. run dragoon scan first.'); return 1; }

  let content;
  try { content = generateFigmaTokens(manifest); }
  catch (e) { console.error(`sync: ${e.message}`); return 1; }
  const relPath = args.out || 'figma.tokens.json';

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  let error = null;
  try { patcher.writeFile(relPath, content); }
  catch (e) { error = e.message; }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      mode: args.apply ? 'apply' : 'dry-run',
      path: relPath, bytes: content.length, error
    }, null, 2) + '\n');
    return error ? 1 : 0;
  }

  process.stdout.write(header('sync (figma tokens)'));
  process.stdout.write(`${c.gray}mode: ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  if (error) { process.stdout.write(`${c.red}error: ${error}${c.reset}\n`); return 1; }
  if (args.apply) {
    process.stdout.write(`${c.green}+ wrote ${relPath}${c.reset}  ${c.gray}(${content.length} bytes)${c.reset}\n`);
    process.stdout.write(`\n${c.gray}import this in figma via the tokens studio plugin (file > import).${c.reset}\n`);
  } else {
    process.stdout.write(`${c.yellow}would write ${relPath}${c.reset}\n`);
  }
  return 0;
}

process.exit(main());
