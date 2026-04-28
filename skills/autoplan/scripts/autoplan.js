#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { scan } = require('../../../lib/scan-engine');
const { c, header } = require('../../../lib/output');
const { generateBrief, generatePlanEng, generatePlanDesign } = require('../../../lib/plan-engine');

const HELP = `dragoon autoplan - chain brief + plan-eng + plan-design in one shot

USAGE
  dragoon autoplan "<idea>" [--apply] [--manifest p] [--json]

ARGS
  idea            one-line idea or feature title (use quotes)

FLAGS
  --apply         actually write the files (default: dry-run preview)
  --manifest <p>  use a specific dragoon.json
  --overwrite     overwrite if today's plans exist
  --skip <name>   skip one of: brief, plan-eng, plan-design
  --json          machine-readable output
  --help, -h      this help

EXAMPLES
  dragoon autoplan "add user invites"
  dragoon autoplan "add user invites" --apply
  dragoon autoplan "add invites" --apply --skip brief
`;

function parseArgs(argv) {
  const args = { _: [], apply: false, manifest: null, overwrite: false, skip: [], json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--manifest') args.manifest = argv[++i];
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--skip') args.skip.push(argv[++i]);
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
  try { return scan(root); } catch (_e) { return null; }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const idea = args._.join(' ').trim();
  if (!idea) { console.error('autoplan: <idea> is required (in quotes)\n'); process.stderr.write(HELP); return 2; }
  if (idea.length > 200) { console.error('autoplan: idea too long (max 200 chars)'); return 2; }

  const root = process.cwd();
  const manifest = loadManifest(root, args.manifest);

  const generators = [
    { name: 'brief', fn: generateBrief },
    { name: 'plan-eng', fn: generatePlanEng },
    { name: 'plan-design', fn: generatePlanDesign }
  ].filter(g => !args.skip.includes(g.name));

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  const results = [];
  for (const g of generators) {
    let file, error = null;
    try {
      file = g.fn({ idea, manifest, root });
      patcher.writeFile(file.relPath, file.content);
    } catch (e) {
      error = e.message;
    }
    results.push({ name: g.name, path: file ? file.relPath : null, bytes: file ? file.content.length : 0, error });
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      idea, mode: args.apply ? 'apply' : 'dry-run',
      manifestUsed: !!manifest,
      results
    }, null, 2) + '\n');
    return results.some(r => r.error) ? 1 : 0;
  }

  process.stdout.write(header(`autoplan`));
  process.stdout.write(`${c.gray}idea: ${idea}${c.reset}\n`);
  process.stdout.write(`${c.gray}mode: ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run (use --apply to write)'}${c.reset}\n`);
  process.stdout.write(`${c.gray}manifest: ${manifest ? 'loaded' : 'not found (using defaults)'}${c.reset}\n\n`);
  for (const r of results) {
    if (r.error) {
      process.stdout.write(`${c.red}✗ ${r.name}${c.reset} ${c.gray}${r.error}${c.reset}\n`);
    } else {
      const sym = args.apply ? `${c.green}+ wrote${c.reset}` : `${c.yellow}would write${c.reset}`;
      process.stdout.write(`${sym} ${r.path}  ${c.gray}(${r.bytes} bytes)${c.reset}\n`);
    }
  }
  return results.some(r => r.error) ? 1 : 0;
}

process.exit(main());
