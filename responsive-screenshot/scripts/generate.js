#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'mobile-lg', width: 414, height: 896 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'desktop-lg', width: 1440, height: 900 },
  { name: 'desktop-xl', width: 1920, height: 1080 },
];

const url = process.argv[2];
const outDir = process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output') + 1] : './screenshots';

if (!url) { console.log('Usage: node screenshot.js <url> [--output dir]'); process.exit(0); }

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log(`\nCapturing ${url} at ${VIEWPORTS.length} viewports...\n`);

VIEWPORTS.forEach(vp => {
  const file = `${outDir}/${vp.name}-${vp.width}x${vp.height}.png`;
  try {
    execSync(`npx playwright screenshot "${url}" "${file}" --viewport-size=${vp.width},${vp.height} --full-page`, { stdio: 'pipe' });
    console.log(`  ✓ ${vp.name} (${vp.width}x${vp.height})`);
  } catch (e) {
    console.log(`  ✗ ${vp.name}: ${e.message.split('\n')[0]}`);
  }
});
console.log(`\nScreenshots saved to ${outDir}/`);
