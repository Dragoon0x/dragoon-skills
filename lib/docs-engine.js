'use strict';

// docs engine. scans markdown docs (README, docs/*.md, etc.) and checks
// for drift against the actual codebase:
//   - npm scripts mentioned in docs that don't exist in package.json
//   - npm scripts in package.json that aren't documented
//   - file paths mentioned in docs that don't exist
//   - dependency names mentioned that aren't in package.json
//
// returns a structured list of drift findings, each with file:line:column.

const fs = require('fs');
const path = require('path');
const { walk, readSafe } = require('./files');

function findMarkdownFiles(root) {
  const files = walk(root, { extensions: new Set(['.md', '.mdx']) });
  return files;
}

function readPackage(root) {
  const p = path.join(root, 'package.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return null; }
}

function locate(content, index) {
  let line = 1, col = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') { line++; col = 1; }
    else col++;
  }
  return { line, col };
}

function clipSnippet(s, max = 80) {
  const cleaned = s.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1) + '…' : cleaned;
}

function detectDrift(root) {
  const findings = [];
  const pkg = readPackage(root);
  const scripts = pkg && pkg.scripts ? Object.keys(pkg.scripts) : [];
  const deps = pkg ? new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]) : new Set();
  const docFiles = findMarkdownFiles(root);

  // collect all script invocations referenced in docs:
  // patterns like `npm run X`, `pnpm X`, `yarn X`, `bun X`
  const docScriptRefs = new Set();
  // collect documented dep names: `@scope/foo` or bare name in inline code
  const docDepRefs = new Set();
  // collect file paths referenced in docs (in backticks)
  const docPathRefs = []; // array of { ref, file, line, col }

  for (const docPath of docFiles) {
    const content = readSafe(docPath);
    if (!content) continue;
    const rel = path.relative(root, docPath);

    // npm scripts referenced
    const scriptRe = /\b(?:npm run|pnpm(?:\s+run)?|yarn(?:\s+run)?|bun(?:\s+run)?)\s+([a-z][a-z0-9:_-]*)\b/gi;
    let m;
    while ((m = scriptRe.exec(content)) !== null) {
      const script = m[1];
      docScriptRefs.add(script);
      if (scripts.length > 0 && !scripts.includes(script)) {
        const loc = locate(content, m.index);
        findings.push({
          rule: 'docs-001',
          ruleName: 'unknown-npm-script',
          severity: 'medium',
          file: rel,
          line: loc.line,
          column: loc.col,
          snippet: clipSnippet(m[0]),
          message: `Doc references npm script "${script}" but package.json has no such script.`,
          fix: `Either add the script to package.json or remove the reference from docs.`
        });
      }
    }

    // dep refs in backticks (only check known shapes to avoid false positives)
    const inlineCodeRe = /`(@?[a-z][a-z0-9._-]*(?:\/[a-z0-9._-]+)?)`/gi;
    while ((m = inlineCodeRe.exec(content)) !== null) {
      const ref = m[1];
      if (ref.includes('/') && ref.startsWith('@')) {
        // scoped package - high-confidence dep ref
        docDepRefs.add(ref);
        if (deps.size > 0 && !deps.has(ref)) {
          const loc = locate(content, m.index);
          findings.push({
            rule: 'docs-002',
            ruleName: 'unknown-dependency',
            severity: 'low',
            file: rel,
            line: loc.line,
            column: loc.col,
            snippet: ref,
            message: `Doc references "${ref}" but package.json does not list it.`,
            fix: `Either add the dependency or remove the reference.`
          });
        }
      }
    }

    // file paths in backticks: relative-looking, contains /, has a known extension
    const pathRe = /`((?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+\.(?:js|ts|jsx|tsx|mjs|cjs|css|scss|md|json|html|svelte|vue|astro))`/g;
    while ((m = pathRe.exec(content)) !== null) {
      const ref = m[1];
      if (ref.startsWith('http')) continue;
      if (ref.includes('://')) continue;
      const loc = locate(content, m.index);
      docPathRefs.push({ ref, file: rel, line: loc.line, col: loc.col });
    }
  }

  // resolve documented file paths
  for (const r of docPathRefs) {
    const abs = path.join(root, r.ref);
    // ignore paths that climb out of root
    if (!abs.startsWith(path.resolve(root))) continue;
    if (!fs.existsSync(abs)) {
      findings.push({
        rule: 'docs-003',
        ruleName: 'broken-path-reference',
        severity: 'medium',
        file: r.file,
        line: r.line,
        column: r.col,
        snippet: r.ref,
        message: `Doc references file "${r.ref}" but it doesn't exist on disk.`,
        fix: `Update the path or remove the reference.`
      });
    }
  }

  // undocumented npm scripts (not a finding per file - emit one summary)
  if (scripts.length > 0 && docFiles.length > 0) {
    const undocumented = scripts.filter(s => !docScriptRefs.has(s) && !s.startsWith('pre') && !s.startsWith('post'));
    if (undocumented.length > 0) {
      findings.push({
        rule: 'docs-004',
        ruleName: 'undocumented-scripts',
        severity: 'low',
        file: 'package.json',
        line: 1,
        column: 1,
        snippet: undocumented.slice(0, 6).join(', ') + (undocumented.length > 6 ? '…' : ''),
        message: `${undocumented.length} npm scripts in package.json aren't mentioned in any doc.`,
        fix: `Document them in README, or remove if unused.`
      });
    }
  }

  return {
    docFiles: docFiles.length,
    findings,
    summary: {
      brokenPaths: findings.filter(f => f.rule === 'docs-003').length,
      unknownScripts: findings.filter(f => f.rule === 'docs-001').length,
      unknownDeps: findings.filter(f => f.rule === 'docs-002').length,
      undocumentedScripts: findings.filter(f => f.rule === 'docs-004').length
    }
  };
}

module.exports = { detectDrift };
