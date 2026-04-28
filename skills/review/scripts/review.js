#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { walk, readSafe, STYLE_EXTENSIONS, COMPONENT_EXTENSIONS } = require('../../../lib/files');
const { runRules } = require('../../../lib/slop-rules');
const { scan } = require('../../../lib/scan-engine');
const { critique, grade } = require('../../../lib/critique-engine');
const { c, header, fmtFinding, fmtFindingsSummary, fmtScores } = require('../../../lib/output');

const HELP = `dragoon review - unified code + design review

Runs slop detection, design critique, and engineering signals in one pass.
On any UI files in scope, /critique and /slop run automatically.

USAGE
  dragoon review [path] [--diff] [--manifest path] [--json] [--threshold n]

FLAGS
  --diff          review only files changed in git working tree
  --manifest <p>  path to dragoon.json. otherwise auto-detect or scan.
  --json          machine-readable output
  --threshold <n> exit non-zero if any high-severity findings, or score < n
  --no-design     skip the design critique (slop only)
  --no-slop       skip slop detection (critique only)
  --help, -h      show this help

EXIT CODES
  0  success / no high findings
  1  high findings present, or threshold not met
  2  bad usage

EXAMPLES
  dragoon review
  dragoon review --diff
  dragoon review src/Card.tsx --threshold 80
`;

function parseArgs(argv) {
  const args = { _: [], diff: false, manifest: null, json: false, threshold: null, noDesign: false, noSlop: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--diff') args.diff = true;
    else if (a === '--manifest') args.manifest = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--threshold') args.threshold = parseInt(argv[++i], 10);
    else if (a === '--no-design') args.noDesign = true;
    else if (a === '--no-slop') args.noSlop = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function gitChangedFiles(root) {
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').map(s => s.trim()).filter(Boolean).map(f => path.join(root, f)).filter(fs.existsSync);
  } catch (_e) {
    return [];
  }
}

function lightEngineeringChecks(file, content, ext, root) {
  const findings = [];
  const rel = path.relative(root || '.', file);
  const isScript = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext);
  if (isScript) {
    const lines = content.split('\n');
    // TODOs and FIXMEs
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/(TODO|FIXME|HACK|XXX)\b[:\s].{0,80}/);
      if (m) {
        findings.push({
          rule: 'eng-001', ruleName: 'todo-marker', severity: 'low',
          line: i + 1, column: 1,
          snippet: m[0].slice(0, 80),
          message: `Unresolved ${m[1]} marker.`,
          fix: `Resolve, or move to an issue tracker.`,
          file: rel
        });
      }
    }
    // any-typed in TS
    if (ext === '.ts' || ext === '.tsx') {
      const re = /:\s*any\b/g;
      let m;
      let count = 0;
      while ((m = re.exec(content)) !== null) {
        count++;
        if (count <= 3) {
          findings.push({
            rule: 'eng-002', ruleName: 'any-type', severity: 'low',
            line: lineOf(content, m.index), column: 1,
            snippet: ': any',
            message: `Use of \`any\` type.`,
            fix: `Tighten the type, or use \`unknown\` and narrow.`,
            file: rel
          });
        }
      }
    }
    // file size
    if (lines.length > 600) {
      findings.push({
        rule: 'eng-003', ruleName: 'large-file', severity: 'low',
        line: 1, column: 1, snippet: '',
        message: `${lines.length} lines in this file. Consider splitting.`,
        fix: `Extract logical sections into separate modules.`,
        file: rel
      });
    }
  }
  return findings;
}

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) if (content[i] === '\n') line++;
  return line;
}

function isUiFile(ext) {
  return STYLE_EXTENSIONS.has(ext) || COMPONENT_EXTENSIONS.has(ext) || ext === '.html' || ext === '.htm';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }

  const target = path.resolve(args._[0] || process.cwd());
  if (!fs.existsSync(target)) { console.error(`review: not found: ${target}`); return 2; }
  const root = fs.statSync(target).isDirectory() ? target : path.dirname(target);

  // resolve manifest
  let manifest = null;
  if (args.manifest) {
    try { manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8')); }
    catch (e) { console.error(`review: invalid manifest: ${e.message}`); return 2; }
  } else {
    const conventional = path.join(root, 'dragoon.json');
    if (fs.existsSync(conventional)) {
      try { manifest = JSON.parse(fs.readFileSync(conventional, 'utf8')); } catch (_e) { /* ignore */ }
    }
  }

  // resolve file list
  let files;
  if (args.diff) {
    files = gitChangedFiles(root);
    if (files.length === 0) {
      if (!args.json) process.stdout.write(`${c.gray}no changed files in git working tree${c.reset}\n`);
      return 0;
    }
  } else if (fs.statSync(target).isDirectory()) {
    files = walk(target);
  } else {
    files = [target];
  }

  // run rules + eng checks
  const findings = [];
  let uiFilesPresent = false;
  for (const file of files) {
    const content = readSafe(file);
    if (!content) continue;
    const ext = path.extname(file).toLowerCase();
    if (isUiFile(ext)) uiFilesPresent = true;
    const ctx = { file, ext, manifest, root, stack: manifest && manifest.stack };
    if (!args.noSlop) {
      findings.push(...runRules(content, ctx));
    }
    findings.push(...lightEngineeringChecks(file, content, ext, root));
  }

  // run critique if UI files present and design checks not skipped
  let critiqueResult = null;
  if (!args.noDesign && uiFilesPresent) {
    if (!manifest) {
      // synthesize a manifest from the in-scope files only.
      // simplest path: scan the root dir.
      try { manifest = scan(root); } catch (_e) { /* ok, skip critique */ }
    }
    if (manifest) critiqueResult = critique(manifest);
  }

  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;

  if (args.json) {
    process.stdout.write(JSON.stringify({
      target,
      filesScanned: files.length,
      manifestUsed: !!manifest,
      findings,
      critique: critiqueResult,
      summary: { high: highCount, medium: mediumCount, low: lowCount }
    }, null, 2) + '\n');
  } else {
    process.stdout.write(header(`dragoon review`));
    process.stdout.write(`${c.gray}${files.length} files reviewed${c.reset}\n\n`);

    if (critiqueResult) {
      process.stdout.write(`${c.bold}design critique${c.reset}\n`);
      process.stdout.write(fmtScores(critiqueResult.scores));
      process.stdout.write(`\n`);
    }

    process.stdout.write(`${c.bold}findings${c.reset}\n`);
    process.stdout.write(fmtFindingsSummary(findings));

    const byFile = new Map();
    for (const f of findings) {
      const key = f.file || '<unknown>';
      if (!byFile.has(key)) byFile.set(key, []);
      byFile.get(key).push(f);
    }
    for (const [, list] of byFile) {
      list.sort((a, b) => a.line - b.line);
      for (const f of list) process.stdout.write(fmtFinding(f));
    }
  }

  // exit code logic
  if (args.threshold !== null) {
    if (highCount > 0) return 1;
    if (critiqueResult && critiqueResult.scores.overall < args.threshold) return 1;
  }
  if (highCount > 0) return 1;
  return 0;
}

process.exit(main());
