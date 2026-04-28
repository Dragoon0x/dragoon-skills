'use strict';

// map engine. produces an architecture overview from static source analysis.
// no AST, just regex on imports + heuristic dependency graph + size stats.
// outputs structured data; the cli renders it as text or JSON.

const fs = require('fs');
const path = require('path');
const { walk, readSafe, SCRIPT_EXTENSIONS, COMPONENT_EXTENSIONS } = require('./files');

const IMPORT_RE = /(?:^|\n)\s*(?:import\s+(?:[^'"]*?\sfrom\s+)?|export\s+[^'"]*?\s+from\s+|(?:const|let|var)\s+[\w{},\s*]+\s*=\s*require\s*\()\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function isLocalImport(spec) {
  return spec.startsWith('.') || spec.startsWith('/');
}

function buildMap(root, options = {}) {
  const maxFiles = options.maxFiles || 5000;
  const allExt = new Set([...SCRIPT_EXTENSIONS, ...COMPONENT_EXTENSIONS, '.css', '.scss', '.sass']);
  const files = walk(root, { extensions: allExt, maxFiles });

  const fileStats = []; // { rel, lines, bytes, imports: [rel|null], importedBy: [rel] }
  const byRel = new Map();

  for (const file of files) {
    const rel = path.relative(root, file);
    let stat;
    try { stat = fs.statSync(file); } catch (_e) { continue; }
    const content = readSafe(file);
    const lines = content ? content.split('\n').length : 0;
    const node = { rel, lines, bytes: stat.size, imports: [], importedBy: [] };
    fileStats.push(node);
    byRel.set(rel, node);
  }

  // resolve imports to local files where possible
  const tryExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  for (const node of fileStats) {
    const abs = path.join(root, node.rel);
    const dir = path.dirname(abs);
    const content = readSafe(abs);
    if (!content) continue;
    const seen = new Set();
    const collect = (re) => {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(content)) !== null) {
        const spec = m[1];
        if (seen.has(spec)) continue;
        seen.add(spec);
        if (!isLocalImport(spec)) {
          node.imports.push({ spec, resolved: null, external: true });
          continue;
        }
        // try to resolve
        let resolved = null;
        for (const ext of tryExtensions) {
          const candidate = path.resolve(dir, spec + ext);
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            resolved = path.relative(root, candidate);
            break;
          }
        }
        node.imports.push({ spec, resolved, external: false });
        if (resolved && byRel.has(resolved)) {
          byRel.get(resolved).importedBy.push(node.rel);
        }
      }
    };
    collect(IMPORT_RE);
    collect(DYNAMIC_IMPORT_RE);
  }

  // sort hot files (most imported)
  const hot = [...fileStats].sort((a, b) => b.importedBy.length - a.importedBy.length).slice(0, 10);
  // largest files
  const large = [...fileStats].sort((a, b) => b.lines - a.lines).slice(0, 10);
  // orphans: files imported by nobody (and not entry-like)
  const ENTRYISH = /\b(index|main|app|page|layout|server|client|root|entry|setup|config)\b/i;
  const orphans = fileStats.filter(f =>
    f.importedBy.length === 0 && !ENTRYISH.test(path.basename(f.rel)) && /\.(jsx?|tsx?|mjs|cjs)$/i.test(f.rel)
  ).slice(0, 20);

  // external dependency frequency
  const externalCounts = new Map();
  for (const node of fileStats) {
    for (const imp of node.imports) {
      if (imp.external) {
        // strip subpath: "@scope/x/sub" -> "@scope/x", "react/jsx-runtime" -> "react"
        const top = imp.spec.startsWith('@')
          ? imp.spec.split('/').slice(0, 2).join('/')
          : imp.spec.split('/')[0];
        externalCounts.set(top, (externalCounts.get(top) || 0) + 1);
      }
    }
  }
  const externals = [...externalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  return {
    totals: {
      files: fileStats.length,
      lines: fileStats.reduce((s, f) => s + f.lines, 0),
      bytes: fileStats.reduce((s, f) => s + f.bytes, 0)
    },
    hot: hot.map(h => ({ rel: h.rel, importedBy: h.importedBy.length, lines: h.lines })),
    large: large.map(h => ({ rel: h.rel, lines: h.lines, bytes: h.bytes })),
    orphans: orphans.map(h => ({ rel: h.rel, lines: h.lines })),
    externals
  };
}

module.exports = { buildMap };
