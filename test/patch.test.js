'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Patcher } = require('../lib/patch');

function withTmp(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dragoon-patch-'));
  try { return fn(tmp); }
  finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_e) {} }
}

test('Patcher: writes a file in dry-run mode without touching disk', () => {
  withTmp(tmp => {
    const p = new Patcher(tmp, { dryRun: true });
    const c = p.writeFile('foo/bar.txt', 'hello');
    assert.equal(c.kind, 'create');
    assert.equal(c.path, 'foo/bar.txt');
    assert.equal(c.after, 'hello');
    assert.equal(fs.existsSync(path.join(tmp, 'foo/bar.txt')), false);
  });
});

test('Patcher: actually writes when dry-run is false', () => {
  withTmp(tmp => {
    const p = new Patcher(tmp);
    p.writeFile('a/b.txt', 'data');
    assert.equal(fs.readFileSync(path.join(tmp, 'a/b.txt'), 'utf8'), 'data');
  });
});

test('Patcher: refuses to overwrite without flag', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'x.txt'), 'old');
    const p = new Patcher(tmp);
    assert.throws(() => p.writeFile('x.txt', 'new'), /refusing to overwrite/);
  });
});

test('Patcher: overwrites with flag', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'x.txt'), 'old');
    const p = new Patcher(tmp, { overwrite: true });
    p.writeFile('x.txt', 'new');
    assert.equal(fs.readFileSync(path.join(tmp, 'x.txt'), 'utf8'), 'new');
  });
});

test('Patcher: writeFile is idempotent if content matches', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'x.txt'), 'same');
    const p = new Patcher(tmp); // no overwrite flag, but content matches
    p.writeFile('x.txt', 'same'); // should not throw
    assert.equal(fs.readFileSync(path.join(tmp, 'x.txt'), 'utf8'), 'same');
  });
});

test('Patcher: appendFile preserves existing content', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'log.txt'), 'line1');
    const p = new Patcher(tmp);
    p.appendFile('log.txt', 'line2');
    assert.equal(fs.readFileSync(path.join(tmp, 'log.txt'), 'utf8'), 'line1\nline2');
  });
});

test('Patcher: rejects path traversal', () => {
  withTmp(tmp => {
    const p = new Patcher(tmp);
    assert.throws(() => p.writeFile('../escape.txt', 'x'));
  });
});

test('Patcher: summary counts changes', () => {
  withTmp(tmp => {
    fs.writeFileSync(path.join(tmp, 'existing.txt'), 'old');
    const p = new Patcher(tmp, { overwrite: true });
    p.writeFile('new1.txt', 'a');
    p.writeFile('new2.txt', 'b');
    p.writeFile('existing.txt', 'updated');
    const s = p.summary();
    assert.equal(s.created, 2);
    assert.equal(s.modified, 1);
    assert.equal(s.total, 3);
  });
});

test('Patcher: diff shows + lines for create', () => {
  withTmp(tmp => {
    const p = new Patcher(tmp, { dryRun: true });
    const c = p.writeFile('x.txt', 'a\nb\nc');
    const d = p.diff(c);
    assert.match(d, /\+ a/);
    assert.match(d, /\+ b/);
    assert.match(d, /\+ c/);
  });
});

test('Patcher: atomic write does not leave temp files on success', () => {
  withTmp(tmp => {
    const p = new Patcher(tmp);
    p.writeFile('x.txt', 'data');
    const stragglers = fs.readdirSync(tmp).filter(f => f.startsWith('.dragoon-tmp'));
    assert.equal(stragglers.length, 0);
  });
});
