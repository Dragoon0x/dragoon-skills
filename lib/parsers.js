'use strict';

// Lightweight value extractor. Pure regex on purpose: portable, fast, no parse-tree
// dependency, and good enough for fingerprinting. Edge cases are documented.

const COLOR_RE = /(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\))/g;
const PX_VALUE_RE = /(-?\d+(?:\.\d+)?)px\b/g;
const REM_VALUE_RE = /(-?\d+(?:\.\d+)?)rem\b/g;
const FONT_SIZE_RE = /font-size\s*:\s*([^;]+);/gi;
const FONT_FAMILY_RE = /font-family\s*:\s*([^;]+);/gi;
const RADIUS_RE = /border-radius\s*:\s*([^;]+);/gi;
const BOX_SHADOW_RE = /box-shadow\s*:\s*([^;]+);/gi;
const TRANSITION_DURATION_RE = /transition(?:-duration)?\s*:[^;]*?(\d+(?:\.\d+)?)(ms|s)/gi;
const ANIMATION_DURATION_RE = /animation(?:-duration)?\s*:[^;]*?(\d+(?:\.\d+)?)(ms|s)/gi;
const CUBIC_BEZIER_RE = /cubic-bezier\([^)]+\)/g;
const NAMED_EASING_RE = /\b(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)\b/g;
const MEDIA_QUERY_RE = /@media[^{]*\(\s*(?:min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)/gi;
const PADDING_MARGIN_RE = /(?:padding|margin|gap)(?:-(?:top|right|bottom|left|x|y|inline|block))?\s*:\s*([^;]+);/gi;
const TAILWIND_SPACING_RE = /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.\d+)?)\b/g;
const TAILWIND_RADIUS_RE = /\brounded(?:-(?:t|r|b|l|tl|tr|bl|br|x|y))?-(none|sm|md|lg|xl|2xl|3xl|full|\d+)\b/g;
const TAILWIND_SHADOW_RE = /\bshadow(?:-(?:sm|md|lg|xl|2xl|inner|none|\w+))?\b/g;

