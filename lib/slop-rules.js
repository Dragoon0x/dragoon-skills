'use strict';

// Slop rules. Each rule:
//   - has an id, name, severity (low/medium/high)
//   - returns findings: { line, column, snippet, message, fix }
//   - is deterministic and unit-testable
//
// detect(content, ctx) where ctx is { file, ext, manifest, stack }.

const path = require('path');
const { toHex, COMMON_AI_DEFAULTS } = require('./colors');

function lineOf(content, index) {
  // 1-indexed line number for an absolute character offset.
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

function columnOf(content, index) {
  let col = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (content[i] === '\n') break;
    col++;
  }
  return col;
}

function clampSnippet(s, max = 80) {
  const cleaned = s.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1) + '…' : cleaned;
}

const RULES = [
  {
    id: 'slop-001',
    name: 'too-many-shadow-variants',
    severity: 'medium',
    description: 'More than 3 distinct box-shadow values in a single file. Real design systems define a few elevation tokens and reuse them.',
    detect(content, ctx) {
      const styleExts = new Set(['.css', '.scss', '.sass', '.tsx', '.jsx', '.vue', '.svelte', '.astro', '.html']);
      if (!styleExts.has(ctx.ext)) return [];
      const shadowRe = /box-shadow\s*:\s*([^;]+);/gi;
      const seen = new Map();
      let m;
      while ((m = shadowRe.exec(content)) !== null) {
        const v = m[1].trim().replace(/\s+/g, ' ');
        if (!v || v === 'none') continue;
        if (!seen.has(v)) seen.set(v, m.index);
      }
      const distinct = [...seen.keys()];
      const limit = (ctx.manifest && ctx.manifest.rules && ctx.manifest.rules.maxShadowVariants) || 3;
      if (distinct.length <= limit) return [];
      return [{
        line: lineOf(content, [...seen.values()][0]),
        column: 1,
        snippet: clampSnippet(distinct.join(' | ')),
        message: `${distinct.length} distinct box-shadow values in this file (limit: ${limit}). Common AI authorship tell.`,
        fix: `Define ${Math.min(3, distinct.length)} elevation tokens (--shadow-sm, --shadow-md, --shadow-lg) and reuse.`
      }];
    }
  },

  {
    id: 'slop-002',
    name: 'too-many-radius-variants',
    severity: 'medium',
    description: 'More than 4 distinct border-radius values in a single file. Indicates undisciplined token use.',
    detect(content, ctx) {
      const radii = new Map();
      let m;
      const re = /border-radius\s*:\s*([^;]+);/gi;
      while ((m = re.exec(content)) !== null) {
        const v = m[1].trim();
        if (!radii.has(v)) radii.set(v, m.index);
      }
      // also catch tailwind variety
      const twRe = /\brounded(?:-(?:t|r|b|l|tl|tr|bl|br|x|y))?-(none|sm|md|lg|xl|2xl|3xl|full|\d+)\b/g;
      const twValues = new Set();
      while ((m = twRe.exec(content)) !== null) twValues.add(m[1]);
      const total = radii.size + twValues.size;
      const limit = (ctx.manifest && ctx.manifest.rules && ctx.manifest.rules.maxRadiusVariants) || 4;
      if (total <= limit) return [];
      const firstIdx = radii.size > 0 ? [...radii.values()][0] : 0;
      return [{
        line: lineOf(content, firstIdx),
        column: 1,
        snippet: clampSnippet([...radii.keys(), ...twValues].join(' | ')),
        message: `${total} distinct border-radius values (limit: ${limit}). Pick a small set and stick with it.`,
        fix: `Reduce to a small set: --radius-sm, --radius-md, --radius-lg, --radius-full.`
      }];
    }
  },

  {
    id: 'slop-003',
    name: 'ai-default-gradient',
    severity: 'high',
    description: 'Gradient using two or more common AI-default tailwind colors (blue-500, indigo-500, violet-500, purple-500, pink-500). The signature ChatGPT/Claude UI demo gradient.',
    detect(content, _ctx) {
      const findings = [];
      const gradientRe = /(?:bg-gradient-to-[trbl]{1,2}\s+(?:from|via|to)-[a-z]+-[0-9]{2,3}(?:[^"]*?(?:from|via|to)-[a-z]+-[0-9]{2,3})+)|(?:linear-gradient\([^)]+\))/gi;
      let m;
      while ((m = gradientRe.exec(content)) !== null) {
        const text = m[0].toLowerCase();
        const aiHits = ['blue-500', 'indigo-500', 'violet-500', 'purple-500', 'pink-500', 'fuchsia-500']
          .filter(c => text.includes(c)).length;
        let hexHits = 0;
        for (const h of COMMON_AI_DEFAULTS) {
          if (text.includes(h)) hexHits++;
        }
        if (aiHits >= 2 || hexHits >= 2) {
          findings.push({
            line: lineOf(content, m.index),
            column: columnOf(content, m.index),
            snippet: clampSnippet(m[0]),
            message: `Common AI-default gradient pattern (blue/indigo/violet/purple/pink). Used in 90% of AI-generated landing pages.`,
            fix: `Replace with brand colors. If you need a gradient, derive it from your palette tokens.`
          });
        }
      }
      return findings;
    }
  },

  {
    id: 'slop-004',
    name: 'lorem-ipsum-leftover',
    severity: 'high',
    description: 'Lorem ipsum placeholder text left in source.',
    detect(content, _ctx) {
      const findings = [];
      const re = /\b(lorem ipsum|consectetur adipiscing|dolor sit amet|sed do eiusmod)\b/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        findings.push({
          line: lineOf(content, m.index),
          column: columnOf(content, m.index),
          snippet: clampSnippet(content.slice(Math.max(0, m.index - 20), m.index + 60)),
          message: `Lorem ipsum placeholder still in source. Replace before shipping.`,
          fix: `Replace with real product copy or a meaningful placeholder labeled as such.`
        });
      }
      return findings;
    }
  },

  {
    id: 'slop-005',
    name: 'inline-styles-in-jsx',
    severity: 'low',
    description: 'Inline style={{...}} in JSX/TSX. Sometimes warranted, often a slop tell when used heavily.',
    detect(content, ctx) {
      if (!['.jsx', '.tsx'].includes(ctx.ext)) return [];
      const findings = [];
      const re = /style=\{\{[^}]+\}\}/g;
      let m;
      let count = 0;
      while ((m = re.exec(content)) !== null) {
        count++;
        if (count <= 5) {
          findings.push({
            line: lineOf(content, m.index),
            column: columnOf(content, m.index),
            snippet: clampSnippet(m[0]),
            message: `Inline style. Move to a class or token.`,
            fix: `Extract to CSS, tailwind utility, or styled component.`
          });
        }
      }
      if (count > 5) {
        findings.push({
          line: 1, column: 1, snippet: '',
          message: `${count} inline style attributes in this file. Strong slop signal.`,
          fix: `Refactor to a stylesheet or design token approach.`
        });
      }
      return findings;
    }
  },

  {
    id: 'slop-006',
    name: 'spacing-off-grid',
    severity: 'low',
    description: 'Spacing values that do not align with the project grid detected during /scan.',
    detect(content, ctx) {
      if (!ctx.manifest || !ctx.manifest.rules || !ctx.manifest.rules.spacingGrid) return [];
      const grid = ctx.manifest.rules.spacingGrid;
      const findings = [];
      const re = /(?:padding|margin|gap)(?:-(?:top|right|bottom|left|x|y|inline|block))?\s*:\s*([^;]+);/gi;
      let m;
      let count = 0;
      while ((m = re.exec(content)) !== null) {
        const inner = m[1];
        const pxRe = /(-?\d+(?:\.\d+)?)px\b/g;
        let pm;
        while ((pm = pxRe.exec(inner)) !== null) {
          const v = Math.abs(parseFloat(pm[1]));
          if (v === 0) continue;
          if (Math.abs(v - Math.round(v / grid) * grid) > 0.01) {
            count++;
            if (count <= 3) {
              findings.push({
                line: lineOf(content, m.index),
                column: 1,
                snippet: clampSnippet(m[0]),
                message: `Spacing ${v}px is off the ${grid}px grid this codebase uses.`,
                fix: `Round to ${Math.round(v / grid) * grid}px or define an exception token.`
              });
            }
          }
        }
      }
      if (count > 3) {
        findings.push({
          line: 1, column: 1, snippet: '',
          message: `${count} spacing values off the ${grid}px grid. Tighten.`,
          fix: `Run /spacing to apply your grid project-wide.`
        });
      }
      return findings;
    }
  },

  {
    id: 'slop-007',
    name: 'hardcoded-color-off-palette',
    severity: 'medium',
    description: 'Hex color in source that does not appear in the project palette detected during /scan.',
    detect(content, ctx) {
      if (!ctx.manifest || !ctx.manifest.rules || !ctx.manifest.rules.allowedColors) return [];
      const allowed = new Set(ctx.manifest.rules.allowedColors.map(c => c.toLowerCase()));
      if (allowed.size === 0) return [];
      const findings = [];
      const re = /#([0-9a-fA-F]{3,8})\b/g;
      let m;
      const offending = new Map();
      while ((m = re.exec(content)) !== null) {
        const hex = toHex(m[0]);
        if (!hex) continue;
        if (allowed.has(hex)) continue;
        if (!offending.has(hex)) offending.set(hex, m.index);
      }
      let i = 0;
      for (const [hex, idx] of offending) {
        i++;
        if (i > 3) break;
        findings.push({
          line: lineOf(content, idx),
          column: columnOf(content, idx),
          snippet: hex,
          message: `Hardcoded color ${hex} not in project palette.`,
          fix: `Use the closest palette color or extend the palette deliberately.`
        });
      }
      if (offending.size > 3) {
        findings.push({
          line: 1, column: 1, snippet: '',
          message: `${offending.size} colors used outside the project palette. Tighten the palette or extend it deliberately.`,
          fix: `Run /color to consolidate.`
        });
      }
      return findings;
    }
  },

  {
    id: 'slop-008',
    name: 'tailwind-class-bloat',
    severity: 'medium',
    description: 'A single element with more than 15 tailwind utility classes. Often a tell of AI overgeneration; also a maintainability problem.',
    detect(content, ctx) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ctx.ext)) return [];
      const findings = [];
      const re = /class(?:Name)?=(?:\{?["'`])([^"'`}]+)(?:["'`]\}?)/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        const tokens = m[1].trim().split(/\s+/).filter(Boolean);
        if (tokens.length > 15) {
          findings.push({
            line: lineOf(content, m.index),
            column: columnOf(content, m.index),
            snippet: clampSnippet(m[1]),
            message: `${tokens.length} utility classes on one element. Extract a component or use @apply.`,
            fix: `Componentize. If using shadcn, lift this into a primitive.`
          });
        }
      }
      return findings;
    }
  },

  {
    id: 'slop-009',
    name: 'missing-alt-text',
    severity: 'high',
    description: 'img tag without an alt attribute. Accessibility violation, common AI omission.',
    detect(content, ctx) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ctx.ext)) return [];
      const findings = [];
      const re = /<img\b[^>]*>/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        if (/\balt\s*=/.test(m[0])) continue;
        findings.push({
          line: lineOf(content, m.index),
          column: columnOf(content, m.index),
          snippet: clampSnippet(m[0]),
          message: `<img> without alt attribute. Required for accessibility.`,
          fix: `Add a descriptive alt, or alt="" if decorative.`
        });
      }
      return findings;
    }
  },

  {
    id: 'slop-010',
    name: 'console-log-leftover',
    severity: 'low',
    description: 'console.log/debug/info statements left in source.',
    detect(content, ctx) {
      if (!['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro'].includes(ctx.ext)) return [];
      const findings = [];
      const re = /\bconsole\.(log|debug|info|warn)\b/g;
      let m;
      let count = 0;
      while ((m = re.exec(content)) !== null) {
        count++;
        if (count <= 3) {
          findings.push({
            line: lineOf(content, m.index),
            column: columnOf(content, m.index),
            snippet: clampSnippet(content.slice(m.index, m.index + 60)),
            message: `console.${m[1]} in source.`,
            fix: `Remove or wrap in a proper logger.`
          });
        }
      }
      if (count > 3) {
        findings.push({
          line: 1, column: 1, snippet: '',
          message: `${count} console statements in this file. Strip before shipping.`,
          fix: `Remove all, or move behind a debug flag.`
        });
      }
      return findings;
    }
  },

  {
    id: 'slop-011',
    name: 'emoji-decoration-in-heading',
    severity: 'low',
    description: 'Emoji used as decoration in headings. Common AI generation tell; rarely intentional design.',
    detect(content, ctx) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro', '.md'].includes(ctx.ext)) return [];
      const findings = [];
      const re = /<(h[1-6])\b[^>]*>([\s\S]{0,160}?)<\/\1>/gi;
      const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u;
      let m;
      while ((m = re.exec(content)) !== null) {
        if (emojiRe.test(m[2])) {
          findings.push({
            line: lineOf(content, m.index),
            column: columnOf(content, m.index),
            snippet: clampSnippet(m[0]),
            message: `Emoji in <${m[1]}>. AI-generation tell unless it's a brand element.`,
            fix: `Remove emoji or move it to an icon component with proper aria attributes.`
          });
        }
      }
      return findings;
    }
  },

  {
    id: 'slop-012',
    name: 'transition-all-everywhere',
    severity: 'medium',
    description: '`transition-all duration-200` (or similar) on many elements. AI default; transitions every property which is a perf and UX risk.',
    detect(content, ctx) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ctx.ext)) return [];
      const findings = [];
      const re = /\btransition-all\b[^"'`}]*\bduration-(150|200|300)\b/g;
      let m;
      let count = 0;
      while ((m = re.exec(content)) !== null) {
        count++;
        if (count <= 3) {
          findings.push({
            line: lineOf(content, m.index),
            column: columnOf(content, m.index),
            snippet: clampSnippet(m[0]),
            message: `\`transition-all duration-${m[1]}\` is the AI default. Specify what you actually want to animate.`,
            fix: `Use transition-colors, transition-transform, or transition-opacity with an explicit easing.`
          });
        }
      }
      if (count > 3) {
        findings.push({
          line: 1, column: 1, snippet: '',
          message: `${count} elements with the default transition-all. Pick what to animate.`,
          fix: `Replace with intentional transitions. Run /motion to apply project curves.`
        });
      }
      return findings;
    }
  }
];

function runRules(content, ctx) {
  const findings = [];
  const seen = new Set();
  for (const rule of RULES) {
    let result;
    try { result = rule.detect(content, ctx); } catch (e) { result = []; }
    for (const f of result) {
      const file = ctx.file ? path.relative(ctx.root || '.', ctx.file) : null;
      const key = `${rule.id}::${file}::${f.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        rule: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        ...f,
        file
      });
    }
  }
  return findings;
}

module.exports = { RULES, runRules };
