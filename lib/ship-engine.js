'use strict';

// ship engine. orchestrates the pre-PR checklist:
//   1. /scan if no manifest (fresh fingerprint)
//   2. /critique threshold check
//   3. /slop --severity high check
//   4. optional: detect git changes, format a PR description
//   5. optional: open PR via `gh` CLI if available
//
// it does NOT directly invoke git or gh. it returns a structured plan and
// (in apply mode) executes a small set of well-defined commands. the user
// keeps control of every push.

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { scan } = require('./scan-engine');
const { critique, grade } = require('./critique-engine');
const { walk, readSafe } = require('./files');
const { runRules } = require('./slop-rules');

function tryExec(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts });
    return { ok: true, stdout: out };
  } catch (e) {
    return { ok: false, stderr: e && e.stderr ? String(e.stderr) : String(e && e.message) };
  }
}

function detectGit(root) {
  if (!fs.existsSync(path.join(root, '.git'))) return null;
  const branch = tryExec('git rev-parse --abbrev-ref HEAD', { cwd: root });
  const changed = tryExec('git diff --name-only HEAD', { cwd: root });
  const stagedChanged = tryExec('git diff --name-only --cached', { cwd: root });
  const remote = tryExec('git remote get-url origin', { cwd: root });
  return {
    branch: branch.ok ? branch.stdout.trim() : null,
    changedFiles: changed.ok ? changed.stdout.split('\n').map(s => s.trim()).filter(Boolean) : [],
    stagedFiles: stagedChanged.ok ? stagedChanged.stdout.split('\n').map(s => s.trim()).filter(Boolean) : [],
    remote: remote.ok ? remote.stdout.trim() : null
  };
}

function ghAvailable() {
  return tryExec('gh --version').ok;
}

function runShip(root, options = {}) {
  const opts = {
    threshold: options.threshold !== undefined ? options.threshold : 80,
    skipCritique: !!options.skipCritique,
    skipSlop: !!options.skipSlop,
    manifestPath: options.manifestPath || null
  };
  const result = { steps: [], passed: true };

  // step 1: manifest
  let manifest = null;
  const mp = opts.manifestPath || path.join(root, 'dragoon.json');
  if (fs.existsSync(mp)) {
    try { manifest = JSON.parse(fs.readFileSync(mp, 'utf8')); }
    catch (e) { /* fall through */ }
  }
  if (!manifest) {
    try { manifest = scan(root); result.steps.push({ name: 'scan', status: 'ok', detail: 'no manifest, generated fresh' }); }
    catch (e) { result.steps.push({ name: 'scan', status: 'error', detail: e.message }); result.passed = false; return result; }
  } else {
    result.steps.push({ name: 'manifest', status: 'ok', detail: 'loaded existing dragoon.json' });
  }

  // step 2: critique
  let critiqueResult = null;
  if (!opts.skipCritique) {
    try {
      critiqueResult = critique(manifest);
      const overall = critiqueResult.scores.overall;
      const ok = overall >= opts.threshold;
      result.steps.push({
        name: 'critique',
        status: ok ? 'ok' : 'fail',
        detail: `${overall}/100 (grade ${grade(overall)}, threshold ${opts.threshold})`,
        scores: critiqueResult.scores
      });
      if (!ok) result.passed = false;
    } catch (e) {
      result.steps.push({ name: 'critique', status: 'error', detail: e.message });
      result.passed = false;
    }
  }

  // step 3: slop high-severity scan
  let highFindings = [];
  if (!opts.skipSlop) {
    const files = walk(root);
    for (const file of files) {
      const content = readSafe(file);
      if (!content) continue;
      const ext = path.extname(file).toLowerCase();
      const ctx = { file, ext, manifest, root, stack: manifest && manifest.stack };
      const findings = runRules(content, ctx);
      for (const f of findings) {
        if (f.severity === 'high') highFindings.push(f);
      }
    }
    const ok = highFindings.length === 0;
    result.steps.push({
      name: 'slop',
      status: ok ? 'ok' : 'fail',
      detail: `${highFindings.length} high-severity findings`,
      findings: highFindings.slice(0, 10)
    });
    if (!ok) result.passed = false;
  }

  // step 4: git context
  const git = detectGit(root);
  if (git) {
    result.steps.push({
      name: 'git',
      status: 'ok',
      detail: `branch ${git.branch}, ${git.changedFiles.length} changed, ${git.stagedFiles.length} staged`
    });
    result.git = git;
  }

  // step 5: gh availability
  result.ghAvailable = ghAvailable();
  result.critique = critiqueResult;
  return result;
}

// build a markdown PR description from the run results.
function formatPrDescription(result, idea) {
  const lines = [];
  if (idea) lines.push(`## ${idea}`, '');
  if (result.critique) {
    const s = result.critique.scores;
    lines.push(`### dragoon checks`);
    lines.push('');
    lines.push(`- design score: **${s.overall}/100** (grade ${grade(s.overall)})`);
    lines.push(`- typography ${s.typography} | color ${s.color} | spacing ${s.spacing} | motion ${s.motion} | a11y ${s.accessibility} | consistency ${s.consistency}`);
    lines.push('');
  }
  const slop = result.steps.find(s => s.name === 'slop');
  if (slop) {
    lines.push(`### slop scan`);
    lines.push('');
    if ((slop.findings || []).length === 0) {
      lines.push('- no high-severity findings');
    } else {
      lines.push(`- ${slop.findings.length} high-severity findings`);
      for (const f of slop.findings.slice(0, 5)) {
        lines.push(`  - \`${f.file}:${f.line}\` ${f.ruleName}`);
      }
    }
    lines.push('');
  }
  if (result.git && result.git.changedFiles.length > 0) {
    lines.push(`### changed files`);
    lines.push('');
    for (const f of result.git.changedFiles.slice(0, 20)) lines.push(`- \`${f}\``);
    if (result.git.changedFiles.length > 20) lines.push(`- ... and ${result.git.changedFiles.length - 20} more`);
    lines.push('');
  }
  lines.push(`---`);
  lines.push(`generated by dragoon ship`);
  return lines.join('\n');
}

module.exports = { runShip, formatPrDescription, detectGit, ghAvailable };
