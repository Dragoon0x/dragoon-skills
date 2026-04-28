'use strict';

// Critique engine. Pure function from manifest -> scores.
// Every category score is derived from concrete metrics in the manifest with
// transparent math. No magic, no LLM, no vibes.

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function scoreTypography(manifest) {
  const t = manifest.tokens.type || {};
  const families = (t.fontFamilies || []).length;
  const scaleConfidence = t.scaleConfidence || 0;
  // start at 100, deduct for sloppy signals
  let score = 100;
  let breakdown = [];
  if (families > 3) {
    const penalty = Math.min(40, (families - 2) * 12);
    score -= penalty;
    breakdown.push({ kind: 'penalty', amount: penalty, reason: `${families} font families (recommended: 1-2).` });
  } else if (families >= 1 && families <= 2) {
    breakdown.push({ kind: 'ok', amount: 0, reason: `${families} font families. Disciplined.` });
  }
  if (scaleConfidence < 0.4 && (t.fontSizes || []).length > 4) {
    score -= 15;
    breakdown.push({ kind: 'penalty', amount: 15, reason: `Type sizes don't match a recognizable scale ratio.` });
  } else if (scaleConfidence >= 0.7) {
    breakdown.push({ kind: 'ok', amount: 0, reason: `Clear ${manifest.tokens.type.scaleName || 'type'} scale (${scaleConfidence}).` });
  }
  if ((t.fontSizes || []).length > 12) {
    score -= 10;
    breakdown.push({ kind: 'penalty', amount: 10, reason: `${t.fontSizes.length} distinct font sizes. Tighten the scale.` });
  }
  return { score: Math.round(clamp(score, 0, 100)), breakdown };
}

function scoreColor(manifest) {
  const c = manifest.tokens.color || {};
  const totalDistinct = c.totalDistinct || 0;
  const palette = c.palette || [];
  let score = 100;
  let breakdown = [];
  // too many distinct colors signals undisciplined system
  if (totalDistinct > 32) {
    const penalty = Math.min(45, Math.floor((totalDistinct - 32) / 4) * 5 + 10);
    score -= penalty;
    breakdown.push({ kind: 'penalty', amount: penalty, reason: `${totalDistinct} distinct colors used (target: <=32).` });
  } else if (totalDistinct > 0) {
    breakdown.push({ kind: 'ok', amount: 0, reason: `${totalDistinct} distinct colors.` });
  }
  // palette imbalance: if most used color dominates everything
  if (palette.length > 0) {
    const total = palette.reduce((s, p) => s + p.count, 0);
    const top = palette[0].count / Math.max(total, 1);
    if (palette.length > 3 && top > 0.85) {
      score -= 5;
      breakdown.push({ kind: 'penalty', amount: 5, reason: `Top color usage ${Math.round(top * 100)}% of palette weight. Possibly missing roles.` });
    }
  }
  return { score: Math.round(clamp(score, 0, 100)), breakdown };
}

function scoreSpacing(manifest) {
  const s = manifest.tokens.spacing || {};
  const grid = s.inferredGrid;
  const confidence = s.gridConfidence || 0;
  let score = 100;
  let breakdown = [];
  if (!grid) {
    score -= 30;
    breakdown.push({ kind: 'penalty', amount: 30, reason: `No clear spacing grid detected.` });
  } else if (confidence < 0.7) {
    const penalty = Math.round((0.7 - confidence) * 40);
    score -= penalty;
    breakdown.push({ kind: 'penalty', amount: penalty, reason: `Grid ${grid}px detected with low confidence (${confidence}). ${Math.round((1 - confidence) * 100)}% of values off-grid.` });
  } else {
    breakdown.push({ kind: 'ok', amount: 0, reason: `${grid}px grid (confidence ${confidence}).` });
  }
  if ((s.values || []).length > 18) {
    score -= 5;
    breakdown.push({ kind: 'penalty', amount: 5, reason: `${s.values.length} distinct spacing values. Reduce.` });
  }
  return { score: Math.round(clamp(score, 0, 100)), breakdown };
}

