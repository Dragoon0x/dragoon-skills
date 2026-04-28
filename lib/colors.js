'use strict';

// Convert any common color string to lowercase hex (#rrggbb) or null if can't.
function toHex(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();
  // #rgb, #rgba, #rrggbb, #rrggbbaa
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    const h = m[1];
    if (h.length === 3) return '#' + h.split('').map(c => c + c).join('');
    if (h.length === 4) return '#' + h.slice(0, 3).split('').map(c => c + c).join('');
    if (h.length === 6) return '#' + h;
    if (h.length === 8) return '#' + h.slice(0, 6);
  }
  // rgb / rgba
  m = s.match(/^rgba?\(\s*(\d+)[,\s]+\s*(\d+)[,\s]+\s*(\d+)/);
  if (m) {
    const r = clamp(parseInt(m[1], 10), 0, 255);
    const g = clamp(parseInt(m[2], 10), 0, 255);
    const b = clamp(parseInt(m[3], 10), 0, 255);
    return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
  }
  // hsl / hsla
  m = s.match(/^hsla?\(\s*(\d+(?:\.\d+)?)[,\s]+\s*(\d+(?:\.\d+)?)%[,\s]+\s*(\d+(?:\.\d+)?)%/);
  if (m) {
    const rgb = hslToRgb(parseFloat(m[1]), parseFloat(m[2]) / 100, parseFloat(m[3]) / 100);
    return '#' + rgb.map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
  }
  return null;
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const conv = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [conv(h + 1 / 3) * 255, conv(h) * 255, conv(h - 1 / 3) * 255];
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Relative luminance per WCAG 2.1.
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio.
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// Rough role classifier from a hex value alone (without context). Heuristic only.
function classifyRole(hex) {
  const [r, g, b] = hexToRgb(hex);
  const lum = luminance(hex);
  if (lum > 0.85) return 'background';
  if (lum < 0.15) return 'foreground';
  // saturated red / green / yellow / blue
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.2) return 'muted';
  if (r > g && r > b && r - Math.max(g, b) > 60) return 'danger';
  if (g > r && g > b && g - Math.max(r, b) > 40) return 'success';
  if (r > 200 && g > 150 && b < 100) return 'warning';
  if (b > r && b > g) return 'info';
  return 'accent';
}

// Common AI-default color palettes. Used by /slop.
const COMMON_AI_DEFAULTS = new Set([
  '#3b82f6', // tailwind blue-500 - the signature AI default
  '#6366f1', // tailwind indigo-500
  '#8b5cf6', // tailwind violet-500
  '#a855f7', // tailwind purple-500
  '#ec4899', // tailwind pink-500 (often paired in gradient)
  '#10b981', // tailwind emerald-500
  '#f59e0b', // tailwind amber-500
  '#ef4444'  // tailwind red-500
]);

function isAIDefaultPalette(hexValues) {
  let hits = 0;
  for (const v of hexValues) {
    if (COMMON_AI_DEFAULTS.has(v.toLowerCase())) hits++;
  }
  return { hits, isLikely: hits >= 3 };
}

module.exports = {
  toHex,
  hexToRgb,
  luminance,
  contrast,
  classifyRole,
  isAIDefaultPalette,
  COMMON_AI_DEFAULTS
};
