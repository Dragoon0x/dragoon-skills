'use strict';

// Pure inference utilities. No filesystem access.
// All functions are deterministic given the same input.

function tally(arr) {
  const map = new Map();
  for (const v of arr) map.set(v, (map.get(v) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

// Best-fit base grid from a list of pixel spacing values.
// Tries 4, 6, 8, 10, 12, 16. Picks the candidate where most values are multiples.
// Tiebreaker: larger grid wins, since it's the more discriminating claim
// (every multiple of 8 is also a multiple of 4, but not the reverse).
function inferGrid(spacingPx) {
  if (!spacingPx || spacingPx.length < 4) return { grid: null, confidence: 0 };
  const candidates = [4, 6, 8, 10, 12, 16];
  let best = null, bestScore = -1;
  for (const grid of candidates) {
    let hits = 0;
    for (const v of spacingPx) {
      if (Math.abs(v - Math.round(v / grid) * grid) < 0.01) hits++;
    }
    const score = hits / spacingPx.length;
    // strict > on score; on tie, larger grid wins (we iterate ascending so >= flips)
    if (score > bestScore || (score === bestScore && grid > best)) {
      bestScore = score; best = grid;
    }
  }
  return { grid: bestScore >= 0.6 ? best : null, confidence: Number(bestScore.toFixed(3)) };
}

// Best-fit type scale ratio. Compares consecutive ascending font sizes.
// Tighter tolerance (3%) to avoid false positives on chaotic data.
// Tiebreaker on hit count: candidate with smallest total error wins.
function inferTypeScale(fontSizesPx) {
  if (!fontSizesPx || fontSizesPx.length < 3) return { ratio: null, confidence: 0, name: null };
  const unique = [...new Set(fontSizesPx.map(v => Number(v.toFixed(2))))].sort((a, b) => a - b);
  if (unique.length < 3) return { ratio: null, confidence: 0, name: null };
  const ratios = [];
  for (let i = 1; i < unique.length; i++) {
    if (unique[i - 1] === 0) continue;
    ratios.push(unique[i] / unique[i - 1]);
  }
  if (ratios.length === 0) return { ratio: null, confidence: 0, name: null };
  const candidates = [
    { name: 'minor-second', value: 1.067 },
    { name: 'major-second', value: 1.125 },
    { name: 'minor-third', value: 1.2 },
    { name: 'major-third', value: 1.25 },
    { name: 'perfect-fourth', value: 1.333 },
    { name: 'augmented-fourth', value: 1.414 },
    { name: 'perfect-fifth', value: 1.5 },
    { name: 'golden-ratio', value: 1.618 }
  ];
  const TOLERANCE = 0.03; // 3% relative error per ratio
  let best = null, bestScore = -1, bestError = Infinity;
  for (const c of candidates) {
    let hits = 0;
    let totalError = 0;
    for (const r of ratios) {
      const err = Math.abs(r - c.value) / c.value;
      if (err < TOLERANCE) {
        hits++;
        totalError += err;
      }
    }
    const score = hits / ratios.length;
    // higher hit rate wins; on tie, lower total error wins
    if (score > bestScore || (score === bestScore && totalError < bestError)) {
      bestScore = score;
      bestError = totalError;
      best = c;
    }
  }
  return {
    ratio: bestScore >= 0.5 ? Number(best.value.toFixed(3)) : null,
    name: bestScore >= 0.5 ? best.name : null,
    confidence: Number(bestScore.toFixed(3))
  };
}

// Reduce an arbitrary list to top-N with counts. Normalize values via a key fn.
function topN(values, n, keyFn = v => v) {
  const map = new Map();
  for (const v of values) {
    const k = keyFn(v);
    if (k === null || k === undefined) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

module.exports = { tally, inferGrid, inferTypeScale, topN };
