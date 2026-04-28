#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadMemory, saveMemory, validKey, MEMORY_PATH } = require('../../../lib/reflect-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon memory - small persistent key-value store at .dragoon/memory.json

USAGE
  dragoon memory list
  dragoon memory get <key>
  dragoon memory set <key> <value>
  dragoon memory remove <key>
  dragoon memory clear

KEY FORMAT
  lowercase ascii, may include . _ -, max 64 chars

VALUE LIMITS
  max 8KB per value
  max 256 keys
  values are stored as plain text (no shell expansion, no parsing)

FLAGS
  --json       machine-readable output
  --yes        confirm destructive operations (clear, remove)
  --help, -h   this help
`;

function parseArgs(argv) {
  const args = { _: [], json: false, yes: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a === '--yes') args.yes = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const sub = args._[0];
  if (!sub) { process.stdout.write(HELP); return 2; }
  const root = process.cwd();
  const mem = loadMemory(root);

  switch (sub) {
    case 'list': {
      if (args.json) {
        process.stdout.write(JSON.stringify(mem, null, 2) + '\n');
        return 0;
      }
      process.stdout.write(header('memory'));
      const keys = Object.keys(mem.entries).sort();
      if (keys.length === 0) {
        process.stdout.write(`${c.gray}empty. set with: dragoon memory set <key> <value>${c.reset}\n`);
        return 0;
      }
      const maxKey = Math.max(...keys.map(k => k.length));
      for (const k of keys) {
        const v = mem.entries[k];
        const display = v.length > 60 ? v.slice(0, 57) + '...' : v;
        process.stdout.write(`  ${k.padEnd(maxKey + 2)}${c.gray}${display}${c.reset}\n`);
      }
      process.stdout.write(`\n${c.gray}${keys.length} keys, last updated ${mem.updatedAt || 'never'}${c.reset}\n`);
      return 0;
    }
    case 'get': {
      const key = args._[1];
      if (!validKey(key)) { console.error('memory: invalid key'); return 2; }
      const v = mem.entries[key];
      if (v === undefined) {
        if (args.json) process.stdout.write(JSON.stringify({ key, found: false }) + '\n');
        return 1;
      }
      if (args.json) process.stdout.write(JSON.stringify({ key, value: v, found: true }) + '\n');
      else process.stdout.write(v + '\n');
      return 0;
    }
    case 'set': {
      const key = args._[1];
      const value = args._.slice(2).join(' ');
      if (!validKey(key)) { console.error('memory: invalid key (lowercase ascii, ._- only, max 64)'); return 2; }
      if (!value) { console.error('memory: value required'); return 2; }
      if (value.length > 8192) { console.error('memory: value too long (max 8192 bytes)'); return 2; }
      const keyCount = Object.keys(mem.entries).length;
      if (!(key in mem.entries) && keyCount >= 256) {
        console.error('memory: max 256 keys; remove some first'); return 2;
      }
      mem.entries[key] = value;
      saveMemory(root, mem);
      if (args.json) process.stdout.write(JSON.stringify({ key, value, written: true }) + '\n');
      else process.stdout.write(`${c.green}✓${c.reset} set ${key}\n`);
      return 0;
    }
    case 'remove':
    case 'rm': {
      const key = args._[1];
      if (!validKey(key)) { console.error('memory: invalid key'); return 2; }
      if (!(key in mem.entries)) {
        if (args.json) process.stdout.write(JSON.stringify({ key, removed: false }) + '\n');
        else process.stdout.write(`${c.gray}no such key${c.reset}\n`);
        return 1;
      }
      delete mem.entries[key];
      saveMemory(root, mem);
      if (args.json) process.stdout.write(JSON.stringify({ key, removed: true }) + '\n');
      else process.stdout.write(`${c.green}✓${c.reset} removed ${key}\n`);
      return 0;
    }
    case 'clear': {
      if (!args.yes) {
        console.error('memory: clear requires --yes (this deletes all keys)');
        return 2;
      }
      const removed = Object.keys(mem.entries).length;
      saveMemory(root, { entries: {}, updatedAt: null });
      if (args.json) process.stdout.write(JSON.stringify({ removed }) + '\n');
      else process.stdout.write(`${c.green}✓${c.reset} cleared ${removed} keys\n`);
      return 0;
    }
    default:
      console.error(`memory: unknown subcommand "${sub}"`);
      process.stderr.write(HELP);
      return 2;
  }
}

process.exit(main());
