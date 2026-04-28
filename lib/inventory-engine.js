'use strict';

// inventory engine. catalogs the codebase: components, pages/routes, hooks,
// existing token files, story files. uses heuristics on file paths and exports.
// no AST.

const fs = require('fs');
const path = require('path');
const { walk, readSafe } = require('./files');

function inventory(root) {
  const allExt = new Set(['.jsx', '.tsx', '.vue', '.svelte', '.astro', '.ts', '.js', '.mjs', '.cjs', '.css', '.scss']);
  const files = walk(root, { extensions: allExt });

  const components = [];
  const hooks = [];
  const pages = [];
  const stories = [];
  const tokens = [];

  for (const file of files) {
    const rel = path.relative(root, file);
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);

    // pages: any file under app/ pages/ routes/ src/pages
    if (/(^|\/)(app|pages|routes|src\/(pages|app|routes))(\/|$)/.test(rel)) {
      pages.push({ rel, name: base });
      continue;
    }

    // stories: *.stories.* / *.story.*
    if (/\.(stories|story)\.(jsx|tsx|js|ts|svelte|vue|mdx)$/.test(rel)) {
      stories.push({ rel });
      continue;
    }

    // token files
    if (/tokens?\.(css|scss|js|ts|cjs|mjs|json)$/.test(rel) || /\/tokens?\//.test(rel)) {
      tokens.push({ rel });
      continue;
    }

    // components: PascalCase basename + a UI extension
    if (['.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext) && /^[A-Z][A-Za-z0-9]*$/.test(base)) {
      const content = readSafe(file);
      const lines = content ? content.split('\n').length : 0;
      components.push({ rel, name: base, lines });
      continue;
    }

    // hooks: useFoo.{ts,tsx,js,jsx}
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext) && /^use[A-Z]/.test(base)) {
      hooks.push({ rel, name: base });
      continue;
    }
  }

  components.sort((a, b) => a.name.localeCompare(b.name));
  hooks.sort((a, b) => a.name.localeCompare(b.name));
  pages.sort((a, b) => a.rel.localeCompare(b.rel));
  stories.sort((a, b) => a.rel.localeCompare(b.rel));
  tokens.sort((a, b) => a.rel.localeCompare(b.rel));

  return {
    summary: {
      components: components.length,
      hooks: hooks.length,
      pages: pages.length,
      stories: stories.length,
      tokens: tokens.length
    },
    components, hooks, pages, stories, tokens
  };
}

module.exports = { inventory };
