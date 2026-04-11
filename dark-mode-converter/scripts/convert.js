#!/usr/bin/env node
const fs = require('fs');

function hexToHSL(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0,2),16)/255;
  const g = parseInt(hex.substr(2,2),16)/255;
  const b = parseInt(hex.substr(4,2),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max===min) { h=s=0; } else {
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h=((g-b)/d+(g<b?6:0))/6; break;
      case g: h=((b-r)/d+2)/6; break;
      case b: h=((r-g)/d+4)/6; break;
    }
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
}

function hslToHex(h, s, l) {
  s/=100; l/=100;
  const a = s*Math.min(l,1-l);
  const f = n => { const k=(n+h/30)%12; return l-a*Math.max(Math.min(k-3,9-k,1),-1); };
  return '#' + [f(0),f(8),f(4)].map(x => Math.round(x*255).toString(16).padStart(2,'0')).join('');
}

function convertColor(hex, context) {
  const hsl = hexToHSL(hex);
  switch(context) {
    case 'background':
      // Light bg → dark bg: invert lightness, reduce saturation
      return hslToHex(hsl.h, Math.max(0, hsl.s - 10), Math.max(5, 100 - hsl.l));
    case 'text':
      // Dark text → light text (not pure white)
      if (hsl.l < 30) return '#F1F5F9'; // Primary dark text → slate-100
      if (hsl.l < 50) return '#94A3B8'; // Secondary → slate-400
      return hex; // Already light text
    case 'border':
      return hslToHex(hsl.h, Math.max(0, hsl.s - 20), 20);
    case 'brand':
      return hslToHex(hsl.h, Math.max(0, hsl.s - 15), Math.min(85, hsl.l + 15));
    default:
      return hslToHex(hsl.h, hsl.s, 100 - hsl.l);
  }
}

function convertCSS(content) {
  let dark = content;
  // Convert background colors
  dark = dark.replace(/(background(?:-color)?:\s*)#([0-9a-fA-F]{3,8})/g, (m, prop, hex) => {
    return prop + convertColor('#' + hex, 'background');
  });
  // Convert text colors
  dark = dark.replace(/((?:^|;|{)\s*color:\s*)#([0-9a-fA-F]{3,8})/g, (m, prop, hex) => {
    return prop + convertColor('#' + hex, 'text');
  });
  // Convert border colors
  dark = dark.replace(/(border(?:-color)?:[^;]*?)#([0-9a-fA-F]{3,8})/g, (m, prop, hex) => {
    return prop + convertColor('#' + hex, 'border');
  });
  // Remove box-shadows (use surface elevation in dark mode)
  dark = dark.replace(/box-shadow:[^;]+;/g, 'box-shadow: none; /* Use surface elevation in dark mode */');
  return dark;
}

const args = process.argv.slice(2);
if (args.length === 0) { console.log('Usage: node convert.js <input.css> [--output file] [--method media-query|data-attribute]'); process.exit(0); }

const input = fs.readFileSync(args[0], 'utf-8');
const method = args.includes('--method') ? args[args.indexOf('--method') + 1] : 'data-attribute';
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

const converted = convertCSS(input);
let wrapped;
if (method === 'media-query') {
  wrapped = `@media (prefers-color-scheme: dark) {\n${converted}\n}`;
} else {
  wrapped = `[data-theme="dark"] {\n${converted}\n}`;
}

if (outputFile) { fs.writeFileSync(outputFile, wrapped); console.log(`Dark mode CSS written to ${outputFile}`); }
else console.log(wrapped);
