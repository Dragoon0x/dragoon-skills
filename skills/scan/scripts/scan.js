#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { scan } = require('../../../lib/scan-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon scan - fingerprint a codebase's design DNA

USAGE
  dragoon scan [root] [--out path] [--json] [--dry-run] [--quiet]

FLAGS
  --out <path>    where to write dragoon.json. default: <root>/dragoon.json
  --json          print the manifest to stdout (in addition to writing)
  --dry-run       compute the manifest but don't write to disk
  --quiet         no terminal output beyond errors
  --help, -h      show this help

EXAMPLES
  dragoon scan
  dragoon scan ./packages/web --out ./dragoon.json
  dragoon scan --json --dry-run > preview.json
`;

function parseArgs(argv) {
  const args = { _: [], out: null, json: false, dryRun: false, quiet: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }

  const root = path.resolve(args._[0] || process.cwd());
  if (!fs.existsSync(root)) { console.error(`scan: root not found: ${root}`); return 1; }

  if (!args.quiet) process.stderr.write(`${c.gray}scanning ${root}...${c.reset}\n`);

  let manifest;
  try { manifest = scan(root); }
  catch (e) { console.error(`scan: ${e.message}`); return 1; }

  if (args.json) {
    process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
  }

  if (!args.dryRun) {
    const outPath = args.out ? path.resolve(args.out) : path.join(root, 'dragoon.json');
    try {
      fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      if (!args.quiet) process.stderr.write(`${c.green}✓${c.reset} wrote ${path.relative(process.cwd(), outPath)}\n`);
    } catch (e) {
      console.error(`scan: failed to write manifest: ${e.message}`);
      return 1;
    }
  }

  if (!args.quiet && !args.json) {
    process.stderr.write('\n');
    process.stderr.write(header('detected'));
    process.stderr.write(`stack:        ${manifest.stack.framework} + ${manifest.stack.styling.join(', ')}\n`);
    process.stderr.write(`language:     ${manifest.stack.language}\n`);
    process.stderr.write(`files:        ${manifest.metrics.files.scanned} scanned\n`);
    process.stderr.write(`components:   ~${manifest.metrics.components.estimated} (avg ${manifest.metrics.components.averageSizeLines} lines)\n`);
    process.stderr.write(`palette:      ${manifest.tokens.color.totalDistinct} distinct colors\n`);
    process.stderr.write(`grid:         ${manifest.tokens.spacing.inferredGrid ? `${manifest.tokens.spacing.inferredGrid}px (confidence ${manifest.tokens.spacing.gridConfidence})` : 'none detected'}\n`);
    process.stderr.write(`type scale:   ${manifest.tokens.type.inferredScaleRatio ? `${manifest.tokens.type.scaleName} ratio ${manifest.tokens.type.inferredScaleRatio}` : 'none detected'}\n`);
    process.stderr.write(`shadows:      ${manifest.tokens.shadow.values.length} variants\n`);
    process.stderr.write(`radii:        ${manifest.tokens.radius.values.length} variants\n`);
    process.stderr.write(`durationMs:   ${manifest.diagnostics.durationMs}\n`);
  }
  return 0;
}

process.exit(main());
