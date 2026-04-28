'use strict';

// accessibility engine. file-by-file rules with line locations, like slop.
// these go beyond what /critique aggregates and operate per-element.

const path = require('path');
const { contrast, toHex } = require('./colors');

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) if (content[i] === '\n') line++;
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
function clip(s, max = 80) {
  const cleaned = s.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1) + '…' : cleaned;
}

const RULES = [
  {
    id: 'a11y-001',
    name: 'img-missing-alt',
    severity: 'high',
    description: 'img element without alt attribute.',
    detect(content, ext) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /<img\b[^>]*>/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        if (/\balt\s*=/.test(m[0])) continue;
        out.push({
          line: lineOf(content, m.index), column: columnOf(content, m.index),
          snippet: clip(m[0]),
          message: '<img> without alt. Required for screen readers.',
          fix: 'Add a descriptive alt, or alt="" if purely decorative.'
        });
      }
      return out;
    }
  },
  {
    id: 'a11y-002',
    name: 'button-without-label',
    severity: 'high',
    description: 'button element with no text content and no aria-label.',
    detect(content, ext) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        const attrs = m[1];
        const inner = m[2];
        const hasAria = /\baria-label\s*=/.test(attrs) || /\baria-labelledby\s*=/.test(attrs);
        const hasTitle = /\btitle\s*=\s*["']([^"']+)["']/.test(attrs);
        const text = inner.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '').trim();
        if (!hasAria && !hasTitle && text.length === 0) {
          out.push({
            line: lineOf(content, m.index), column: columnOf(content, m.index),
            snippet: clip(m[0]),
            message: 'Button with no accessible name (no text, no aria-label).',
            fix: 'Add visible text, or aria-label="..." for icon-only buttons.'
          });
        }
      }
      return out;
    }
  },
  {
    id: 'a11y-003',
    name: 'link-without-text',
    severity: 'high',
    description: 'anchor with no text content and no aria-label.',
    detect(content, ext) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        const attrs = m[1];
        const inner = m[2];
        const hasAria = /\baria-label\s*=/.test(attrs);
        const text = inner.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '').trim();
        if (!hasAria && text.length === 0) {
          out.push({
            line: lineOf(content, m.index), column: columnOf(content, m.index),
            snippet: clip(m[0]),
            message: 'Link with no text and no aria-label. Screen readers will announce nothing.',
            fix: 'Add link text, or aria-label="..." for icon-only links.'
          });
        }
      }
      return out;
    }
  },
  {
    id: 'a11y-004',
    name: 'input-without-label',
    severity: 'high',
    description: 'input element without an associated label, aria-label, or aria-labelledby.',
    detect(content, ext) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /<input\b([^>]*)\/?>/gi;
      let m;
      // collect htmlFor / for refs from labels in same file as a soft positive signal
      const labelFor = new Set();
      const labelRe = /<label\b[^>]*\b(?:htmlFor|for)\s*=\s*["']([^"']+)["']/gi;
      let lm;
      while ((lm = labelRe.exec(content)) !== null) labelFor.add(lm[1]);
      while ((m = re.exec(content)) !== null) {
        const attrs = m[1];
        // skip hidden / submit / reset / button / image inputs without need for label
        const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/);
        const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';
        if (['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) continue;
        const hasAria = /\baria-label\s*=/.test(attrs) || /\baria-labelledby\s*=/.test(attrs);
        const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/);
        const id = idMatch ? idMatch[1] : null;
        const hasLabel = id && labelFor.has(id);
        if (!hasAria && !hasLabel) {
          out.push({
            line: lineOf(content, m.index), column: columnOf(content, m.index),
            snippet: clip(m[0]),
            message: 'Input without a label, aria-label, or aria-labelledby.',
            fix: 'Wrap with a <label>, set aria-label, or use aria-labelledby pointing to a visible label.'
          });
        }
      }
      return out;
    }
  },
  {
    id: 'a11y-005',
    name: 'positive-tabindex',
    severity: 'medium',
    description: 'tabindex greater than 0 disrupts the natural tab order.',
    detect(content, ext) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /\btabIndex\s*=\s*\{?["']?(\d+)["']?\}?/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        const v = parseInt(m[1], 10);
        if (v > 0) {
          out.push({
            line: lineOf(content, m.index), column: columnOf(content, m.index),
            snippet: clip(m[0]),
            message: `tabIndex=${v} disrupts the natural tab order.`,
            fix: 'Use tabIndex=0 (focusable in order) or tabIndex=-1 (programmatic focus only).'
          });
        }
      }
      return out;
    }
  },
  {
    id: 'a11y-006',
    name: 'click-handler-on-non-interactive',
    severity: 'medium',
    description: 'div or span with onClick but no role or keyboard handler.',
    detect(content, ext) {
      if (!['.jsx', '.tsx'].includes(ext)) return [];
      const out = [];
      const re = /<(div|span)\b([^>]*\bonClick\s*=[^>]*)>/gi;
      let m;
      while ((m = re.exec(content)) !== null) {
        const attrs = m[2];
        const hasRole = /\brole\s*=/.test(attrs);
        const hasKey = /\bonKey(?:Down|Up|Press)\s*=/.test(attrs);
        if (!hasRole || !hasKey) {
          out.push({
            line: lineOf(content, m.index), column: columnOf(content, m.index),
            snippet: clip(m[0]),
            message: `<${m[1]}> with onClick should be a <button>, or have role="button" and keyboard handlers.`,
            fix: 'Use <button> for actions. If you must use a div, add role="button" + onKeyDown.'
          });
        }
      }
      return out;
    }
  },
  {
    id: 'a11y-007',
    name: 'autofocus',
    severity: 'low',
    description: 'autofocus disorients screen reader users on page load.',
    detect(content, ext) {
      if (!['.jsx', '.tsx', '.html', '.htm', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const out = [];
      const re = /\bautoFocus\b|\bautofocus\s*(?:=|\s|\/?>)/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        out.push({
          line: lineOf(content, m.index), column: columnOf(content, m.index),
          snippet: clip(content.slice(Math.max(0, m.index - 20), m.index + 30)),
          message: 'autofocus skips users past page context. Use sparingly.',
          fix: 'Remove unless absolutely needed (e.g., search-only modal where focus is the entire intent).'
        });
      }
      return out;
    }
  },
  {
    id: 'a11y-008',
    name: 'low-contrast-token-pair',
    severity: 'medium',
    description: 'CSS rule pairs a foreground and background where the contrast ratio is below WCAG AA (4.5:1).',
    detect(content, ext) {
      if (!['.css', '.scss', '.sass'].includes(ext)) return [];
      const out = [];
      // very simple: find rules with both color: and background[-color]:; check contrast
      const ruleRe = /([^{}]+)\{([^{}]+)\}/g;
      let m;
      while ((m = ruleRe.exec(content)) !== null) {
        const body = m[2];
        const colorMatch = body.match(/(?:^|;)\s*color\s*:\s*([^;]+);/);
        const bgMatch = body.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+);/);
        if (!colorMatch || !bgMatch) continue;
        const fg = toHex(colorMatch[1].trim());
        const bg = toHex(bgMatch[1].trim());
        if (!fg || !bg) continue;
        const ratio = contrast(fg, bg);
        if (ratio < 4.5) {
          out.push({
            line: lineOf(content, m.index), column: 1,
            snippet: clip(`${m[1].trim()} { color:${fg}; background:${bg}; }`, 100),
            message: `Color ${fg} on ${bg} = ${ratio.toFixed(2)}:1 (below WCAG AA of 4.5:1).`,
            fix: `Darken the foreground or lighten the background until ratio >= 4.5.`
          });
        }
      }
      return out;
    }
  }
];

function runA11y(content, ext) {
  const findings = [];
  const seen = new Set();
  for (const rule of RULES) {
    let result;
    try { result = rule.detect(content, ext); } catch (_e) { result = []; }
    for (const f of result) {
      const key = `${rule.id}::${f.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        rule: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        ...f
      });
    }
  }
  return findings;
}

module.exports = { RULES, runA11y };
