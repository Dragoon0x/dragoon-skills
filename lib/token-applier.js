'use strict';

// generates token files (CSS variables, tailwind config snippet, JS module)
// for the four token categories: typography, color, spacing, motion.
// every generator returns the same shape: [{ relPath, content }, ...]
//
// the user picks the format with --format css|tailwind|js (auto-detected from stack).

const path = require('path');

// ---------- type scale ----------

function generateTypeScale({ manifest, format, dir = 'src/styles' }) {
  const t = manifest.tokens.type || {};
  const ratio = (manifest.rules && manifest.rules.typeScaleRatio) || t.inferredScaleRatio || 1.25;
  const family = (t.fontFamilies && t.fontFamilies[0] && t.fontFamilies[0].value) || 'Inter';
  // Build a 9-step scale anchored at 16px
  const steps = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  const baseIdx = 2;
  const sizes = steps.map((label, i) => {
    const exponent = i - baseIdx;
    const px = Math.round(16 * Math.pow(ratio, exponent) * 100) / 100;
    return { label, px };
  });

  if (format === 'tailwind') {
    const lines = sizes.map(s => `      '${s.label}': '${s.px}px',`).join('\n');
    const content = `// dragoon: type scale (ratio ${ratio})
module.exports = {
  theme: {
    extend: {
      fontFamily: { sans: ['${family}', 'system-ui', 'sans-serif'] },
      fontSize: {
${lines}
      }
    }
  }
};
`;
    return [{ relPath: `${dir}/tokens.type.tailwind.cjs`, content }];
  }

  if (format === 'js') {
    const obj = sizes.reduce((acc, s) => { acc[s.label] = `${s.px}px`; return acc; }, {});
    const content = `// dragoon: type scale (ratio ${ratio})
export const fontFamily = { sans: '${family}, system-ui, sans-serif' };
export const fontSize = ${JSON.stringify(obj, null, 2)};
`;
    return [{ relPath: `${dir}/tokens.type.js`, content }];
  }

  // default: CSS variables
  const cssLines = sizes.map(s => `  --font-size-${s.label}: ${s.px}px;`).join('\n');
  const content = `:root {
  /* dragoon: type scale (ratio ${ratio}) */
  --font-family-sans: '${family}', system-ui, sans-serif;
${cssLines}
}
`;
  return [{ relPath: `${dir}/tokens.type.css`, content }];
}

// ---------- color palette ----------

function generateColorPalette({ manifest, format, dir = 'src/styles' }) {
  const palette = (manifest.tokens.color && manifest.tokens.color.palette) || [];
  // pick top 8 with role hints, fall back to numeric naming
  const top = palette.slice(0, 8);
  const tokens = top.map((p, i) => {
    const role = p.role && p.role !== 'unknown' ? p.role : `color-${i + 1}`;
    return { name: role, value: p.value };
  });
  // ensure unique names by suffixing duplicates
  const seen = new Map();
  for (const t of tokens) {
    if (seen.has(t.name)) {
      seen.set(t.name, seen.get(t.name) + 1);
      t.name = `${t.name}-${seen.get(t.name)}`;
    } else {
      seen.set(t.name, 1);
    }
  }

  if (format === 'tailwind') {
    const lines = tokens.map(t => `      '${t.name}': '${t.value}',`).join('\n');
    const content = `// dragoon: color palette
module.exports = {
  theme: {
    extend: {
      colors: {
${lines}
      }
    }
  }
};
`;
    return [{ relPath: `${dir}/tokens.color.tailwind.cjs`, content }];
  }

  if (format === 'js') {
    const obj = tokens.reduce((acc, t) => { acc[t.name] = t.value; return acc; }, {});
    const content = `// dragoon: color palette
export const colors = ${JSON.stringify(obj, null, 2)};
`;
    return [{ relPath: `${dir}/tokens.color.js`, content }];
  }

  const cssLines = tokens.map(t => `  --color-${t.name}: ${t.value};`).join('\n');
  const content = `:root {
  /* dragoon: color palette */
${cssLines}
}
`;
  return [{ relPath: `${dir}/tokens.color.css`, content }];
}

// ---------- spacing scale ----------

