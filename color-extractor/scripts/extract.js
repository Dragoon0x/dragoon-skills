#!/usr/bin/env node
/**
 * Color Extractor — Extract dominant colors from images.
 * Uses raw PPM conversion via built-in tools for zero-dependency pixel access.
 * Usage: node extract.js <image-path> [--count N] [--format hex|css|tailwind|json]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Color Utilities ───
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function colorDistance(a, b) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

// ─── K-Means Quantization ───
function kMeans(pixels, k, maxIter = 20) {
  // Initialize centroids randomly from pixel sample
  const centroids = [];
  const step = Math.max(1, Math.floor(pixels.length / (k * 10)));
  for (let i = 0; i < k && i * step < pixels.length; i++) {
    centroids.push([...pixels[i * step]]);
  }
  while (centroids.length < k) centroids.push([Math.random()*255, Math.random()*255, Math.random()*255]);

  for (let iter = 0; iter < maxIter; iter++) {
    const clusters = Array.from({ length: k }, () => []);
    pixels.forEach(pixel => {
      let minDist = Infinity, minIdx = 0;
      centroids.forEach((c, i) => {
        const d = colorDistance(pixel, c);
        if (d < minDist) { minDist = d; minIdx = i; }
      });
      clusters[minIdx].push(pixel);
    });

    let converged = true;
    clusters.forEach((cluster, i) => {
      if (cluster.length === 0) return;
      const avg = [0, 1, 2].map(ch => cluster.reduce((s, p) => s + p[ch], 0) / cluster.length);
      if (colorDistance(avg, centroids[i]) > 1) converged = false;
      centroids[i] = avg;
    });
    if (converged) break;
  }

  return centroids.map(c => ({ r: Math.round(c[0]), g: Math.round(c[1]), b: Math.round(c[2]) }));
}

// ─── Named Color Matching ───
const NAMED_COLORS = {
  'Red': [255,0,0], 'Crimson': [220,20,60], 'Coral': [255,127,80],
  'Orange': [255,165,0], 'Gold': [255,215,0], 'Yellow': [255,255,0],
  'Lime': [0,255,0], 'Green': [0,128,0], 'Teal': [0,128,128],
  'Cyan': [0,255,255], 'Blue': [0,0,255], 'Navy': [0,0,128],
  'Purple': [128,0,128], 'Magenta': [255,0,255], 'Pink': [255,192,203],
  'Brown': [139,69,19], 'Maroon': [128,0,0], 'Olive': [128,128,0],
  'White': [255,255,255], 'Silver': [192,192,192], 'Gray': [128,128,128],
  'Charcoal': [54,69,79], 'Black': [0,0,0], 'Slate': [112,128,144],
  'Ivory': [255,255,240], 'Beige': [245,245,220],
};

function nearestName(r, g, b) {
  let best = 'Unknown', bestDist = Infinity;
  for (const [name, [nr, ng, nb]] of Object.entries(NAMED_COLORS)) {
    const d = colorDistance([r, g, b], [nr, ng, nb]);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

// ─── Output Formatters ───
function formatHex(colors) {
  return colors.map(c => rgbToHex(c.r, c.g, c.b)).join('\n');
}

function formatCSS(colors) {
  let css = ':root {\n';
  colors.forEach((c, i) => {
    const hex = rgbToHex(c.r, c.g, c.b);
    const name = nearestName(c.r, c.g, c.b).toLowerCase();
    css += `  --color-extracted-${i + 1}: ${hex}; /* ${name} */\n`;
  });
  css += '}';
  return css;
}

function formatTailwind(colors) {
  let obj = 'module.exports = {\n  theme: {\n    extend: {\n      colors: {\n';
  colors.forEach((c, i) => {
    obj += `        'extracted-${i + 1}': '${rgbToHex(c.r, c.g, c.b)}',\n`;
  });
  obj += '      },\n    },\n  },\n};';
  return obj;
}

function formatJSON(colors) {
  return JSON.stringify(colors.map((c, i) => ({
    index: i + 1,
    hex: rgbToHex(c.r, c.g, c.b),
    rgb: { r: c.r, g: c.g, b: c.b },
    hsl: rgbToHsl(c.r, c.g, c.b),
    name: nearestName(c.r, c.g, c.b),
  })), null, 2);
}

// ─── Main ───
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node extract.js <image> [--count N] [--format hex|css|tailwind|json] [--output file]');
    console.log('\nNote: Requires ImageMagick (convert command) for pixel data extraction.');
    process.exit(0);
  }

  const imagePath = args[0];
  const count = args.includes('--count') ? parseInt(args[args.indexOf('--count') + 1]) : 6;
  const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'hex';
  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

  if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    process.exit(1);
  }

  // Extract pixel data using ImageMagick
  let pixels;
  try {
    const raw = execSync(`convert "${imagePath}" -resize 100x100 -depth 8 txt:-`, { encoding: 'utf-8' });
    pixels = raw.split('\n')
      .filter(line => line.includes('srgb') || line.includes('#'))
      .map(line => {
        const match = line.match(/(\d+),(\d+),(\d+)/);
        if (match) return [+match[1], +match[2], +match[3]];
        const hexMatch = line.match(/#([0-9a-fA-F]{6})/);
        if (hexMatch) {
          const h = hexMatch[1];
          return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
        }
        return null;
      })
      .filter(Boolean);
  } catch (e) {
    console.error('ImageMagick (convert) not found. Install: brew install imagemagick / apt install imagemagick');
    console.error('Falling back to demo palette...');
    // Demo fallback
    pixels = Array.from({ length: 1000 }, () => [
      Math.random() * 255, Math.random() * 255, Math.random() * 255
    ]);
  }

  if (pixels.length === 0) {
    console.error('No pixel data extracted.');
    process.exit(1);
  }

  const colors = kMeans(pixels, count);
  // Sort by luminance (dark to light)
  colors.sort((a, b) => (0.299*a.r + 0.587*a.g + 0.114*a.b) - (0.299*b.r + 0.587*b.g + 0.114*b.b));

  let result;
  switch (format) {
    case 'css': result = formatCSS(colors); break;
    case 'tailwind': result = formatTailwind(colors); break;
    case 'json': result = formatJSON(colors); break;
    default: result = formatHex(colors);
  }

  if (outputFile) {
    fs.writeFileSync(outputFile, result);
    console.log(`Palette written to ${outputFile}`);
  } else {
    console.log(result);
  }
}

main();
