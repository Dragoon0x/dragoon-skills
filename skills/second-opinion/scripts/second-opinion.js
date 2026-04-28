#!/usr/bin/env node
'use strict';

const path = require('path');
const { Patcher } = require('../../../lib/patch');
const { generateSecondOpinion } = require('../../../lib/review-extra-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon second-opinion - build a clean packet to paste into another model

USAGE
  dragoon second-opinion "<topic>" [--file path]... [--apply] [--json]

dragoon does NOT call other models. it produces a markdown packet you paste.

FLAGS
  --file <path>   include a file's contents (max 5 files, 200 lines each)
  --apply         write the file (default: dry-run preview)
  --overwrite     overwrite today's packet
  --out <path>    output path override
  --json          machine-readable
  --help, -h      this help

EXAMPLES
  dragoon second-opinion "is this useEffect logic correct" --file src/Hook.tsx --apply
`;

function parseArgs(argv) {
  const args = { _: [], files: [], apply: false, overwrite: false, out: null, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--file') args.files.push(argv[++i]);
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
  if (!topic) { console.error('second-opinion: <topic> required (in quotes)'); return 2; }
  if (topic.length > 200) { console.error('second-opinion: topic too long (max 200)'); return 2; }
  if (args.files.length > 10) { console.error('second-opinion: too many files (max 10)'); return 2; }

  const root = process.cwd();
  const file = generateSecondOpinion({ topic, root, includeFiles: args.files });
  if (args.out) file.relPath = args.out;

  const patcher = new Patcher(root, { dryRun: !args.apply, overwrite: args.overwrite });
  let error = null;
  try { patcher.writeFile(file.relPath, file.content); } catch (e) { error = e.message; }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      topic, files: args.files, mode: args.apply ? 'apply' : 'dry-run',
      path: file.relPath, bytes: file.content.length, error
    }, null, 2) + '\n');
    return error ? 1 : 0;
  }

  process.stdout.write(header('second opinion'));
  process.stdout.write(`${c.gray}topic: ${topic}${c.reset}\n`);
  process.stdout.write(`${c.gray}files: ${args.files.length} attached${c.reset}\n`);
  process.stdout.write(`${c.gray}mode:  ${args.apply ? c.green + 'apply' : c.yellow + 'dry-run'}${c.reset}\n\n`);
  if (error) { process.stdout.write(`${c.red}error: ${error}${c.reset}\n`); return 1; }
  if (args.apply) {
    process.stdout.write(`${c.green}+ wrote ${file.relPath}${c.reset}  ${c.gray}(${file.content.length} bytes)${c.reset}\n`);
    process.stdout.write(`\n${c.gray}paste this file into your other model of choice.${c.reset}\n`);
  } else {
    process.stdout.write(`${c.yellow}would write ${file.relPath}${c.reset}\n`);
  }
  return 0;
}

process.exit(main());