function generateSpacingScale({ manifest, format, dir = 'src/styles' }) {
  const grid = (manifest.rules && manifest.rules.spacingGrid) || 8;
  // build a t-shirt scale anchored at the grid
  const steps = [
    { label: 'xs', mult: 0.5 },
    { label: 'sm', mult: 1 },
    { label: 'md', mult: 2 },
    { label: 'lg', mult: 3 },
    { label: 'xl', mult: 4 },
    { label: '2xl', mult: 6 },
    { label: '3xl', mult: 8 },
    { label: '4xl', mult: 12 }
  ];
  const sizes = steps.map(s => ({ label: s.label, px: Math.round(grid * s.mult * 100) / 100 }));

  if (format === 'tailwind') {
    const lines = sizes.map(s => `      '${s.label}': '${s.px}px',`).join('\n');
    const content = `// dragoon: spacing scale (base ${grid}px)
module.exports = {
  theme: {
    extend: {
      spacing: {
${lines}
      }
    }
  }
};
`;
    return [{ relPath: `${dir}/tokens.spacing.tailwind.cjs`, content }];
  }

  if (format === 'js') {
    const obj = sizes.reduce((acc, s) => { acc[s.label] = `${s.px}px`; return acc; }, {});
    const content = `// dragoon: spacing scale (base ${grid}px)
export const spacing = ${JSON.stringify(obj, null, 2)};
`;
    return [{ relPath: `${dir}/tokens.spacing.js`, content }];
  }

  const cssLines = sizes.map(s => `  --space-${s.label}: ${s.px}px;`).join('\n');
  const content = `:root {
  /* dragoon: spacing scale (base ${grid}px) */
${cssLines}
}
`;
  return [{ relPath: `${dir}/tokens.spacing.css`, content }];
}

// ---------- motion ----------

function generateMotionTokens({ manifest, format, dir = 'src/styles' }) {
  const motion = manifest.tokens.motion || {};
  // existing durations/easings, otherwise sensible defaults
  const detected = (motion.durations || []).map(d => d.ms).filter(Number.isFinite);
  const durations = {
    fast: pickClosest(detected, 150) || 150,
    normal: pickClosest(detected, 250) || 250,
    slow: pickClosest(detected, 400) || 400
  };
  const easingsList = (motion.easings || []).map(e => e.value).filter(Boolean);
  const easings = {
    standard: easingsList.find(e => e.includes('cubic-bezier')) || 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)'
  };

  if (format === 'tailwind') {
    const dlines = Object.entries(durations).map(([k, v]) => `      '${k}': '${v}ms',`).join('\n');
    const elines = Object.entries(easings).map(([k, v]) => `      '${k}': '${v}',`).join('\n');
    const content = `// dragoon: motion tokens
module.exports = {
  theme: {
    extend: {
      transitionDuration: {
${dlines}
      },
      transitionTimingFunction: {
${elines}
      }
    }
  }
};
`;
    return [{ relPath: `${dir}/tokens.motion.tailwind.cjs`, content }];
  }

  if (format === 'js') {
    const content = `// dragoon: motion tokens
export const duration = ${JSON.stringify(Object.fromEntries(Object.entries(durations).map(([k, v]) => [k, `${v}ms`])), null, 2)};
export const easing = ${JSON.stringify(easings, null, 2)};
`;
    return [{ relPath: `${dir}/tokens.motion.js`, content }];
  }

  const dlines = Object.entries(durations).map(([k, v]) => `  --duration-${k}: ${v}ms;`).join('\n');
  const elines = Object.entries(easings).map(([k, v]) => `  --easing-${k}: ${v};`).join('\n');
  const content = `:root {
  /* dragoon: motion tokens */
${dlines}
${elines}
}
`;
  return [{ relPath: `${dir}/tokens.motion.css`, content }];
}

function pickClosest(list, target) {
  if (!list || list.length === 0) return null;
  let best = list[0];
  let bestDiff = Math.abs(list[0] - target);
  for (const v of list) {
    const d = Math.abs(v - target);
    if (d < bestDiff) { best = v; bestDiff = d; }
  }
  return best;
}

// pick a default format from stack
function defaultFormat(stack) {
  if (!stack) return 'css';
  if ((stack.styling || []).includes('tailwind')) return 'tailwind';
  if (stack.framework === 'react' || stack.framework === 'next' || stack.framework === 'vue') {
    if (stack.language === 'typescript' || stack.language === 'javascript') return 'js';
  }
  return 'css';
}

module.exports = {
  generateTypeScale,
  generateColorPalette,
  generateSpacingScale,
  generateMotionTokens,
  defaultFormat
};
