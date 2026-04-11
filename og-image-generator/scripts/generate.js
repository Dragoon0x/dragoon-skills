#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const title = args[0] || 'Hello World';
const subtitle = args.includes('--subtitle') ? args[args.indexOf('--subtitle') + 1] : '';
const bg = args.includes('--bg') ? args[args.indexOf('--bg') + 1] : '#0F172A';
const accent = args.includes('--accent') ? args[args.indexOf('--accent') + 1] : '#3B82F6';
const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'og-image.html';

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; display: flex; align-items: center; justify-content: center;
  background: ${bg}; font-family: 'Inter', sans-serif; color: white; padding: 80px; }
.container { display: flex; flex-direction: column; gap: 20px; max-width: 900px; }
h1 { font-size: 56px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; }
p { font-size: 24px; font-weight: 400; opacity: 0.7; line-height: 1.4; }
.accent { width: 64px; height: 4px; background: ${accent}; border-radius: 2px; }
</style></head><body>
<div class="container">
  <div class="accent"></div>
  <h1>${title}</h1>
  ${subtitle ? `<p>${subtitle}</p>` : ''}
</div>
</body></html>`;

fs.writeFileSync(output, html);
console.log(`OG image HTML written to ${output}`);
console.log('Screenshot with: npx playwright screenshot ' + output + ' og-image.png --viewport-size=1200,630');
