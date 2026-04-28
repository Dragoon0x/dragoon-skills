#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { captureBenchmark, compareBenchmarks } = require('../../../lib/reflect-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon benchmark - snapshot codebase metrics for trend tracking

USAGE
  dragoon benchmark capture            take a snapshot, save to .dragoon/benchmarks/
  dragoon benchmark list               list snapshots
  dragoon benchmark compare            compare latest two
  dragoon benchmark show [date]        show one snapshot

WHAT IT CAPTURES
  - file count
  - total lines
  - critique scores (if dragoon.json exists)
  - timestamp

FLAGS
  --json        machine-readable
  --help, -h    this help
`;

const DIR = '.dragoon/benchmarks';

function parseArgs(argv) {
  const args = { _: [], json: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function listSnapshots(root) {
  const dir = path.join(root, DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ name: f.replace(/\.json$/, ''), path: path.join(dir, f) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readSnapshot(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return null; }
}

function fmtScore(label, val) {
  const col = val >= 80 ? c.green : val >= 60 ? c.yellow : c.red;
  return `${label.padEnd(15)} ${col}${val}${c.reset}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const sub = args._[0];
  if (!sub) { process.stdout.write(HELP); return 2; }
  const root = process.cwd();

  switch (sub) {
    case 'capture': {
      const snap = captureBenchmark(root);
      const dir = path.join(root, DIR);
      fs.mkdirSync(dir, { recursive: true });
      const stamp = snap.capturedAt.replace(/[:.]/g, '-');
      const filePath = path.join(dir, `${stamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(snap, null, 2), 'utf8');
      if (args.json) {
        process.stdout.write(JSON.stringify({ written: filePath, snapshot: snap }, null, 2) + '\n');
        return 0;
      }
      process.stdout.write(header('benchmark capture'));
      process.stdout.write(`${c.green}+ wrote ${path.relative(root, filePath)}${c.reset}\n\n`);
      process.stdout.write(`files:       ${snap.files}\n`);
      process.stdout.write(`total lines: ${snap.totalLines}\n`);
      if (snap.scores) {
        process.stdout.write(`\nscores:\n`);
        for (const [k, v] of Object.entries(snap.scores)) {
          process.stdout.write(`  ${fmtScore(k, v)}\n`);
        }
      } else {
        process.stdout.write(`${c.gray}no dragoon.json - skipped scores${c.reset}\n`);
      }
      return 0;
    }
    case 'list': {
      const snaps = listSnapshots(root);
      if (args.json) {
        process.stdout.write(JSON.stringify(snaps.map(s => s.name), null, 2) + '\n');
        return 0;
      }
      process.stdout.write(header('benchmarks'));
      if (snaps.length === 0) {
        process.stdout.write(`${c.gray}no snapshots yet. run: dragoon benchmark capture${c.reset}\n`);
        return 0;
      }
      for (const s of snaps) process.stdout.write(`  ${s.name}\n`);
      process.stdout.write(`\n${c.gray}${snaps.length} snapshots${c.reset}\n`);
      return 0;
    }
    case 'compare': {
      const snaps = listSnapshots(root);
      if (snaps.length < 2) {
        console.error('benchmark: need at least 2 snapshots to compare');
        return 1;
      }
      const a = readSnapshot(snaps[snaps.length - 2].path);
      const b = readSnapshot(snaps[snaps.length - 1].path);
      const diff = compareBenchmarks(a, b);
      if (args.json) {
        process.stdout.write(JSON.stringify({ a: snaps[snaps.length - 2].name, b: snaps[snaps.length - 1].name, diff }, null, 2) + '\n');
        return 0;
      }
      process.stdout.write(header('benchmark compare'));
      process.stdout.write(`${c.gray}${snaps[snaps.length - 2].name}  ->  ${snaps[snaps.length - 1].name}${c.reset}\n\n`);
      const sym = (n) => n > 0 ? `${c.green}+${n}${c.reset}` : n < 0 ? `${c.red}${n}${c.reset}` : `${c.gray}0${c.reset}`;
      process.stdout.write(`files:       ${sym(diff.files)}\n`);
      process.stdout.write(`total lines: ${sym(diff.totalLines)}\n`);
      if (diff.scores) {
        process.stdout.write(`\nscore deltas:\n`);
        for (const [k, v] of Object.entries(diff.scores)) {
          process.stdout.write(`  ${k.padEnd(15)} ${sym(v)}\n`);
        }
      }
      return 0;
    }
    case 'show': {
      const date = args._[1];
      const snaps = listSnapshots(root);
      const target = date
        ? snaps.find(s => s.name.startsWith(date))
        : snaps[snaps.length - 1];
      if (!target) { console.error('benchmark: no matching snapshot'); return 1; }
      const snap = readSnapshot(target.path);
      if (args.json) {
        process.stdout.write(JSON.stringify(snap, null, 2) + '\n');
        return 0;
      }
      process.stdout.write(header(`benchmark ${target.name}`));
      process.stdout.write(JSON.stringify(snap, null, 2) + '\n');
      return 0;
    }
    default:
      console.error(`benchmark: unknown subcommand "${sub}"`);
      return 2;
  }
}

process.exit(main());
