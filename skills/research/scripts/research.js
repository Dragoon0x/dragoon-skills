#!/usr/bin/env node
'use strict';

const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { generateResearch } = require('../../../lib/research-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon research - structured research template (no network calls)

USAGE
  dragoon research "<topic>" [--apply] [--json]

dragoon does NOT fetch the web. it produces a template you fill in.

FLAGS
  --apply         actually write the file (default: dry-run preview)
  --overwrite     overwrite if today's research exists
  --out <path>    output path override
  --json          machine-readable output
  --help, -h      this help
`;

function parseArgs(argv) {
  const args = { _: [], apply: false, overwrite: false, out: null, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--overwrite') args.overwrite = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const topic = args._.join(' ').trim();
  if (!topic) { console.error('research: <topic> required (in quotes)'); return 2; }
  if (topic.length > 200) { console.error('research: topic too long (max 200 chars)'); return 2; }

  const root = process.cwd();
  const file = generateResearch({ topic });
  if (args.out) file.relPath = args.out;

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  let error = null;
  try { patcher.writeFile(file.relPath, file.content); }
  catch (e) { error = e.message; }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      topic, mode: args.apply ? 'apply' : 'dry-run',
      path: file.relPath, bytes: file.content.length, error
    }, null, 2) + '\n');
    return error ? 1 : 0;
  }

  process.stdout.write(header('research'));
  process.stdout.write(`${c.gray}topic: ${topic}${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:  ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  if (error) { process.stdout.write(`${c.red}error: ${error}${c.reset}\n`); return 1; }
  if (args.apply) {
    process.stdout.write(`${c.green}+ wrote ${file.relPath}${c.reset}  ${c.gray}(${file.content.length} bytes)${c.reset}\n`);
  } else {
    process.stdout.write(`${c.yellow}would write ${file.relPath}${c.reset}\n`);
  }
  return 0;
}

process.exit(main());
