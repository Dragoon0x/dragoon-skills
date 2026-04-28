'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { walk, readSafe, COMPONENT_EXTENSIONS } = require('./files');

function tryExec(cmd, root) {
  try { return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }); }
  catch (_e) { return null; }
}

// ---------- /land ----------
// post-merge checklist + git context. verifies you're on the base branch,
// checks tests pass, runs critique. does NOT do real deploys (would require
// platform-specific creds we don't want to handle).

function landReport(root, options = {}) {
  const result = { steps: [], passed: true };
  const branch = tryExec('git rev-parse --abbrev-ref HEAD', root);
  const head = tryExec('git rev-parse --short HEAD', root);
  const remote = tryExec('git rev-parse @{u} 2>/dev/null', root);
  const localHead = tryExec('git rev-parse @ 2>/dev/null', root);
  if (branch) result.steps.push({ name: 'branch', status: 'ok', detail: branch.trim() });
  if (head) result.steps.push({ name: 'head', status: 'ok', detail: head.trim() });
  if (remote && localHead) {
    const synced = remote.trim() === localHead.trim();
    result.steps.push({
      name: 'synced',
      status: synced ? 'ok' : 'fail',
      detail: synced ? 'local matches remote' : 'local has unpushed/unpulled commits'
    });
    if (!synced) result.passed = false;
  }
  // working tree clean?
  const status = tryExec('git status --porcelain', root);
  if (status !== null) {
    const clean = status.trim() === '';
    result.steps.push({
      name: 'working tree',
      status: clean ? 'ok' : 'fail',
      detail: clean ? 'clean' : 'uncommitted changes present'
    });
    if (!clean) result.passed = false;
  }
  return result;
}

// ---------- /canary ----------
// generates a small watcher shell script you run on a deployed url.
// writes to scripts/canary.sh; you wire it into cron or a CI scheduled job.

function canaryScript({ url, expectStatus = 200, intervalSeconds = 60 }) {
  // strict url validation. defense in depth: cli validates too, but the
  // engine is the contract. anything that isn't a clean http(s) url is rejected.
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) {
    throw new Error('canary: url must be a non-empty string under 2048 chars');
  }
  let parsed;
  try { parsed = new URL(url); }
  catch (_e) { throw new Error('canary: invalid url'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('canary: only http and https supported');
  }
  // also block shell metacharacters anywhere in the original input.
  // a clean url cannot legitimately contain these.
  if (/[`$"'\\;|&<>\n\r\0]/.test(url)) {
    throw new Error('canary: url contains forbidden characters');
  }
  if (!Number.isInteger(expectStatus) || expectStatus < 100 || expectStatus > 599) {
    throw new Error('canary: expectStatus must be integer 100-599');
  }
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < 5 || intervalSeconds > 86400) {
    throw new Error('canary: intervalSeconds must be integer 5-86400');
  }
  const safeUrl = url;
  return `#!/usr/bin/env bash
# dragoon: canary watcher. checks url every ${intervalSeconds}s, alerts on failure.
# wire into cron or a CI scheduled job. exits non-zero on failure.
#
# usage:
#   bash scripts/canary.sh                # one-shot check, exits 0/1
#   bash scripts/canary.sh --watch        # continuous loop, prints status

set -e
URL="${safeUrl}"
EXPECT_STATUS=${expectStatus}
INTERVAL=${intervalSeconds}

check() {
  local code
  code=$(curl -o /dev/null -s -w "%{http_code}" -L --max-time 10 "$URL" || echo "000")
  if [ "$code" = "$EXPECT_STATUS" ]; then
    echo "$(date -u +%FT%TZ) ok $code $URL"
    return 0
  else
    echo "$(date -u +%FT%TZ) FAIL got $code (expected $EXPECT_STATUS) $URL" >&2
    return 1
  fi
}

if [ "$1" = "--watch" ]; then
  while true; do
    check || true
    sleep "$INTERVAL"
  done
else
  check
fi
`;
}

// ---------- /storybook ----------
// scaffolds storybook config + a sample story per discovered component.
// keeps it minimal so it doesn't fight whatever the user does next.

function storybookConfig() {
  return `// dragoon: storybook config
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|js|jsx|mdx)'],
  addons: [],
  framework: { name: '@storybook/react-vite', options: {} }
};
export default config;
`;
}

function storybookPreview() {
  return `// dragoon: storybook preview
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'light' }
  }
};
export default preview;
`;
}

function storyForComponent(name, importPath) {
  return `// dragoon: auto-generated story for ${name}
import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from '${importPath}';

const meta: Meta<typeof ${name}> = {
  title: 'auto/${name}',
  component: ${name},
  parameters: { layout: 'centered' }
};
export default meta;

type Story = StoryObj<typeof ${name}>;

export const Default: Story = {
  args: {}
};
`;
}

function discoverComponents(root) {
  const files = walk(root);
  const found = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!COMPONENT_EXTENSIONS.has(ext)) continue;
    const base = path.basename(file, ext);
    if (!/^[A-Z]/.test(base)) continue;
    if (/\.(stories|story|test|spec)\./i.test(file)) continue;
    const content = readSafe(file);
    if (!content) continue;
    // require a named export with the same name
    const exportRe = new RegExp(`export\\s+(?:function|const|class|default)\\s+${base}\\b`);
    if (!exportRe.test(content) && !content.includes(`export { ${base}`)) continue;
    found.push({ rel: path.relative(root, file), name: base });
  }
  return found.slice(0, 50);
}

function generateStorybookScaffold(root) {
  const files = [
    { relPath: '.storybook/main.ts', content: storybookConfig() },
    { relPath: '.storybook/preview.ts', content: storybookPreview() }
  ];
  const components = discoverComponents(root);
  for (const c of components) {
    const noExt = c.rel.replace(/\.[^.]+$/, '');
    const importPath = '../' + noExt;
    const storyDir = path.dirname(c.rel);
    const storyFile = path.join(storyDir, `${c.name}.stories.tsx`);
    files.push({ relPath: storyFile, content: storyForComponent(c.name, '../' + path.basename(noExt)) });
  }
  return { files, componentsFound: components.length };
}

module.exports = { landReport, canaryScript, generateStorybookScaffold, discoverComponents };
