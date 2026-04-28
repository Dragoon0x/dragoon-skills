'use strict';

const fs = require('fs');
const path = require('path');
const { walk, categorize, readSafe } = require('./files');
const { extractStyles, extractTailwind, extractAccessibilitySignals, estimateComponentCount } = require('./parsers');
const { toHex, classifyRole } = require('./colors');
const { inferGrid, inferTypeScale, topN } = require('./tokens');

const SCHEMA_VERSION = '1.0.0';

function detectStack(root) {
  const pkgPath = path.join(root, 'package.json');
  let pkg = null;
  if (fs.existsSync(pkgPath)) {
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch (_e) { /* skip */ }
  }
  const deps = Object.assign({}, pkg && pkg.dependencies, pkg && pkg.devDependencies);
  let framework = 'unknown';
  if (deps['next']) framework = 'next';
  else if (deps['nuxt']) framework = 'nuxt';
  else if (deps['@sveltejs/kit']) framework = 'sveltekit';
  else if (deps['svelte']) framework = 'svelte';
  else if (deps['astro']) framework = 'astro';
  else if (deps['solid-js']) framework = 'solid';
  else if (deps['@builder.io/qwik']) framework = 'qwik';
  else if (deps['vue']) framework = 'vue';
  else if (deps['react']) framework = 'react';
  else if (pkg) framework = 'vanilla';

  const styling = [];
  if (deps['tailwindcss']) styling.push('tailwind');
  if (deps['styled-components']) styling.push('styled-components');
  if (deps['@emotion/react'] || deps['@emotion/styled']) styling.push('emotion');
  if (deps['@stylex/stylex'] || deps['@stylexjs/stylex']) styling.push('stylex');
  if (deps['@vanilla-extract/css']) styling.push('vanilla-extract');
  if (deps['unocss']) styling.push('unocss');
  if (deps['@pandacss/dev']) styling.push('panda');
  if (styling.length === 0) styling.push('css');

  const language = deps['typescript'] || fs.existsSync(path.join(root, 'tsconfig.json'))
    ? 'typescript' : 'javascript';

  let packageManager = 'unknown';
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
  else if (fs.existsSync(path.join(root, 'yarn.lock'))) packageManager = 'yarn';
  else if (fs.existsSync(path.join(root, 'bun.lock')) || fs.existsSync(path.join(root, 'bun.lockb'))) packageManager = 'bun';
  else if (fs.existsSync(path.join(root, 'package-lock.json'))) packageManager = 'npm';

  return {
    framework,
    styling,
    language,
    packageManager,
    buildTool: deps['vite'] ? 'vite' : deps['webpack'] ? 'webpack' : deps['esbuild'] ? 'esbuild' : 'unknown'
  };
}

