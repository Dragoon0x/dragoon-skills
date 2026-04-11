#!/usr/bin/env node

/**
 * WCAG 2.1 Contrast Ratio Checker
 * Usage: node check.js <fg-color> <bg-color> [--suggest]
 *        node check.js --file <css-file>
 *        node check.js --tokens <tokens.json>
 */

const fs = require('fs');

// ─── Color Parsing ───
function parseHex(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length === 8) hex = hex.substring(0, 6); // strip alpha
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function parseColor(color) {
  color = color.trim().toLowerCase();

  // Named colors (common subset)
  const named = {
    white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000',
    blue: '#0000ff', gray: '#808080', grey: '#808080',
  };
  if (named[color]) return parseHex(named[color]);

  // Hex
  if (color.startsWith('#')) return parseHex(color);

  // rgb(r, g, b)
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };

  // hsl(h, s%, l%)
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (hslMatch) {
    const h = +hslMatch[1] / 360, s = +hslMatch[2] / 100, l = +hslMatch[3] / 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  throw new Error(`Cannot parse color: ${color}`);
}

// ─── Luminance & Contrast ───
function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(color1, color2) {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Compliance Check ───
function checkCompliance(ratio) {
  return {
    ratio: Math.round(ratio * 100) / 100,
    aa_normal: ratio >= 4.5,
    aa_large: ratio >= 3,
    aaa_normal: ratio >= 7,
    aaa_large: ratio >= 4.5,
    ui_components: ratio >= 3,
  };
}

// ─── Color Suggestion ───
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function suggestCompliant(fg, bg, targetRatio = 4.5) {
  const fgColor = parseColor(fg);
  const bgColor = parseColor(bg);
  const currentRatio = contrastRatio(fgColor, bgColor);
  if (currentRatio >= targetRatio) return null; // already compliant

  // Try adjusting fg lightness
  const bgLum = relativeLuminance(bgColor);
  const isLightBg = bgLum > 0.5;

  let bestColor = null;
  let bestDiff = Infinity;

  for (let step = 0; step <= 255; step++) {
    const adjusted = isLightBg
      ? { r: Math.max(0, fgColor.r - step), g: Math.max(0, fgColor.g - step), b: Math.max(0, fgColor.b - step) }
      : { r: Math.min(255, fgColor.r + step), g: Math.min(255, fgColor.g + step), b: Math.min(255, fgColor.b + step) };
    const ratio = contrastRatio(adjusted, bgColor);
    if (ratio >= targetRatio) {
      bestColor = adjusted;
      break;
    }
  }

  return bestColor ? rgbToHex(bestColor) : null;
}

// ─── Main ───
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage:');
    console.log('  node check.js <fg-color> <bg-color> [--suggest]');
    console.log('  node check.js --file <css-file>');
    console.log('  node check.js --tokens <tokens.json>');
    console.log('\nExamples:');
    console.log('  node check.js "#333333" "#FFFFFF"');
    console.log('  node check.js "rgb(100,100,100)" "#F5F5F5" --suggest');
    process.exit(0);
  }

  if (args[0] === '--file') {
    // Batch CSS audit mode
    const file = args[1];
    const content = fs.readFileSync(file, 'utf-8');
    const hexColors = [...new Set(content.match(/#[0-9a-fA-F]{3,8}/g) || [])];
    console.log(`Found ${hexColors.length} unique colors in ${file}:\n`);
    console.log(hexColors.join(', '));
    console.log('\nPair checking requires foreground/background context. Run individual checks:');
    hexColors.forEach((c, i) => {
      if (i < hexColors.length - 1) {
        const ratio = contrastRatio(parseColor(c), parseColor(hexColors[i + 1]));
        const result = checkCompliance(ratio);
        const status = result.aa_normal ? '✓ AA' : '✗ Fail';
        console.log(`  ${c} on ${hexColors[i + 1]}: ${result.ratio}:1 ${status}`);
      }
    });
    return;
  }

  if (args[0] === '--tokens') {
    const file = args[1];
    const tokens = JSON.parse(fs.readFileSync(file, 'utf-8'));
    console.log('Token contrast audit:\n');
    // Check text colors against background colors
    const textColors = Object.entries(tokens).filter(([k]) => k.includes('text'));
    const bgColors = Object.entries(tokens).filter(([k]) => k.includes('bg') || k.includes('surface') || k.includes('background'));
    textColors.forEach(([tName, tValue]) => {
      bgColors.forEach(([bName, bValue]) => {
        try {
          const ratio = contrastRatio(parseColor(tValue), parseColor(bValue));
          const result = checkCompliance(ratio);
          const status = result.aa_normal ? '✓' : '✗';
          console.log(`  ${status} ${tName} on ${bName}: ${result.ratio}:1`);
        } catch (e) { /* skip unparseable */ }
      });
    });
    return;
  }

  // Direct comparison
  const fg = args[0];
  const bg = args[1];
  const suggest = args.includes('--suggest');

  try {
    const fgColor = parseColor(fg);
    const bgColor = parseColor(bg);
    const ratio = contrastRatio(fgColor, bgColor);
    const result = checkCompliance(ratio);

    console.log(`\n  Foreground: ${fg}`);
    console.log(`  Background: ${bg}`);
    console.log(`  Ratio:      ${result.ratio}:1\n`);
    console.log(`  AA  Normal Text (4.5:1): ${result.aa_normal ? '✓ Pass' : '✗ Fail'}`);
    console.log(`  AA  Large Text  (3.0:1): ${result.aa_large ? '✓ Pass' : '✗ Fail'}`);
    console.log(`  AAA Normal Text (7.0:1): ${result.aaa_normal ? '✓ Pass' : '✗ Fail'}`);
    console.log(`  AAA Large Text  (4.5:1): ${result.aaa_large ? '✓ Pass' : '✗ Fail'}`);
    console.log(`  UI Components   (3.0:1): ${result.ui_components ? '✓ Pass' : '✗ Fail'}`);

    if (suggest && !result.aa_normal) {
      const suggested = suggestCompliant(fg, bg);
      if (suggested) {
        console.log(`\n  Suggested foreground: ${suggested} (closest AA-compliant)`);
      }
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
