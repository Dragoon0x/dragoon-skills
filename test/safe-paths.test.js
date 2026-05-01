'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveSafe, validIdentifier, validComponentName, validTokenName, toKebab, toPascal } = require('../lib/safe-paths');

test('resolveSafe: resolves a simple relative path inside base', () => {
  const r = resolveSafe('/tmp', 'foo/bar.txt');
  assert.equal(r, path.resolve('/tmp/foo/bar.txt'));
});

test('resolveSafe: rejects ../ traversal', () => {
  assert.throws(() => resolveSafe('/tmp', '../etc/passwd'), /escapes base/);
});

test('resolveSafe: rejects deeply nested traversal', () => {
  assert.throws(() => resolveSafe('/tmp/a/b', '../../../etc'), /escapes base/);
});

test('resolveSafe: allows absolute paths only if inside base', () => {
  const r = resolveSafe('/tmp', '/tmp/sub/file');
  assert.equal(r, path.resolve('/tmp/sub/file'));
  assert.throws(() => resolveSafe('/tmp', '/etc/passwd'), /escapes base/);
});

test('resolveSafe: handles symlinks pointing outside base', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'dragoon-test-'));
  const evil = fs.mkdtempSync(path.join(os.tmpdir(), 'dragoon-evil-'));
  try {
    fs.symlinkSync(evil, path.join(base, 'link'));
    assert.throws(() => resolveSafe(base, 'link/file.txt'), /symlink/);
  } finally {
    try { fs.rmSync(base, { recursive: true, force: true }); } catch (_e) {}
    try { fs.rmSync(evil, { recursive: true, force: true }); } catch (_e) {}
  }
});

test('resolveSafe: throws on missing args', () => {
  assert.throws(() => resolveSafe(null, 'x'));
  assert.throws(() => resolveSafe('/tmp', null));
});

test('validIdentifier: accepts valid identifiers', () => {
  assert.equal(validIdentifier('foo'), true);
  assert.equal(validIdentifier('Foo'), true);
  assert.equal(validIdentifier('_x'), true);
  assert.equal(validIdentifier('foo123'), true);
});

test('validIdentifier: rejects invalid', () => {
  assert.equal(validIdentifier(''), false);
  assert.equal(validIdentifier('123foo'), false);
  assert.equal(validIdentifier('foo-bar'), false);
  assert.equal(validIdentifier('foo bar'), false);
  assert.equal(validIdentifier('class'), false); // reserved
  assert.equal(validIdentifier(null), false);
  assert.equal(validIdentifier('a'.repeat(100)), false);
});

test('validComponentName: requires PascalCase', () => {
  assert.equal(validComponentName('Card'), true);
  assert.equal(validComponentName('UserCard'), true);
  assert.equal(validComponentName('card'), false);
  assert.equal(validComponentName('userCard'), false);
});

test('validTokenName: kebab-case only', () => {
  assert.equal(validTokenName('color-primary'), true);
  assert.equal(validTokenName('shadow-sm'), true);
  assert.equal(validTokenName('Color-Primary'), false);
  assert.equal(validTokenName('color_primary'), false);
  assert.equal(validTokenName('color/primary'), false);
});

test('toKebab: converts PascalCase to kebab-case', () => {
  assert.equal(toKebab('UserCard'), 'user-card');
  assert.equal(toKebab('XMLHttpRequest'), 'xml-http-request');
  assert.equal(toKebab('Foo'), 'foo');
});

test('toPascal: converts kebab-case to PascalCase', () => {
  assert.equal(toPascal('user-card'), 'UserCard');
  assert.equal(toPascal('foo'), 'Foo');
  assert.equal(toPascal('a_b_c'), 'ABC');
});