function scan(root, options = {}) {
  if (!root || !fs.existsSync(root)) {
    throw new Error(`scan: root not found: ${root}`);
  }
  const start = Date.now();
  const stack = detectStack(root);
  const allFiles = walk(root);
  const buckets = categorize(allFiles);

  const colorsRaw = [];
  const fontSizes = [];
  const fontFamilies = [];
  const radii = [];
  const shadows = [];
  const durationsMs = [];
  const easings = [];
  const breakpointsPx = [];
  const spacingPx = [];

  let componentTotal = 0;
  let componentLineTotal = 0;
  let componentFiles = 0;
  const a11yTotals = {
    imagesWithAlt: 0, imagesWithoutAlt: 0,
    buttonsWithLabel: 0, buttonsWithoutLabel: 0,
    ariaUsage: 0, semanticTagUsage: 0
  };

  const counts = { css: 0, scss: 0, jsx: 0, tsx: 0, vue: 0, svelte: 0, html: 0 };

  for (const file of allFiles) {
    const content = readSafe(file);
    if (!content) continue;
    const ext = path.extname(file).toLowerCase();
    if (ext === '.css') counts.css++;
    else if (ext === '.scss' || ext === '.sass') counts.scss++;
    else if (ext === '.jsx') counts.jsx++;
    else if (ext === '.tsx') counts.tsx++;
    else if (ext === '.vue') counts.vue++;
    else if (ext === '.svelte') counts.svelte++;
    else if (ext === '.html' || ext === '.htm') counts.html++;

    const styles = extractStyles(content);
    colorsRaw.push(...styles.colors);
    fontSizes.push(...styles.fontSizes);
    fontFamilies.push(...styles.fontFamilies);
    radii.push(...styles.radii);
    shadows.push(...styles.shadows);
    durationsMs.push(...styles.durationsMs);
    easings.push(...styles.easings);
    breakpointsPx.push(...styles.breakpointsPx);
    spacingPx.push(...styles.spacingPx);

    if (stack.styling.includes('tailwind')) {
      const tw = extractTailwind(content);
      spacingPx.push(...tw.spacingPx);
      radii.push(...tw.radii);
      // tailwind shadow tokens are categorical, not numerical, so we count them as variants
      shadows.push(...tw.shadows);
    }

    if (['.jsx', '.tsx', '.vue', '.svelte', '.astro', '.html', '.htm'].includes(ext)) {
      const a11y = extractAccessibilitySignals(content);
      a11yTotals.imagesWithAlt += a11y.imagesWithAlt;
      a11yTotals.imagesWithoutAlt += a11y.imagesWithoutAlt;
      a11yTotals.buttonsWithLabel += a11y.buttonsWithLabel;
      a11yTotals.buttonsWithoutLabel += a11y.buttonsWithoutLabel;
      a11yTotals.ariaUsage += a11y.ariaUsage;
      a11yTotals.semanticTagUsage += a11y.semanticTagUsage;
    }

    if (['.jsx', '.tsx', '.vue', '.svelte'].includes(ext)) {
      const c = estimateComponentCount(content, ext);
      if (c > 0) {
        componentTotal += c;
        componentLineTotal += content.split('\n').length;
        componentFiles++;
      }
    }
  }

  // normalize colors to hex
  const colorsHex = colorsRaw.map(toHex).filter(Boolean);
  const palette = topN(colorsHex, 32).map(item => ({
    value: item.value,
    count: item.count,
    role: classifyRole(item.value)
  }));

  const gridResult = inferGrid(spacingPx);
  const scaleResult = inferTypeScale(fontSizes);

  const manifest = {
    version: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    project: {
      name: path.basename(path.resolve(root)),
      root: path.resolve(root)
    },
    stack,
    tokens: {
      color: {
        palette,
        totalDistinct: new Set(colorsHex).size
      },
      spacing: {
        values: topN(spacingPx, 24, v => Number(v.toFixed(2))),
        inferredGrid: gridResult.grid,
        gridConfidence: gridResult.confidence
      },
      type: {
        fontFamilies: topN(fontFamilies, 8),
        fontSizes: topN(fontSizes, 16, v => Number(v.toFixed(2))).map(o => ({ px: o.value, count: o.count })),
        inferredScaleRatio: scaleResult.ratio,
        scaleName: scaleResult.name || null,
        scaleConfidence: scaleResult.confidence
      },
      radius: {
        values: topN(radii, 12, v => Number(v.toFixed(2))).map(o => ({ px: o.value, count: o.count }))
      },
      shadow: {
        values: topN(shadows, 12)
      },
      motion: {
        durations: topN(durationsMs, 8, v => Number(v.toFixed(0))).map(o => ({ ms: o.value, count: o.count })),
        easings: topN(easings, 8)
      },
      breakpoints: topN(breakpointsPx, 8, v => Number(v.toFixed(0))).map(o => ({ px: o.value, count: o.count }))
    },
    metrics: {
      files: { scanned: allFiles.length, ...counts },
      components: {
        estimated: componentTotal,
        averageSizeLines: componentFiles > 0 ? Number((componentLineTotal / componentFiles).toFixed(1)) : 0
      },
      accessibility: a11yTotals
    },
    rules: deriveDefaultRules(palette, gridResult, scaleResult, radii, shadows),
    diagnostics: {
      durationMs: Date.now() - start,
      tooSmallToInfer: allFiles.length < 4
    }
  };

  return manifest;
}

function deriveDefaultRules(palette, gridResult, scaleResult, radii, shadows) {
  return {
    spacingGrid: gridResult.grid || 8,
    typeScaleRatio: scaleResult.ratio || 1.25,
    maxShadowVariants: 3,
    maxRadiusVariants: 4,
    maxFontFamilies: 2,
    maxEasingVariants: 3,
    allowedColors: palette.slice(0, 12).map(p => p.value)
  };
}

module.exports = { scan, SCHEMA_VERSION };