// Extract all unique-looking style values and their occurrence counts.
function extractStyles(content) {
  const colors = [];
  const fontSizes = [];
  const fontFamilies = [];
  const radii = [];
  const shadows = [];
  const durationsMs = [];
  const easings = [];
  const breakpointsPx = [];

  let m;
  while ((m = COLOR_RE.exec(content)) !== null) colors.push(m[1]);

  // font sizes from declared CSS only (avoid catching every "16px" in code)
  FONT_SIZE_RE.lastIndex = 0;
  while ((m = FONT_SIZE_RE.exec(content)) !== null) {
    const inner = m[1];
    const px = inner.match(/(-?\d+(?:\.\d+)?)px/);
    const rem = inner.match(/(-?\d+(?:\.\d+)?)rem/);
    if (px) fontSizes.push(parseFloat(px[1]));
    else if (rem) fontSizes.push(parseFloat(rem[1]) * 16);
  }

  FONT_FAMILY_RE.lastIndex = 0;
  while ((m = FONT_FAMILY_RE.exec(content)) !== null) {
    const cleaned = m[1].replace(/['";]/g, '').split(',')[0].trim();
    if (cleaned) fontFamilies.push(cleaned);
  }

  RADIUS_RE.lastIndex = 0;
  while ((m = RADIUS_RE.exec(content)) !== null) {
    const inner = m[1];
    const px = inner.match(/(-?\d+(?:\.\d+)?)px/);
    if (px) radii.push(parseFloat(px[1]));
  }

  BOX_SHADOW_RE.lastIndex = 0;
  while ((m = BOX_SHADOW_RE.exec(content)) !== null) {
    const cleaned = m[1].trim().replace(/\s+/g, ' ');
    if (cleaned && cleaned !== 'none') shadows.push(cleaned);
  }

  TRANSITION_DURATION_RE.lastIndex = 0;
  while ((m = TRANSITION_DURATION_RE.exec(content)) !== null) {
    const v = parseFloat(m[1]);
    durationsMs.push(m[2] === 's' ? v * 1000 : v);
  }
  ANIMATION_DURATION_RE.lastIndex = 0;
  while ((m = ANIMATION_DURATION_RE.exec(content)) !== null) {
    const v = parseFloat(m[1]);
    durationsMs.push(m[2] === 's' ? v * 1000 : v);
  }

  CUBIC_BEZIER_RE.lastIndex = 0;
  while ((m = CUBIC_BEZIER_RE.exec(content)) !== null) {
    easings.push(m[0].replace(/\s+/g, ''));
  }
  // only count named easings inside transition/animation properties to avoid noise
  const namedSnippet = content.match(/(?:transition|animation)[^;]*;/gi) || [];
  for (const snip of namedSnippet) {
    NAMED_EASING_RE.lastIndex = 0;
    let nm;
    while ((nm = NAMED_EASING_RE.exec(snip)) !== null) easings.push(nm[1]);
  }

  MEDIA_QUERY_RE.lastIndex = 0;
  while ((m = MEDIA_QUERY_RE.exec(content)) !== null) breakpointsPx.push(parseFloat(m[1]));

  // spacing values from CSS declarations
  const spacingPx = [];
  PADDING_MARGIN_RE.lastIndex = 0;
  while ((m = PADDING_MARGIN_RE.exec(content)) !== null) {
    const inner = m[1];
    let pm;
    PX_VALUE_RE.lastIndex = 0;
    while ((pm = PX_VALUE_RE.exec(inner)) !== null) {
      const v = Math.abs(parseFloat(pm[1]));
      if (v > 0 && v <= 256) spacingPx.push(v);
    }
    REM_VALUE_RE.lastIndex = 0;
    while ((pm = REM_VALUE_RE.exec(inner)) !== null) {
      const v = Math.abs(parseFloat(pm[1])) * 16;
      if (v > 0 && v <= 256) spacingPx.push(v);
    }
  }

  return { colors, fontSizes, fontFamilies, radii, shadows, durationsMs, easings, breakpointsPx, spacingPx };
}

// Tailwind class scanner. Tailwind unit = 4px by default.
function extractTailwind(content) {
  const spacingPx = [];
  const radii = [];
  const shadows = [];
  let m;
  TAILWIND_SPACING_RE.lastIndex = 0;
  while ((m = TAILWIND_SPACING_RE.exec(content)) !== null) {
    const v = parseFloat(m[1]) * 4;
    if (v > 0 && v <= 256) spacingPx.push(v);
  }
  TAILWIND_RADIUS_RE.lastIndex = 0;
  while ((m = TAILWIND_RADIUS_RE.exec(content)) !== null) {
    const v = m[1];
    const TAILWIND_RADIUS_PX = { none: 0, sm: 2, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, full: 9999 };
    if (TAILWIND_RADIUS_PX[v] !== undefined) radii.push(TAILWIND_RADIUS_PX[v]);
    else if (!isNaN(parseFloat(v))) radii.push(parseFloat(v) * 4);
  }
  TAILWIND_SHADOW_RE.lastIndex = 0;
  while ((m = TAILWIND_SHADOW_RE.exec(content)) !== null) {
    shadows.push(m[0]);
  }
  return { spacingPx, radii, shadows };
}

// Crude accessibility signals from JSX/HTML/Vue/Svelte content.
function extractAccessibilitySignals(content) {
  const imgs = (content.match(/<img\b[^>]*>/gi) || []);
  let imagesWithAlt = 0, imagesWithoutAlt = 0;
  for (const tag of imgs) {
    if (/\balt\s*=/.test(tag)) imagesWithAlt++;
    else imagesWithoutAlt++;
  }
  const buttons = (content.match(/<button\b[^>]*>([\s\S]*?)<\/button>/gi) || []);
  let buttonsWithLabel = 0, buttonsWithoutLabel = 0;
  for (const tag of buttons) {
    const inner = tag.replace(/<button\b[^>]*>/i, '').replace(/<\/button>/i, '').trim();
    const hasAria = /\baria-label\s*=/.test(tag) || /\baria-labelledby\s*=/.test(tag);
    const hasText = inner.replace(/<[^>]*>/g, '').replace(/[\s{}]/g, '').length > 0;
    if (hasAria || hasText) buttonsWithLabel++;
    else buttonsWithoutLabel++;
  }
  const ariaUsage = (content.match(/\baria-[a-z]+\s*=/gi) || []).length;
  const semanticTagUsage = (content.match(/<(nav|main|article|section|header|footer|aside|figure|figcaption)\b/gi) || []).length;
  return { imagesWithAlt, imagesWithoutAlt, buttonsWithLabel, buttonsWithoutLabel, ariaUsage, semanticTagUsage };
}

// Estimate a component count from a JSX/TSX/Vue/Svelte file.
function estimateComponentCount(content, ext) {
  if (ext === '.vue' || ext === '.svelte') return 1;
  // function or arrow components that return JSX
  const fnComponents = (content.match(/function\s+[A-Z][A-Za-z0-9_]*\s*\(/g) || []).length;
  const arrowComponents = (content.match(/(?:const|let|var)\s+[A-Z][A-Za-z0-9_]*\s*[:=][^=]*=>/g) || []).length;
  return fnComponents + arrowComponents;
}

module.exports = {
  extractStyles,
  extractTailwind,
  extractAccessibilitySignals,
  estimateComponentCount
};