function scoreMotion(manifest) {
  const m = manifest.tokens.motion || {};
  const easings = (m.easings || []).length;
  const durations = (m.durations || []).length;
  let score = 100;
  let breakdown = [];
  if (easings > 4) {
    const penalty = Math.min(35, (easings - 3) * 8);
    score -= penalty;
    breakdown.push({ kind: 'penalty', amount: penalty, reason: `${easings} distinct easings (target: 1-3).` });
  } else if (easings > 0) {
    breakdown.push({ kind: 'ok', amount: 0, reason: `${easings} easings used.` });
  }
  if (durations > 6) {
    score -= 10;
    breakdown.push({ kind: 'penalty', amount: 10, reason: `${durations} distinct durations. Pick fast/normal/slow and stop there.` });
  }
  return { score: Math.round(clamp(score, 0, 100)), breakdown };
}

function scoreAccessibility(manifest) {
  const a = manifest.metrics.accessibility || {};
  const totalImgs = a.imagesWithAlt + a.imagesWithoutAlt;
  const totalBtns = a.buttonsWithLabel + a.buttonsWithoutLabel;
  let score = 100;
  let breakdown = [];
  if (totalImgs > 0) {
    const altRate = a.imagesWithAlt / totalImgs;
    if (altRate < 1) {
      const penalty = Math.round((1 - altRate) * 40);
      score -= penalty;
      breakdown.push({ kind: 'penalty', amount: penalty, reason: `${a.imagesWithoutAlt}/${totalImgs} images missing alt (${Math.round(altRate * 100)}% covered).` });
    } else {
      breakdown.push({ kind: 'ok', amount: 0, reason: `All ${totalImgs} images have alt.` });
    }
  }
  if (totalBtns > 0) {
    const labelRate = a.buttonsWithLabel / totalBtns;
    if (labelRate < 1) {
      const penalty = Math.round((1 - labelRate) * 30);
      score -= penalty;
      breakdown.push({ kind: 'penalty', amount: penalty, reason: `${a.buttonsWithoutLabel}/${totalBtns} buttons without accessible label.` });
    } else {
      breakdown.push({ kind: 'ok', amount: 0, reason: `All ${totalBtns} buttons have labels.` });
    }
  }
  if ((a.semanticTagUsage || 0) === 0 && (manifest.metrics.files.html + manifest.metrics.files.jsx + manifest.metrics.files.tsx + manifest.metrics.files.vue + manifest.metrics.files.svelte) > 5) {
    score -= 10;
    breakdown.push({ kind: 'penalty', amount: 10, reason: `Zero semantic tags (nav/main/article/section/etc.) used.` });
  }
  return { score: Math.round(clamp(score, 0, 100)), breakdown };
}

function scoreConsistency(manifest) {
  const t = manifest.tokens || {};
  const shadows = (t.shadow && t.shadow.values || []).length;
  const radii = (t.radius && t.radius.values || []).length;
  let score = 100;
  let breakdown = [];
  if (shadows > 5) {
    const penalty = Math.min(30, (shadows - 3) * 6);
    score -= penalty;
    breakdown.push({ kind: 'penalty', amount: penalty, reason: `${shadows} distinct shadow values. AI-design tell.` });
  }
  if (radii > 6) {
    const penalty = Math.min(25, (radii - 4) * 6);
    score -= penalty;
    breakdown.push({ kind: 'penalty', amount: penalty, reason: `${radii} distinct radius values.` });
  }
  return { score: Math.round(clamp(score, 0, 100)), breakdown };
}

function critique(manifest) {
  const typography = scoreTypography(manifest);
  const color = scoreColor(manifest);
  const spacing = scoreSpacing(manifest);
  const motion = scoreMotion(manifest);
  const accessibility = scoreAccessibility(manifest);
  const consistency = scoreConsistency(manifest);

  const weights = { typography: 1, color: 1, spacing: 1.2, motion: 0.8, accessibility: 1.2, consistency: 1 };
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  const overall = Math.round(
    (typography.score * weights.typography +
     color.score * weights.color +
     spacing.score * weights.spacing +
     motion.score * weights.motion +
     accessibility.score * weights.accessibility +
     consistency.score * weights.consistency) / totalWeight
  );

  return {
    scores: {
      overall,
      typography: typography.score,
      color: color.score,
      spacing: spacing.score,
      motion: motion.score,
      accessibility: accessibility.score,
      consistency: consistency.score
    },
    breakdown: {
      typography: typography.breakdown,
      color: color.breakdown,
      spacing: spacing.breakdown,
      motion: motion.breakdown,
      accessibility: accessibility.breakdown,
      consistency: consistency.breakdown
    },
    weights
  };
}

function grade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

module.exports = { critique, grade };
