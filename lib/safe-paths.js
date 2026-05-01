'use strict';

const path = require('path');
const fs = require('fs');

// security-critical helpers for any skill that writes files.
// every write must go through resolveSafe() to prevent path traversal.

// resolve a target path inside a base. throws if the resolved path escapes base.
// also rejects symlinks pointing outside base.
function resolveSafe(base, target) {
  if (!base || !target) throw new Error('resolveSafe: base and target required');
  const absBase = path.resolve(base);
  const absTarget = path.resolve(absBase, target);
  // string check first (cheap)
  if (!absTarget.startsWith(absBase + path.sep) && absTarget !== absBase) {
    throw new Error(`path escapes base: ${target}`);
  }
  // symlink check on parent if it exists
  let cursor = path.dirname(absTarget);
  while (cursor.length >= absBase.length && cursor !== path.dirname(cursor)) {
    if (fs.existsSync(cursor)) {
      const real = fs.realpathSync(cursor);
      if (!real.startsWith(absBase) && real !== absBase) {
        throw new Error(`path resolves through symlink outside base: ${target}`);
      }
      break;
    }
    cursor = path.dirname(cursor);
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
