'use strict';

const fs = require('fs');
const path = require('path');
const { validIdentifier, toKebab } = require('./safe-paths');

// ---------- /forge ----------
// generate a new skill scaffold (SKILL.md, scripts/<name>.js, a placeholder
// engine module, and a test file). lands in a sandbox directory:
// .dragoon/forge/<name>/. user reviews and copies into their pack.

function generateSkillScaffold({ name, description }) {
  if (!validIdentifier(name)) throw new Error('forge: skill name must be a valid identifier (a-z, A-Z, 0-9, _)');
  const kebab = toKebab(name);

  return [
    {
      relPath: `.dragoon/forge/${kebab}/SKILL.md`,
      content: `---
name: ${kebab}
description: ${description || 'TODO: describe when this skill should be used.'}
version: 0.1.0
---

# /${kebab}

TODO: short tagline.

## When to use

- TODO

## Run it

\`\`\`
node ~/.claude/skills/dragoon/skills/${kebab}/scripts/${kebab}.js [args]
\`\`\`
`
    },
    {
      relPath: `.dragoon/forge/${kebab}/scripts/${kebab}.js`,
      content: `#!/usr/bin/env node
'use strict';

const HELP = \`dragoon ${kebab} - TODO: tagline

USAGE
  dragoon ${kebab} [args]

FLAGS
  --json       machine-readable
  --help, -h   this help
\`;

function parseArgs(argv) {
  const args = { _: [], json: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--')) { console.error(\`unknown flag: \${a}\`); process.exit(2); }
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }

  // TODO: implement
  if (args.json) { process.stdout.write(JSON.stringify({ ok: true }) + '\\n'); return 0; }
  console.log('TODO: implement ${kebab}');
  return 0;
}

process.exit(main());
`
    },
    {
      relPath: `.dragoon/forge/${kebab}/test/${kebab}.test.js`,
      content: `'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('${kebab}: placeholder', () => {
  assert.equal(1 + 1, 2);
});
`
    },
    {
      relPath: `.dragoon/forge/${kebab}/README.md`,
      content: `# forged skill: ${kebab}

This is a sandbox scaffold. To install into your dragoon pack:

\`\`\`
cp -r .dragoon/forge/${kebab} ~/.dragoon/skills/${kebab}
\`\`\`

Then:
1. Add an entry to bin/dragoon's COMMANDS map.
2. Implement the script.
3. Add tests.
4. Update README.
`
    }
  ];
}

// ---------- /sync ----------
// figma tokens format exporter. NOT a live figma sync (that needs an oauth
// flow). produces figma.tokens.json which can be imported by the figma
// "tokens studio" plugin or similar.

function generateFigmaTokens(manifest) {
  if (!manifest) throw new Error('sync: manifest required (run dragoon scan first)');
  const out = {
    $description: 'dragoon: design tokens exported in tokens-studio compatible format',
    $version: '1',
    color: {},
    spacing: {},
    radius: {},
    typography: {},
    shadow: {}
  };

  const palette = (manifest.tokens && manifest.tokens.color && manifest.tokens.color.palette) || [];
  for (const p of palette.slice(0, 16)) {
    const name = p.role && p.role !== 'unknown' ? p.role : `color-${Object.keys(out.color).length + 1}`;
    let key = name;
    let i = 1;
    while (key in out.color) { i++; key = `${name}-${i}`; }
    out.color[key] = { value: p.value, type: 'color' };
  }

  const grid = (manifest.rules && manifest.rules.spacingGrid) || 8;
  const labels = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  const mults = [0.5, 1, 2, 3, 4, 6, 8, 12];
  for (let i = 0; i < labels.length; i++) {
    out.spacing[labels[i]] = { value: `${grid * mults[i]}px`, type: 'spacing' };
  }

  const radii = (manifest.tokens && manifest.tokens.radius && manifest.tokens.radius.values) || [];
  const radiusLabels = ['sm', 'md', 'lg', 'xl', 'full'];
  for (let i = 0; i < Math.min(radii.length, radiusLabels.length); i++) {
    out.radius[radiusLabels[i]] = { value: `${radii[i].px}px`, type: 'borderRadius' };
  }

  const fontSizes = (manifest.tokens && manifest.tokens.type && manifest.tokens.type.fontSizes) || [];
  const family = (manifest.tokens && manifest.tokens.type && manifest.tokens.type.fontFamilies && manifest.tokens.type.fontFamilies[0] && manifest.tokens.type.fontFamilies[0].value) || 'Inter';
  out.typography.family = { value: family, type: 'fontFamilies' };
  const sortedSizes = [...fontSizes].sort((a, b) => a.px - b.px);
  for (let i = 0; i < Math.min(sortedSizes.length, 8); i++) {
    out.typography[`size-${i + 1}`] = { value: `${sortedSizes[i].px}px`, type: 'fontSizes' };
  }

  const shadows = (manifest.tokens && manifest.tokens.shadow && manifest.tokens.shadow.values) || [];
  for (let i = 0; i < Math.min(shadows.length, 5); i++) {
    out.shadow[`level-${i + 1}`] = { value: shadows[i].value, type: 'boxShadow' };
  }

  return JSON.stringify(out, null, 2);
}

