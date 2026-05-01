# Rerun Semantics

How `/forge` behaves when it runs against a project that already has forge-generated config.

Without explicit rerun rules the skill is one-shot only — users stop running it a second time because they don't trust it not to clobber their edits. This module defines the contract that makes rerun safe.

## The Contract

- **forge owns scaffolding.** Stack detection output, reference defaults, boilerplate hooks, standard agents.
- **you own decisions.** Project gotchas, team conventions, "we do X not Y" notes — anything forge can't infer.
- **the lockfile mediates.** It records what forge wrote last time so rerun can tell forge's content apart from your edits.

These three rules apply everywhere — CLAUDE.md, settings.json, generated skills, agents, commands.

## Region Markers (CLAUDE.md)

CLAUDE.md uses markdown comment markers to fence forge-owned blocks:

```markdown
<!-- forge:start id=stack-overview -->
Next.js 15 app, App Router, TypeScript strict, Supabase for auth + db.

Build: `pnpm build`
Dev: `pnpm dev`
Test: `pnpm test`
<!-- forge:end -->

## Project conventions

(hand-written notes — forge never touches this)

<!-- forge:start id=hooks-active -->
Active hooks:
- PostToolUse: prettier on .ts/.tsx writes
- PreToolUse: block rm -rf in protected dirs
<!-- forge:end -->
```

Rules:

- Inside markers = forge regenerates freely on rerun.
- Outside markers = forge never reads, never writes.
- Each region has a stable `id`. Forge uses ids to locate where updated content goes.
- Region order is preserved. New regions append unless a `position` hint exists.

Region ids forge generates by default: `stack-overview`, `commands-reference`, `hooks-active`, `agents-active`, `permissions-summary`, `mcp-servers`. New ids are added in MIGRATIONS as the skill evolves.

## Lockfile

Path: `.claude/.forge.lock`

Committed to git. This is forge's source of truth for what it wrote, not a cache. Losing the lockfile is treated as a fresh install (forge cannot distinguish its content from yours without it).

```json
{
  "version": 1,
  "generated_at": "2026-05-01T12:00:00Z",
  "forge_version": "1.1.0",
  "stack_signature": "nextjs15+ts+supabase+pnpm",
  "files": {
    "CLAUDE.md": {
      "regions": {
        "stack-overview": { "hash": "sha256:..." },
        "hooks-active": { "hash": "sha256:..." }
      }
    },
    ".claude/settings.json": {
      "owned_keys": ["hooks.PostToolUse", "permissions.allow", "model", "env"],
      "key_hashes": {
        "hooks.PostToolUse": "sha256:...",
        "permissions.allow": "sha256:..."
      }
    },
    ".claude/agents/code-reviewer.md": { "hash": "sha256:..." },
    ".claude/commands/fix-issue.md": { "hash": "sha256:..." }
  }
}
```

## Rerun Decision Tree

When `/forge` runs and `.claude/.forge.lock` exists:

### CLAUDE.md regions

For each region forge wants to write:

1. Read current content between markers.
2. Compute hash. Compare to lockfile.
3. **Hash matches** → user hasn't edited. Regenerate, update lockfile hash.
4. **Hash differs** → user edited inside. Surface a 3-way diff:
   - their version (current file)
   - last forge version (the previous generation, recoverable from lockfile + reference modules)
   - new forge version (what forge wants to write now)
   Prompt: keep mine / take new / abort.
5. **Region missing entirely** → user deleted it. Treat as opt-out. Do not re-add unless `--force`.
6. **New region introduced by skill update** → append at the appropriate position. Log it.

### settings.json

1. For each key in `owned_keys`:
   - Current value hash matches lockfile → regenerate.
   - Hash differs → diff prompt as above.
2. Keys not in `owned_keys` are user-owned. Never touched.
3. Skill updates introducing new owned keys → add them. Existing keys never silently change ownership.

### Skills, agents, commands

Each is a separate file. Treat as:

- File exists, hash matches lockfile → regenerate.
- File exists, hash differs → user edited, prompt.
- File missing → user deleted, opt-out (no re-create unless `--force`).
- New file forge wants to create → create, record hash.

## Modes

- `/forge` — default. Smart rerun with diff prompts on conflicts.
- `/forge --dry-run` — print every change forge would make. Write nothing.
- `/forge --force` — regenerate everything, overwrites edits. Backs up to `.forge-backup-{timestamp}/` first.
- `/forge --audit` — read-only. Reports drift between current state and what forge would generate. Answers "is my setup still good?"

## Migration

If `forge_version` in the lockfile is older than the current skill version:

1. Check `references/MIGRATIONS.md` for that version range.
2. Apply migrations before normal rerun logic runs.
3. Migrations are idempotent: rename a region id, split one region into two, deprecate a key, etc.

## What This Prevents

- Silent loss of hand-written CLAUDE.md content on rerun.
- settings.json keys reverting to defaults after the user customized them.
- The "scared to rerun" problem that kills every scaffolding tool eventually.
- Unbounded drift where forge output and project reality slowly disagree without anyone noticing.

## What This Does Not Solve

- Semantic conflicts where the user's edit and forge's new output are both valid but disagree. The diff surfaces it; the human resolves it. No automatic merge for prose.
- Lockfile loss. Without it, forge cannot distinguish its content from yours and falls back to fresh-install behavior. Commit the lockfile.

---

*Part of useForgeKit. Educational and experimental.*
