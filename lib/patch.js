'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { resolveSafe } = require('./safe-paths');

// safe file writer used by every build skill.
// rules:
//   - all writes are atomic (write to temp, rename)
//   - dry-run mode just records intent
//   - never overwrites existing files unless { overwrite: true }
//   - parent directories are created with mkdir -p semantics
//   - all paths must resolve inside the project root

class Patcher {
  constructor(root, { dryRun = false, overwrite = false } = {}) {
    if (!root) throw new Error('Patcher: root required');
    this.root = path.resolve(root);
    this.dryRun = dryRun;
    this.overwrite = overwrite;
    this.changes = []; // { kind, path, before, after }
  }

  // create or overwrite a file with content. returns { kind, path, before, after }
  writeFile(relPath, content) {
    const abs = resolveSafe(this.root, relPath);
    const exists = fs.existsSync(abs);
    let before = null;
    if (exists) {
      before = fs.readFileSync(abs, 'utf8');
      if (!this.overwrite && before !== content) {
        throw new Error(`refusing to overwrite existing file (use overwrite: true): ${relPath}`);
      }
    }
    const change = { kind: exists ? 'modify' : 'create', path: relPath, before, after: content };
    this.changes.push(change);
    if (!this.dryRun) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      // atomic write: temp file in same dir, rename. avoids partial writes.
      const tmp = path.join(path.dirname(abs), `.dragoon-tmp-${process.pid}-${Date.now()}-${path.basename(abs)}`);
      fs.writeFileSync(tmp, content, 'utf8');
      try {
        fs.renameSync(tmp, abs);
      } catch (e) {
        try { fs.unlinkSync(tmp); } catch (_e) { /* ignore */ }
        throw e;
      }
    }
    return change;
  }

  // append a chunk to a file, creating it if needed. preserves existing content.
  appendFile(relPath, chunk) {
    const abs = resolveSafe(this.root, relPath);
    const before = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    const sep = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const after = before + sep + chunk;
    return this.writeFileForce(relPath, after, before);
  }

  // internal: write without overwrite-protection (used by appendFile).
  writeFileForce(relPath, content, beforeOverride) {
    const abs = resolveSafe(this.root, relPath);
    const exists = fs.existsSync(abs);
    const before = beforeOverride !== undefined
      ? beforeOverride
      : (exists ? fs.readFileSync(abs, 'utf8') : null);
    const change = { kind: exists ? 'modify' : 'create', path: relPath, before, after: content };
    this.changes.push(change);
    if (!this.dryRun) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const tmp = path.join(path.dirname(abs), `.dragoon-tmp-${process.pid}-${Date.now()}-${path.basename(abs)}`);
      fs.writeFileSync(tmp, content, 'utf8');
      try { fs.renameSync(tmp, abs); }
      catch (e) {
        try { fs.unlinkSync(tmp); } catch (_e) { /* ignore */ }
        throw e;
      }
    }
    return change;
  }

  summary() {
    const created = this.changes.filter(c => c.kind === 'create').length;
    const modified = this.changes.filter(c => c.kind === 'modify').length;
    return { created, modified, total: this.changes.length };
  }

  // a small unified-diff renderer for the cli. not perfect, just useful.
  diff(change) {
    const before = change.before == null ? '' : change.before;
    const after = change.after;
    const out = [`--- ${change.path} (${change.kind === 'create' ? 'new' : 'before'})`,
                 `+++ ${change.path} (${change.kind === 'create' ? 'create' : 'after'})`];
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    if (change.kind === 'create') {
      for (const l of afterLines) out.push('+ ' + l);
    } else {
      const max = Math.max(beforeLines.length, afterLines.length);
      for (let i = 0; i < max; i++) {
        const b = beforeLines[i];
        const a = afterLines[i];
        if (b === a) continue;
        if (b !== undefined) out.push('- ' + b);
        if (a !== undefined) out.push('+ ' + a);
      }
    }
    return out.join('\n');
  }
}

module.exports = { Patcher };
