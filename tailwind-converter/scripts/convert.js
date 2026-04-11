#!/usr/bin/env node
const MAPPING = {
  'display: flex': 'flex', 'display: grid': 'grid', 'display: block': 'block',
  'display: none': 'hidden', 'display: inline': 'inline', 'display: inline-flex': 'inline-flex',
  'flex-direction: column': 'flex-col', 'flex-direction: row': 'flex-row',
  'align-items: center': 'items-center', 'align-items: start': 'items-start',
  'align-items: end': 'items-end', 'align-items: stretch': 'items-stretch',
  'justify-content: center': 'justify-center', 'justify-content: space-between': 'justify-between',
  'justify-content: flex-start': 'justify-start', 'justify-content: flex-end': 'justify-end',
  'text-align: center': 'text-center', 'text-align: left': 'text-left', 'text-align: right': 'text-right',
  'font-weight: 700': 'font-bold', 'font-weight: 600': 'font-semibold', 'font-weight: 500': 'font-medium',
  'font-weight: 400': 'font-normal', 'font-weight: 300': 'font-light',
  'position: relative': 'relative', 'position: absolute': 'absolute', 'position: fixed': 'fixed',
  'position: sticky': 'sticky', 'overflow: hidden': 'overflow-hidden', 'overflow: auto': 'overflow-auto',
  'cursor: pointer': 'cursor-pointer', 'cursor: not-allowed': 'cursor-not-allowed',
  'pointer-events: none': 'pointer-events-none',
};

const SPACING_MAP = { '0': '0', '4': '1', '8': '2', '12': '3', '16': '4', '20': '5', '24': '6', '32': '8', '40': '10', '48': '12', '64': '16' };

function convertSpacing(prop, value) {
  const px = value.replace('px', '').trim();
  const tw = SPACING_MAP[px] || px;
  const prefixes = { 'margin': 'm', 'margin-top': 'mt', 'margin-right': 'mr', 'margin-bottom': 'mb', 'margin-left': 'ml',
    'padding': 'p', 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl', 'gap': 'gap' };
  const prefix = prefixes[prop] || prop;
  return `${prefix}-${tw}`;
}

const input = process.argv[2];
if (!input) { console.log('Usage: node convert.js "display: flex; align-items: center; padding: 16px;"'); process.exit(0); }

const declarations = input.split(';').map(d => d.trim()).filter(Boolean);
const classes = [];

declarations.forEach(decl => {
  const clean = decl.replace(/\s+/g, ' ').trim();
  if (MAPPING[clean]) { classes.push(MAPPING[clean]); return; }
  const [prop, val] = clean.split(':').map(s => s.trim());
  if (/^(margin|padding|gap)/.test(prop) && val.endsWith('px')) {
    classes.push(convertSpacing(prop, val));
  } else {
    classes.push(`/* ${clean} */`);
  }
});

console.log(`\nCSS: ${input}\n\nTailwind: className="${classes.join(' ')}"`);