// ---------- /tailwind ----------
// generates a single tailwind.config.js that combines color + spacing +
// typography + radius + motion tokens detected from manifest. one file
// instead of four separate token cjs files.

function generateTailwindConfig(manifest) {
  if (!manifest) throw new Error('tailwind: manifest required (run dragoon scan first)');
  const palette = (manifest.tokens && manifest.tokens.color && manifest.tokens.color.palette) || [];
  const radii = (manifest.tokens && manifest.tokens.radius && manifest.tokens.radius.values) || [];
  const family = (manifest.tokens && manifest.tokens.type && manifest.tokens.type.fontFamilies && manifest.tokens.type.fontFamilies[0] && manifest.tokens.type.fontFamilies[0].value) || 'Inter';
  const grid = (manifest.rules && manifest.rules.spacingGrid) || 8;

  const colors = {};
  let i = 0;
  for (const p of palette.slice(0, 8)) {
    const name = p.role && p.role !== 'unknown' ? p.role : `color-${++i}`;
    let key = name;
    let j = 1;
    while (key in colors) { j++; key = `${name}-${j}`; }
    colors[key] = p.value;
  }

  const spacing = {
    xs: `${grid * 0.5}px`, sm: `${grid}px`, md: `${grid * 2}px`, lg: `${grid * 3}px`,
    xl: `${grid * 4}px`, '2xl': `${grid * 6}px`, '3xl': `${grid * 8}px`, '4xl': `${grid * 12}px`
  };

  const ratio = (manifest.rules && manifest.rules.typeScaleRatio) || 1.25;
  const fontSize = {
    xs: `${(16 / Math.pow(ratio, 2)).toFixed(2)}px`,
    sm: `${(16 / ratio).toFixed(2)}px`,
    base: '16px',
    md: `${(16 * ratio).toFixed(2)}px`,
    lg: `${(16 * Math.pow(ratio, 2)).toFixed(2)}px`,
    xl: `${(16 * Math.pow(ratio, 3)).toFixed(2)}px`,
    '2xl': `${(16 * Math.pow(ratio, 4)).toFixed(2)}px`
  };

  const borderRadius = {};
  const radiusLabels = ['sm', 'md', 'lg', 'xl'];
  for (let k = 0; k < Math.min(radii.length, radiusLabels.length); k++) {
    borderRadius[radiusLabels[k]] = `${radii[k].px}px`;
  }

  return `// dragoon: unified tailwind config (color + spacing + type + radius + motion)
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,vue,svelte,astro,html}',
    './app/**/*.{js,ts,jsx,tsx,vue,svelte,astro,html}',
    './pages/**/*.{js,ts,jsx,tsx,vue,svelte,astro,html}',
    './components/**/*.{js,ts,jsx,tsx,vue,svelte,astro,html}'
  ],
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 6).replace(/\n/g, '\n      ')},
      spacing: ${JSON.stringify(spacing, null, 6).replace(/\n/g, '\n      ')},
      fontFamily: { sans: ['${family}', 'system-ui', 'sans-serif'] },
      fontSize: ${JSON.stringify(fontSize, null, 6).replace(/\n/g, '\n      ')},
      borderRadius: ${JSON.stringify(borderRadius, null, 6).replace(/\n/g, '\n      ')},
      transitionDuration: { fast: '150ms', normal: '250ms', slow: '400ms' },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        enter: 'cubic-bezier(0, 0, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)'
      }
    }
  },
  plugins: []
};
`;
}

