'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_IGNORE = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit',
  'out', 'coverage', '.turbo', '.cache', '.parcel-cache', '.vercel',
  '.netlify', '__pycache__', '.venv', 'venv', 'target', 'vendor',
  '.idea', '.vscode', '.DS_Store'
]);

const UI_EXTENSIONS = new Set([
  '.css', '.scss', '.sass', '.less', '.styl',
  '.jsx', '.tsx', '.js', '.ts', '.mjs', '.cjs',
  '.vue', '.svelte', '.astro', '.html', '.htm'
]);

const STYLE_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less', '.styl']);
const COMPONENT_EXTENSIONS = new Set(['.jsx', '.tsx', '.vue', '.svelte', '.astro']);
const SCRIPT_EXTENSIONS = new Set(['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx']);

function loadGitignore(root) {
  const patterns = new Set(DEFAULT_IGNORE);
  const gitignorePath = path.join(root, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return patterns;
  try {
    const txt = fs.readFileSync(gitignorePath, 'utf8');
    txt.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      // crude but effective: take the leaf name of any directory-style pattern
      const cleaned = trimmed.replace(/^\/+/, '').replace(/\/+$/, '').split('/').pop();
      if (cleaned && !cleaned.includes('*')) patterns.add(cleaned);
    });
  } catch (_e) { /* fall through to defaults */ }
  return patterns;
}

function walk(root, options = {}) {
  const opts = {
    extensions: options.extensions || UI_EXTENSIONS,
    maxFiles: options.maxFiles || 5000,
    maxDepth: options.maxDepth || 12,
    ignore: options.ignore || loadGitignore(root)
  };
  const results = [];
  const visit = (dir, depth) => {
    if (depth > opts.maxDepth) return;
    if (results.length >= opts.maxFiles) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (_e) { return; }
    for (const entry of entries) {
      if (results.length >= opts.maxFiles) return;
      if (entry.name.startsWith('.') && entry.name !== '.') {
        // allow dotfiles like .eslintrc but skip dot-directories like .git
        if (entry.isDirectory()) continue;
      }
      if (opts.ignore.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (opts.extensions.has(ext)) {
          results.push(full);
        }
      }
    }
  };
  visit(root, 0);
  return results;
}

function categorize(files) {
  const out = { style: [], component: [], script: [], html: [], all: files };
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (STYLE_EXTENSIONS.has(ext)) out.style.push(f);
    else if (COMPONENT_EXTENSIONS.has(ext)) out.component.push(f);
    else if (ext === '.html' || ext === '.htm') out.html.push(f);
    else if (SCRIPT_EXTENSIONS.has(ext)) out.script.push(f);
  }
  return out;
}

function readSafe(file) {
  try {
    const stat = fs.statSync(file);
    if (stat.size > 2 * 1024 * 1024) return ''; // skip files >2MB
    return fs.readFileSync(file, 'utf8');
  } catch (_e) { return ''; }
}

module.exports = {
  walk,
  categorize,
  readSafe,
  loadGitignore,
  UI_EXTENSIONS,
  STYLE_EXTENSIONS,
  COMPONENT_EXTENSIONS,
  SCRIPT_EXTENSIONS
};
