#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { runShip, formatPrDescription } = require('../../../lib/ship-engine');
const { c, header } = require('../../../lib/output');

const HELP = `dragoon ship - pre-PR checks: critique threshold, slop scan, optional gh PR

USAGE
  dragoon ship [--threshold n] [--manifest p] [--title "..."] [--open] [--json]

FLAGS
  --threshold <n>  fail if /critique overall < n (default: 80)
  --manifest <p>   use a specific dragoon.json
  --title "..."    feature/PR title (used in PR description)
  --skip-critique  don't run /critique
  --skip-slop      don't run /slop
  --open           open a PR using \`gh pr create\` (requires gh CLI)
  --base <branch>  base branch for the PR (default: main)
  --json           machine-readable output
  --help, -h       this help

EXIT CODES
  0  all checks passed
  1  one or more checks failed
  2  bad usage

EXAMPLES
  dragoon ship                              # run all checks
  dragoon ship --threshold 85               # tighter design gate
  dragoon ship --title "add invites" --open # also open the PR
`;

function parseArgs(argv) {
  const args = {
    threshold: 80, manifest: null, title: null,
    skipCritique: false, skipSlop: false, open: false, base: 'main',
    json: false, help: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--threshold') args.threshold = parseInt(argv[++i], 10);
    else if (a === '--manifest') args.manifest = argv[++i];
    else if (a === '--title') args.title = argv[++i];
    else if (a === '--skip-critique') args.skipCritique = true;
    else if (a === '--skip-slop') args.skipSlop = true;
    else if (a === '--open') args.open = true;
    else if (a === '--base') args.base = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  }
  return args;
}

function statusSym(status) {
  if (status === 'ok') return `${c.green}✓${c.reset}`;
  if (status === 'fail') return `${c.red}✗${c.reset}`;
  return `${c.yellow}!${c.reset}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  const root = process.cwd();

  let result;
  try {
    result = runShip(root, {
      threshold: args.threshold,
      skipCritique: args.skipCritique,
      skipSlop: args.skipSlop,
      manifestPath: args.manifest
    });
  } catch (e) { console.error(`ship: ${e.message}`); return 1; }

  // build PR description regardless
  const prBody = formatPrDescription(result, args.title);

  // optionally open PR
  let prResult = null;
  if (args.open) {
    if (!result.passed) {
      prResult = { ok: false, reason: 'checks did not pass; pass --skip-critique/--skip-slop to override' };
    } else if (!result.ghAvailable) {
      prResult = { ok: false, reason: 'gh CLI not found; install from https://cli.github.com' };
    } else if (!args.title) {
      prResult = { ok: false, reason: '--title is required to open a PR' };
    } else if (!result.git || !result.git.branch) {
      prResult = { ok: false, reason: 'no git context' };
    } else {
      // sanitize title and base for shell safety: no shell special chars
      const safeTitle = args.title.replace(/[`$"'\\]/g, '');
      const safeBase = args.base.replace(/[^A-Za-z0-9._/-]/g, '');
      // write body to a temp file to avoid argv injection
      const bodyTmp = path.join(root, `.dragoon-pr-body-${process.pid}.md`);
      try {
        fs.writeFileSync(bodyTmp, prBody, 'utf8');
        execSync(`gh pr create --title "${safeTitle}" --body-file "${bodyTmp}" --base "${safeBase}"`, {
          cwd: root, stdio: 'inherit'
        });
        prResult = { ok: true };
      } catch (e) {
        prResult = { ok: false, reason: `gh pr create failed: ${e.message}` };
      } finally {
        try { fs.unlinkSync(bodyTmp); } catch (_e) { /* ignore */ }
      }
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      passed: result.passed,
      steps: result.steps,
      git: result.git || null,
      ghAvailable: result.ghAvailable,
      pr: prResult,
      prBody
    }, null, 2) + '\n');
    return result.passed ? 0 : 1;
  }

  process.stdout.write(header('dragoon ship'));
  for (const step of result.steps) {
    process.stdout.write(`${statusSym(step.status)} ${c.bold}${step.name}${c.reset}  ${c.gray}${step.detail}${c.reset}\n`);
    if (step.findings && step.findings.length > 0) {
      for (const f of step.findings.slice(0, 5)) {
        process.stdout.write(`    ${c.gray}${f.file}:${f.line}  ${f.ruleName}${c.reset}\n`);
      }
    }
  }
  process.stdout.write('\n');
  if (result.passed) {
    process.stdout.write(`${c.green}all checks passed.${c.reset}\n`);
  } else {
    process.stdout.write(`${c.red}one or more checks failed.${c.reset}\n`);
  }
  if (args.open && prResult) {
    if (prResult.ok) process.stdout.write(`${c.green}PR opened.${c.reset}\n`);
    else process.stdout.write(`${c.yellow}PR not opened: ${prResult.reason}${c.reset}\n`);
  } else if (!args.open) {
    process.stdout.write(`\n${c.gray}PR description preview (use --open with --title to actually create):${c.reset}\n`);
    process.stdout.write(`${c.dim}${prBody}${c.reset}\n`);
  }
  return result.passed ? 0 : 1;
}

process.exit(main());
