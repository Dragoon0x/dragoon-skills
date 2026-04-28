'use strict';

// qa engine. scaffolds a playwright (or vitest) test suite for the project.
// dragoon does NOT install browsers or run tests itself. it writes the files
// and prints the next commands. the user runs them.

const path = require('path');

function generatePlaywrightConfig({ stack }) {
  const baseURL = stack && stack.framework === 'next' ? 'http://localhost:3000'
    : stack && stack.framework === 'sveltekit' ? 'http://localhost:5173'
    : 'http://localhost:5173';
  return `// dragoon: playwright config
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || '${baseURL}',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } }
  ]
});
`;
}

function generateSmokeTest() {
  return `// dragoon: smoke e2e test
// requirements: \`npm i -D @playwright/test\` and \`npx playwright install\`
import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });

  test('main heading visible', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1, [role="heading"][aria-level="1"]').first();
    await expect(h1).toBeVisible({ timeout: 5000 });
  });

  test('no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors, 'page produced console errors').toEqual([]);
  });

  test('no broken images', async ({ page }) => {
    await page.goto('/');
    const broken = await page.evaluate(() => {
      const imgs = Array.from(document.images);
      return imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src);
    });
    expect(broken, 'broken images on page').toEqual([]);
  });
});
`;
}

function generateRunnerScript() {
  return `#!/usr/bin/env bash
# dragoon: qa runner. install deps and run playwright.
set -e
echo "checking playwright..."
if ! npx --no-install playwright --version >/dev/null 2>&1; then
  echo "installing @playwright/test..."
  npm i -D @playwright/test
fi
if [ ! -d node_modules/playwright/.local-browsers ] && [ ! -d ~/Library/Caches/ms-playwright ]; then
  echo "installing browsers..."
  npx playwright install --with-deps chromium
fi
npx playwright test "$@"
`;
}

function generateQaScaffold({ stack }) {
  return [
    { relPath: 'playwright.config.ts', content: generatePlaywrightConfig({ stack }) },
    { relPath: 'tests/e2e/smoke.spec.ts', content: generateSmokeTest() },
    { relPath: 'tests/e2e/run.sh', content: generateRunnerScript(), mode: 0o755 }
  ];
}

module.exports = { generateQaScaffold, generatePlaywrightConfig, generateSmokeTest, generateRunnerScript };
