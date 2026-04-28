'use strict';

// minimal template renderer. interpolates {{ key }} and {{ key | helper }}.
// no eval, no expression evaluation, no template injection vulnerability.
// the only logic supported is simple key lookup and registered helpers.

const HELPERS = {
  upper: s => String(s).toUpperCase(),
  lower: s => String(s).toLowerCase(),
  json: v => JSON.stringify(v),
  jsonp: v => JSON.stringify(v, null, 2),
  // escape a value for safe insertion into a JS string literal (single-quote)
  jsstr: s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n'),
  // escape for HTML attribute (double-quote)
  htmlattr: s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'),
  // identity (the default)
  raw: s => String(s == null ? '' : s)
};

function render(template, ctx) {
  if (typeof template !== 'string') throw new Error('render: template must be a string');
  if (!ctx || typeof ctx !== 'object') ctx = {};
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*(?:\|\s*([a-zA-Z_]+))?\s*\}\}/g, (_, key, helperName) => {
    const value = lookup(ctx, key);
    const helper = HELPERS[helperName || 'raw'];
    if (!helper) throw new Error(`render: unknown helper "${helperName}"`);
    return helper(value);
  });
}

function lookup(ctx, key) {
  const parts = key.split('.');
  let cur = ctx;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

module.exports = { render, HELPERS };
