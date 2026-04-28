'use strict';

// diff engine. scaffolds a playwright snapshot test suite that captures
// per-route screenshots and uses playwright's built-in toMatchSnapshot.
// dragoon does NOT do pixel diffing in pure node - that requires native deps.
// playwright handles the diff; dragoon ensures the harness is set up right
// and provides a small route discovery helper.

function generateSnapshotConfig() {
  return `// dragoon: snapshot test config
// pairs with tests/visual/snapshots.spec.ts
// run with: npx playwright test tests/visual --update-snapshots (first time)
//          npx playwright test tests/visual                    (regression)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.2 }
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } }
  ]
});
`;
}

function generateRoutesConfig(routes) {
  // routes is a list of strings or { path, name } objects
  const list = (routes && routes.length > 0) ? routes : [
    { path: '/', name: 'home' }
  ];
  return `// dragoon: routes to snapshot
// add routes to this file as your app grows.
export const routes = ${JSON.stringify(list, null, 2)};
`;
}

function generateSnapshotsSpec() {
  return `// dragoon: visual regression spec
import { test, expect } from '@playwright/test';
import { routes } from './routes';

for (const route of routes) {
  const name = typeof route === 'string' ? route.replace(/\\W+/g, '-') : route.name;
  const url = typeof route === 'string' ? route : route.path;
  test('snapshot: ' + name, async ({ page }) => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    // pause a tick to let any reduced-motion-aware animations settle
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot(name + '.png', { fullPage: true });
  });
}
`;
}

function generateDiffScaffold({ routes }) {
  return [
    { relPath: 'playwright.visual.config.ts', content: generateSnapshotConfig() },
    { relPath: 'tests/visual/routes.ts', content: generateRoutesConfig(routes) },
    { relPath: 'tests/visual/snapshots.spec.ts', content: generateSnapshotsSpec() }
  ];
}

module.exports = { generateDiffScaffold, generateSnapshotConfig, generateRoutesConfig, generateSnapshotsSpec };
