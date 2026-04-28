'use strict';

const path = require('path');
const fs = require('fs');

// security-critical helpers for any skill that writes files.
// every write must go through resolveSafe() to prevent path traversal.

// resolve a target path inside a base. throws if the resolved path escapes base.
// also rejects symlinks pointing outside base.
//
// implementation notes:
// the comparison must be realpath-to-realpath, otherwise macOS systems where
// /tmp symlinks to /private/tmp false-reject every legitimate write under /tmp.
// the same applies to any user whose project lives under a symlinked path
// (e.g. /Users/x/Code -> /Volumes/SSD/Code).
//
// strategy: compute the EFFECTIVE realpath of absTarget by walking up to the
// deepest existing ancestor, taking its realpath, and re-appending the
// not-yet-existing tail. then compare against the realpath of the base.
function resolveSafe(base, target) {
  if (!base || !target) throw new Error('resolveSafe: base and target required');
  const absBase = path.resolve(base);
  const absTarget = path.resolve(absBase, target);

  // 1. lexical check (cheap, catches obvious '../' style escapes)
  if (!absTarget.startsWith(absBase + path.sep) && absTarget !== absBase) {
    throw new Error(`path escapes base: ${target}`);
  }

  // 2. realpath the base. fall back to the lexical path if base doesn't exist yet.
  let realBase;
  try { realBase = fs.realpathSync(absBase); }
  catch (_e) { realBase = absBase; }

  // 3. compute the realpath that absTarget WOULD have. walk up to the deepest
  //    existing ancestor, realpath it, then re-attach the missing tail.
  let resolvedTarget = absTarget;
  let suffix = '';
  let cursor = absTarget;
  while (cursor !== path.dirname(cursor)) {
    if (fs.existsSync(cursor)) {
      let realCursor;
      try { realCursor = fs.realpathSync(cursor); }
      catch (_e) { realCursor = cursor; }
      resolvedTarget = suffix ? path.join(realCursor, suffix) : realCursor;
      break;
    }
    suffix = suffix ? path.join(path.basename(cursor), suffix) : path.basename(cursor);
    cursor = path.dirname(cursor);
  }

  // 4. final check: the effective realpath must be inside the real base.
  if (resolvedTarget !== realBase && !resolvedTarget.startsWith(realBase + path.sep)) {
    throw new Error(`path resolves through symlink outside base: ${target}`);
  }

  return absTarget;
}

// validate a component or token name. rejects anything that could be a path,
// shell metacharacter, or reserved js identifier collider.
const RESERVED = new Set([
  'function', 'return', 'class', 'const', 'let', 'var', 'if', 'else',
  'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
  'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof',
  'in', 'of', 'this', 'super', 'extends', 'static', 'import', 'export',
  'from', 'as', 'async', 'await', 'yield', 'true', 'false', 'null',
  'undefined', 'void'
]);

function validIdentifier(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length > 64) return false;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return false;
  if (RESERVED.has(name)) return false;
  return true;
}

function validComponentName(name) {
  // component names must be PascalCase and a valid identifier
  if (!validIdentifier(name)) return false;
  return /^[A-Z]/.test(name);
}

function validTokenName(name) {
  // tokens are kebab-case or alphanumeric, no slashes
  if (!name || typeof name !== 'string') return false;
  if (name.length > 64) return false;
  return /^[a-z][a-z0-9-]*$/.test(name);
}

// kebab-case a name safely. used when deriving file names from component names.
function toKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function toPascal(name) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join('');
}

module.exports = { resolveSafe, validIdentifier, validComponentName, validTokenName, toKebab, toPascal };