// ---------- /careful ----------
// writes .dragoon/CAREFUL.md, a marker file that lists destructive commands
// the user wants to be reminded about. not a runtime guard - it's a
// mental-discipline tool that the agent is told to consult.

function generateCarefulList() {
  return `# careful list

> dragoon-managed list of destructive commands to think twice before running.
> agents reading this file should pause and confirm before invoking any of these.

## destructive commands to confirm before running

- \`rm -rf\` (any path)
- \`git push --force\` / \`git push -f\`
- \`git reset --hard\` (loses uncommitted work)
- \`git clean -fdx\` (removes ignored files too)
- \`npm publish\` (irreversible after 72h)
- \`docker volume rm\` / \`docker system prune\`
- database \`DROP\` / \`TRUNCATE\` (any table, any environment)
- production deploys without a tagged release
- secrets/keys committed (rotate immediately if it happens)

## destructive commands the agent should NEVER run without explicit user prompt

- anything to a path containing \`/etc\`, \`/usr\`, \`/var\` outside the project root
- anything starting with \`sudo\`
- anything that contacts \`production\` URLs without explicit user mention

## adding to this list

edit this file directly. dragoon does not auto-update it.
`;
}

// ---------- /freeze ----------
// writes .dragoon/freeze.json declaring directories that are off-limits
// for edits. the agent is expected to read this file before writing.
// dragoon also writes .dragoon/check-freeze.sh that you can wire into a
// git pre-commit hook to enforce.

function generateFreezeManifest({ paths }) {
  const safe = (paths || []).map(p => p.trim()).filter(Boolean).map(p => {
    // light validation: no traversal, no absolute paths
    const norm = path.posix.normalize(p);
    if (norm.startsWith('/') || norm.startsWith('..') || norm.includes('\0')) {
      throw new Error(`freeze: invalid path ${p}`);
    }
    return norm;
  });
  return JSON.stringify({
    version: '1.0',
    notes: 'dragoon-managed list of frozen directories. agents must not edit files inside.',
    paths: safe,
    updatedAt: new Date().toISOString()
  }, null, 2);
}

function generateFreezeHook() {
  return `#!/usr/bin/env bash
# dragoon: pre-commit hook that fails the commit if frozen paths were touched.
# install with: ln -s ../../.dragoon/check-freeze.sh .git/hooks/pre-commit
set -e
FREEZE_FILE=".dragoon/freeze.json"
[ -f "$FREEZE_FILE" ] || exit 0

# extract paths from the json, line by line, no jq dependency
paths=$(node -e '
  const fs = require("fs");
  const f = JSON.parse(fs.readFileSync(".dragoon/freeze.json", "utf8"));
  process.stdout.write((f.paths || []).join("\\n"));
')
[ -z "$paths" ] && exit 0

# check staged files
staged=$(git diff --cached --name-only)
[ -z "$staged" ] && exit 0

violations=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [[ "$f" == "$p"* ]]; then
      violations="$violations\\n  $f (frozen path: $p)"
    fi
  done <<< "$paths"
done <<< "$staged"

if [ -n "$violations" ]; then
  echo "dragoon freeze: refusing commit, frozen paths touched:" >&2
  printf "$violations\\n" >&2
  echo "" >&2
  echo "to override, edit .dragoon/freeze.json or commit with --no-verify." >&2
  exit 1
fi
`;
}

module.exports = {
  generateSkillScaffold,
  generateFigmaTokens,
  generateTailwindConfig,
  generateCarefulList,
  generateFreezeManifest,
  generateFreezeHook
};
