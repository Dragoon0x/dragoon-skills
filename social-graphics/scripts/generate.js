#!/usr/bin/env node
const fs = require('fs');
const TEMPLATES = {
  'instagram-post': { w: 1080, h: 1080 },
  'instagram-story': { w: 1080, h: 1920 },
  'twitter-post': { w: 1200, h: 675 },
  'linkedin-post': { w: 1200, h: 627 },
  'youtube-thumbnail': { w: 1280, h: 720 },
};

const args = process.argv.slice(2);
const template = args[0] || 'twitter-post';
const title = args[1] || 'Your Title Here';
const bg = args.includes('--bg') ? args[args.indexOf('--bg') + 1] : '#0F172A';
const accent = args.includes('--accent') ? args[args.indexOf('--accent') + 1] : '#3B82F6';
const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : `${template}.html`;

const dims = TEMPLATES[template] || TEMPLATES['twitter-post'];

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;900&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:${dims.w}px; height:${dims.h}px; background:${bg}; color:white;
  font-family:'Inter',sans-serif; display:flex; align-items:center; justify-content:center; padding:10%; }
h1 { font-size:${Math.round(dims.w/14)}px; font-weight:900; line-height:1.1; letter-spacing:-0.03em; }
.accent { position:absolute; top:0; left:0; width:100%; height:6px; background:${accent}; }
</style></head><body>
<div class="accent"></div>
<h1>${title}</h1>
</body></html>`;

fs.writeFileSync(output, html);
console.log(`Template: ${template} (${dims.w}x${dims.h})`);
console.log(`Written to: ${output}`);
console.log(`Screenshot: npx playwright screenshot ${output} ${template}.png --viewport-size=${dims.w},${dims.h}`);
