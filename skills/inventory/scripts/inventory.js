#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { inventory } = require('../../../lib/inventory-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon inventory - catalog of components, hooks, pages, stories, tokens

USAGE
  dragoon inventory [root] [--json] [--group <kind>]

GROUPS
  components | hooks | pages | stories | tokens
  default: shows summary + first 10 of each

FLAGS
  --group <kind>  show full list of one kind
  --json          machine-readable output
  --help, -h      this help
`;

function parseArgs(argv) {
  const args = { _: [], group: null, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--group') args.group = argv[++i];
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
  if (!fs.existsSync(root)) { console.error(`inventory: not found: ${root}`); return 2; }

  let result;
  try { result = inventory(root); }
  catch (e) { console.error(`inventory: ${e.message}`); return 1; }

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return 0;
  }

  process.stdout.write(header('inventory'));
  const s = result.summary;
  process.stdout.write(`${c.gray}components ${s.components}  hooks ${s.hooks}  pages ${s.pages}  stories ${s.stories}  tokens ${s.tokens}${c.reset}\n\n`);

  const groups = args.group ? [args.group] : ['components', 'hooks', 'pages', 'stories', 'tokens'];
  for (const g of groups) {
    if (!result[g]) continue;
    const list = result[g];
    if (list.length === 0) continue;
    process.stdout.write(`${c.bold}${g}${c.reset}\n`);
    const limit = args.group ? list.length : 10;
    for (const item of list.slice(0, limit)) {
      const label = item.name ? `${item.name}` : item.rel;
      process.stdout.write(`  ${label}  ${c.gray}${item.rel}${c.reset}\n`);
    }
    if (!args.group && list.length > 10) process.stdout.write(`  ${c.gray}... ${list.length - 10} more (use --group ${g} for full list)${c.reset}\n`);
    process.stdout.write('\n');
  }
  return 0;
}

process.exit(main());
