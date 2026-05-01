# useForgeKit

> **Disclaimer:** Educational and experimental. DYOR. See [DISCLAIMER.md](DISCLAIMER.md).

**The definitive Claude Code setup skill.** Install it once. Run `/forge`. Get a
complete, tailored configuration for your specific project: CLAUDE.md, settings.json,
skills, hooks, agents, and commands — all generated from your actual codebase.

Every other setup resource is a guide you READ. This is a skill Claude EXECUTES — and safely re-executes.

## Install

```
git clone https://github.com/Dragoon0x/useforgekit.git ~/.claude/skills/useforgekit
```

## Usage

```
/forge
```

Claude detects your stack, asks a few questions if needed, and generates everything.

Run it again later — forge tracks what it wrote in a lockfile and surfaces a diff instead of clobbering your edits. See [RERUN-SEMANTICS](references/RERUN-SEMANTICS.md) for the full contract.

## What It Generates

- **CLAUDE.md** — Project context, conventions, gotchas (< 200 lines, tailored to your stack)
- **settings.json** — Permissions, hooks, model selection, thinking mode
- **.forge.lock** — Tracks what forge wrote so rerun is safe (commit this)
- **Skills** — Domain-specific knowledge for your frameworks and patterns
- **Hooks** — Auto-format, branch protection, destructive command blocking
- **Agents** — Code reviewer (read-only), test generator, doc writer
- **Commands** — /fix-issue, /create-pr, /review, /deploy, /onboard

## Modes

- `/forge` — default, smart rerun with diff prompts on conflicts
- `/forge --dry-run` — show every change, write nothing
- `/forge --force` — regenerate everything (backs up first)
- `/forge --audit` — read-only drift report

## Reference Modules

| Module | What It Covers |
| --- | --- |
| CLAUDE-MD.md | How to write CLAUDE.md: structure, sizing, anti-patterns, per-stack templates |
| SETTINGS.md | Every settings.json field: permissions, hooks, model, tokens, effort |
| SKILLS-ARCHITECTURE.md | Skill anatomy, frontmatter, progressive disclosure, categories |
| HOOKS.md | All hook events, matchers, output protocol, per-language auto-formatters |
| AGENTS.md | Agent anatomy, frontmatter, essential agents, Agent() invocation |
| COMMANDS.md | Command anatomy, $ARGUMENTS, essential commands |
| RERUN-SEMANTICS.md | Region markers, lockfile schema, rerun decision tree, audit mode |
| DECISION-TREE.md | What goes in CLAUDE.md vs skill vs agent vs command vs hook vs rule |
| CONTEXT-WINDOW.md | Token costs, budget management, compaction strategy |
| ANTI-PATTERNS.md | 30 enumerated anti-patterns with symptoms and fixes |
| PROJECT-TEMPLATES.md | Stack-specific configs: TypeScript, Python, Next.js, Rust, Go |
| WORKFLOWS.md | Standard dev loop, feature dev, bug fix, review, refactoring, debugging |
| GIT-STRATEGY.md | What to commit, .gitignore additions, branch strategy |
| PERFORMANCE.md | Speed tips, token efficiency, model selection by task |
| PERMISSIONS.md | Permission spectrum, recommended strategies, per-agent permissions |
| MCP-GUIDE.md | Essential MCP servers, configuration, MCP vs CLI, MCP in agents |
| TEAM-SETUP.md | Multi-developer config, onboarding, conflict resolution |
| TROUBLESHOOTING.md | Common issues with causes and fixes, /doctor |
| HEALTH-CHECK.md | 30-item validation checklist with verification commands |

## License

MIT — see [LICENSE](LICENSE).

---

**By [Dragoon0x](https://github.com/Dragoon0x). Zero dependencies. Educational and experimental.**
