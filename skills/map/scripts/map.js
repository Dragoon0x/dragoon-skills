#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { buildMap } = require('../../../lib/map-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon map - architecture overview: hot files, largest files, orphans, top deps

USAGE
  dragoon map [root] [--json]

OUTPUT
  - totals (files, lines, bytes)
  - top 10 hot files (most imported by other files)
  - top 10 largest files (by line count)
  - top 20 orphan files (imported by nobody, not entry-like)
  - top 12 external deps by import frequency

FLAGS
  --json          machine-readable output
  --help, -h      this help
`;

function parseArgs(argv) {
  const args = { _: [], json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const root = path.resolve(args._[0] || process.cwd());
  if (!fs.existsSync(root)) { console.error(`map: not found: ${root}`); return 2; }

  let result;
  try { result = buildMap(root); }
  catch (e) { console.error(`map: ${e.message}`); return 1; }

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return 0;
  }

  process.stdout.write(header(`architecture map`));
  const t = result.totals;
  process.stdout.write(`${c.gray}${t.files} files, ${t.lines} lines, ${(t.bytes / 1024).toFixed(1)}KB${c.reset}\n\n`);

  if (result.hot.length > 0) {
    process.stdout.write(`${c.bold}hot files${c.reset}  ${c.gray}(most imported)${c.reset}\n`);
    for (const f of result.hot) {
      process.stdout.write(`  ${String(f.importedBy).padStart(3)} imports  ${c.gray}${f.lines} lines${c.reset}  ${f.rel}\n`);
    }
    process.stdout.write('\n');
  }

  if (result.large.length > 0) {
    process.stdout.write(`${c.bold}largest files${c.reset}\n`);
    for (const f of result.large) {
      process.stdout.write(`  ${String(f.lines).padStart(5)} lines  ${c.gray}${(f.bytes / 1024).toFixed(1)}KB${c.reset}  ${f.rel}\n`);
    }
    process.stdout.write('\n');
  }

  if (result.orphans.length > 0) {
    process.stdout.write(`${c.bold}orphans${c.reset}  ${c.gray}(imported by nobody)${c.reset}\n`);
    for (const f of result.orphans.slice(0, 10)) {
      process.stdout.write(`  ${c.gray}${String(f.lines).padStart(4)} lines${c.reset}  ${f.rel}\n`);
    }
    if (result.orphans.length > 10) process.stdout.write(`  ${c.gray}... and ${result.orphans.length - 10} more${c.reset}\n`);
    process.stdout.write('\n');
  }

  if (result.externals.length > 0) {
    process.stdout.write(`${c.bold}top external deps${c.reset}\n`);
    for (const e of result.externals) {
      process.stdout.write(`  ${String(e.count).padStart(4)}×  ${e.name}\n`);
    }
  }
  return 0;
}

process.exit(main());
