'use strict';

// perf engine. two halves:
//   1. static analysis of the codebase (large images, sync scripts, missing
//      loading="lazy", missing width/height, oversize bundles based on file
//      size heuristics)
//   2. ingestion of an existing lighthouse json report, surfacing the failing
//      audits in actionable form
//
// dragoon does NOT run lighthouse. it reads the report you generated.

const fs = require('fs');
const path = require('path');
const { walk, readSafe } = require('./files');

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) if (content[i] === '\n') line++;
  return line;
}
function clip(s, max = 80) {
  const cleaned = s.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1) + '…' : cleaned;
}

const STATIC_RULES = [
  {
    id: 'perf-001',
    name: 'large-image',
    severity: 'medium',
    description: 'Image asset larger than 500KB.',
    detect(file, content, ext, root) {
      if (!['.png', '.jpg', '.jpeg'].includes(ext)) return [];
      const size = fs.statSync(file).size;
      if (size > 500 * 1024) {
        return [{
          line: 1, column: 1, snippet: `${(size / 1024).toFixed(0)}KB`,
          message: `${path.relative(root, file)} is ${(size / 1024).toFixed(0)}KB. Compress or convert to WebP/AVIF.`,
          fix: 'Use sharp/squoosh to compress, or serve via Next/Image, Nuxt Image, etc.'
        }];
      }
      return [];
    }
  },
  {
    id: 'perf-002',
    name: 'img-missing-dimensions',
    severity: 'low',
    description: 'img element without width and height attributes (causes layout shift).',
    detect(file, content, ext, root) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /<img\b[^>]*>/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        const tag = m[0];
        if (/\bsrc\s*=\s*["']data:/.test(tag)) continue; // inline data uri
        const hasW = /\bwidth\s*=/.test(tag);
        const hasH = /\bheight\s*=/.test(tag);
        if (!hasW || !hasH) {
          out.push({
            line: lineOf(content, m.index), column: 1,
            snippet: clip(tag),
            message: '<img> missing width/height. Causes Cumulative Layout Shift (CLS).',
            fix: 'Add explicit width and height (or use a framework Image component).'
          });
        }
      }
      return out;
    }
  },
  {
    id: 'perf-003',
    name: 'img-without-loading-lazy',
    severity: 'low',
    description: 'img element below-the-fold without loading="lazy".',
    detect(file, content, ext, root) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /<img\b[^>]*>/gi;
      let m;
      let count = 0;
      while ((m = re.exec(content)) !== null) {
        if (/\bloading\s*=/.test(m[0])) continue;
        // only flag the second image and beyond - the first is likely above the fold
        count++;
        if (count <= 1) continue;
        out.push({
          line: lineOf(content, m.index), column: 1,
          snippet: clip(m[0]),
          message: '<img> without loading="lazy". Forces browser to load eagerly.',
          fix: 'Add loading="lazy" for below-the-fold images.'
        });
      }
      return out.slice(0, 5);
    }
  },
  {
    id: 'perf-004',
    name: 'sync-script-tag',
    severity: 'medium',
    description: 'External <script src> tag without async or defer.',
    detect(file, content, ext, root) {
      if (!['.html', '.htm', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /<script\b([^>]*\bsrc\s*=[^>]*)>/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        const attrs = m[1];
        if (/\b(async|defer|type\s*=\s*["']module["'])\b/.test(attrs)) continue;
        out.push({
          line: lineOf(content, m.index), column: 1,
          snippet: clip(m[0]),
          message: '<script src> blocks parsing. Add defer or async.',
          fix: 'Add defer (executes in order, after parse) or async (executes ASAP).'
        });
      }
      return out;
    }
  }
];

function staticPerfScan(root) {
  // include all UI files plus image extensions
  const allExt = new Set([
    '.css', '.scss', '.sass', '.jsx', '.tsx', '.vue', '.svelte', '.astro',
    '.html', '.htm', '.png', '.jpg', '.jpeg'
  ]);
  const files = walk(root, { extensions: allExt });
  const findings = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    let content = '';
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      content = readSafe(file);
      if (!content) continue;
    }
    for (const rule of STATIC_RULES) {
      let result;
      try { result = rule.detect(file, content, ext, root); }
      catch (_e) { result = []; }
      for (const f of result) {
        findings.push({
          rule: rule.id, ruleName: rule.name, severity: rule.severity,
          ...f, file: path.relative(root, file)
        });
      }
    }
  }
  return findings;
}

// shape lighthouse report into a smaller actionable object.
function summarizeLighthouse(report) {
  if (!report || !report.audits || !report.categories) return null;
  const cat = report.categories;
  const scores = {
    performance: cat.performance ? Math.round((cat.performance.score || 0) * 100) : null,
    accessibility: cat.accessibility ? Math.round((cat.accessibility.score || 0) * 100) : null,
    bestPractices: cat['best-practices'] ? Math.round((cat['best-practices'].score || 0) * 100) : null,
    seo: cat.seo ? Math.round((cat.seo.score || 0) * 100) : null
  };
  // core web vitals
  const cwv = {};
  const audits = report.audits;
  if (audits['largest-contentful-paint']) cwv.lcp = audits['largest-contentful-paint'].displayValue || audits['largest-contentful-paint'].numericValue;
  if (audits['cumulative-layout-shift']) cwv.cls = audits['cumulative-layout-shift'].displayValue || audits['cumulative-layout-shift'].numericValue;
  if (audits['total-blocking-time']) cwv.tbt = audits['total-blocking-time'].displayValue || audits['total-blocking-time'].numericValue;
  if (audits['interaction-to-next-paint']) cwv.inp = audits['interaction-to-next-paint'].displayValue || audits['interaction-to-next-paint'].numericValue;
  if (audits['first-contentful-paint']) cwv.fcp = audits['first-contentful-paint'].displayValue || audits['first-contentful-paint'].numericValue;
  if (audits['speed-index']) cwv.si = audits['speed-index'].displayValue || audits['speed-index'].numericValue;
  // failing audits with potential savings
  const failing = [];
  for (const [id, audit] of Object.entries(audits)) {
    if (typeof audit.score !== 'number') continue;
    if (audit.score >= 0.9) continue;
    if (audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'manual') continue;
    failing.push({
      id,
      title: audit.title,
      score: Math.round((audit.score || 0) * 100),
      description: (audit.description || '').replace(/\[.*?\]\(.*?\)/g, '').slice(0, 200),
      savingsMs: (audit.details && audit.details.overallSavingsMs) || null,
      savingsBytes: (audit.details && audit.details.overallSavingsBytes) || null
    });
  }
  failing.sort((a, b) => (b.savingsMs || 0) - (a.savingsMs || 0));
  return { scores, cwv, failing: failing.slice(0, 25) };
}

module.exports = { staticPerfScan, summarizeLighthouse, STATIC_RULES };
