# dragoon

design intelligence for ai coding agents

dragoon teaches your coding agent what good design looks like in your specific codebase, then keeps it on track from idea to ship to retro. it scans your repo, scores design quality 0-100, catches the patterns that betray ai authorship, scaffolds components in your codebase's actual style, generates plans, gates pull requests, sets up your test harness, watches your deployed urls, tracks quality over time, and lets you extend the pack with your own skills.

thirty-six commands. zero npm dependencies. node 18+ and you're done.

## install

one line, multi-host:

```bash
git clone https://github.com/dragoon0x/dragoon-skills.git
cd dragoon-skills
./setup
```

setup auto-detects every coding agent on your machine: claude-code, codex, cursor, opencode, factory, kiro. installs once, works everywhere.

requirements: node 18+. that's it. zero npm packages, zero browsers, zero network calls.

## the sprint

dragoon isn't a linter. it's the full sprint, from "should we build this" to "did this week ship".

```
recon      scan, map, research, inventory
review     slop, critique, review, investigate, second-opinion
build      component, typography, color, spacing, motion
plan       brief, plan-eng, plan-design, autoplan
ship       ship, handoff, docs, land, canary, storybook
test       qa, accessibility, perf, diff
reflect    retro, memory, benchmark
power      forge, sync, tailwind, careful, freeze
```

every command writes to `dragoon.json` or reads from it. that one file is the contract that ties everything together. once you `dragoon scan`, every other command knows your stack, your tokens, your design dna.

## the demo

same prompt, same agent, two outputs.

before dragoon:
```
$ ai-agent "build a card component for our app"

# generated:
<div className="bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500
                rounded-2xl shadow-xl p-8 transition-all duration-200">
  <h2>🚀 Welcome</h2>
  <img src="/hero.jpg" />
  <p>Lorem ipsum dolor sit amet...</p>
</div>
```

after dragoon (after `dragoon scan`):
```
$ dragoon component Card --apply

# generated, in the codebase's actual style:
<div className={`p-2 rounded-lg ${className}`}>
  {children}
</div>
```

the agent now has reference points: your shadow tokens, your radius scale, your spacing grid, your motion curves, your accessibility patterns. the slop is gone.

## quick start

```bash
cd your-project
dragoon scan                # writes dragoon.json
dragoon critique            # see your design score
dragoon slop                # find ai-generated patterns to fix
dragoon component Card --apply
dragoon ship                # pre-PR checks before push
```

## the thirty-six commands

### recon

**`dragoon scan`** writes `dragoon.json`, the canonical fingerprint of your codebase: stack, tokens, palette with role classification, type scale ratio, spacing grid, motion curves, accessibility metrics. every other command reads this file.

**`dragoon map`** static architecture overview from import-graph analysis. reports total files, hot files (most imported), largest files, orphan files (imported by nobody), and top external dependencies.

**`dragoon research "<topic>"`** structured research template. forces the specific decision the research will inform, comparison of existing solutions, expert disagreement, the strongest argument against doing this, and a decision checklist. dragoon does NOT fetch the web.

**`dragoon inventory`** catalog of components, hooks, pages/routes, story files, and token files. run before scaffolding new things to see what exists.

### review

**`dragoon slop`** twelve rules that catch ai-generated design slop. every finding has file, line, column, the exact snippet, and a fix. two rules become codebase-aware after `dragoon scan`: spacing-off-grid uses your detected grid, hardcoded-color-off-palette uses your detected palette.

**`dragoon critique`** 0-100 design quality scores across six categories with transparent breakdowns. every deduction traces to a metric in `dragoon.json`.

**`dragoon review`** the integration moat. one command runs slop + critique + light engineering checks (TODO/FIXME, any types, large files) on the same files. supports `--diff` for git working tree only.

**`dragoon investigate "<symptom>"`** structured root-cause investigation template. encodes the rule "no patches until you can reproduce, predict, and explain the bug." forces hypothesis-test pairs, raw evidence, and a prevention plan.

**`dragoon second-opinion "<topic>" --file path`** builds a clean packet to paste into another model. includes branch, head, recent commits, and optional file contents (max 5 files, 200 lines each, path traversal blocked). dragoon does NOT call other models.

### build

**`dragoon component <Name>`** generates a component scaffold in your codebase's actual style. detects framework (react/next/vue/svelte) and styling layer (tailwind/css-modules/plain), pulls bg/fg/radius from your manifest. defaults to dry-run, `--apply` to write.

**`dragoon typography`** generates a 9-step type scale anchored on your detected ratio. CSS, tailwind config, or JS module.

**`dragoon color`** generates color palette tokens with role names from your manifest.

**`dragoon spacing`** generates a t-shirt scale on your detected grid.

**`dragoon motion`** generates motion tokens (durations and easings) snapped to detected values.

### plan

**`dragoon brief "<idea>"`** writes a product brief template with codebase facts pre-loaded. think before code.

**`dragoon plan-eng "<idea>"`** engineering plan with test matrix, edge cases (forces at least 5), migration plan, dependencies pulled from package.json.

**`dragoon plan-design "<idea>"`** design plan that respects the constraints in `dragoon.json`. includes accessibility plan, responsive plan, review checklist gated on /critique and /slop.

**`dragoon autoplan "<idea>"`** runs all three in one shot. fastest way from "we should build X" to a complete plan.

### ship

**`dragoon ship`** pre-PR check orchestrator. runs /critique with a threshold (default 80), /slop --severity high, gathers git context, and optionally opens a PR via the `gh` CLI. exits non-zero if any check fails.

**`dragoon handoff`** writes a markdown handoff doc with everything the next engineer needs: stack, palette table, type scale, spacing grid, motion, existing components, conventions.

**`dragoon docs`** detects drift between markdown docs and the real codebase. catches references to npm scripts that don't exist, file paths that don't resolve, scoped deps not in package.json, and undocumented npm scripts.

**`dragoon land`** post-merge sanity check. verifies branch, HEAD sha, that local matches remote, working tree clean. dragoon does NOT trigger deploys (platform-specific creds out of scope); it's the gate before you invoke your platform's deploy.

**`dragoon canary <url>`** generates a canary watcher script for a deployed url. URL validation is strict (http/https only, no shell metacharacters, parseable). the generated script supports one-shot and --watch modes.

**`dragoon storybook`** scaffolds storybook config plus auto-generated `*.stories.tsx` files for every PascalCase component with a matching named export. caps at 50 components per run.

### test

**`dragoon qa`** scaffolds a playwright e2e test suite with 4 smoke tests (page loads, h1 visible, no console errors, no broken images), tuned to your stack's dev server port. dragoon does not install browsers; the runner script does.

**`dragoon accessibility`** file-level a11y audit with line locations. eight rules: missing alt, button without label, link without text, input without label, positive tabindex, click handler on non-interactive, autofocus, low contrast token pair.

**`dragoon perf`** static perf hints (large images, missing dimensions, no lazy loading, sync scripts) plus optional Lighthouse JSON ingestion that surfaces failing audits ranked by ms savings.

**`dragoon diff`** scaffolds a playwright visual regression suite. pixel diffing is done by playwright's toHaveScreenshot, not by dragoon.

### reflect

**`dragoon retro`** weekly retro markdown template with git stats pre-loaded (commit count, files changed, +/- lines, contributors). forces what-shipped, what-slipped, what-we-learned, what-to-do-less-of, what-to-do-more-of, and quality-trends.

**`dragoon memory`** small persistent key-value store at `.dragoon/memory.json` for project-specific facts dragoon (and the user) want to remember across sessions. subcommands: list, get, set, remove, clear. keys validated (lowercase ascii, max 64), values capped (8KB, max 256 keys).

**`dragoon benchmark`** snapshot codebase metrics (file count, total lines, /critique scores) for trend tracking. subcommands: capture, list, compare, show.

### power

**`dragoon forge <name>`** generates a new dragoon skill scaffold (SKILL.md, scripts, test, README) into a sandbox `.dragoon/forge/<name>/`. dragoon does NOT auto-install; review the scaffold, then copy in. extend the pack with your own skills.

**`dragoon sync`** exports design tokens to `figma.tokens.json` (tokens-studio-compatible format) for one-way import into the Figma "tokens studio" plugin. dragoon does NOT live-sync with Figma; that requires OAuth and the Figma REST API (planned for future).

**`dragoon tailwind`** generates one consolidated `tailwind.config.js` combining colors, spacing, fontFamily, fontSize, borderRadius, transitionDuration, and transitionTimingFunction from the manifest. one file instead of four.

**`dragoon careful`** writes a checklist of destructive commands the user wants to think twice about (rm -rf, force push, hard reset, db drop) to `.dragoon/CAREFUL.md`. dragoon does NOT block commands at runtime; this is a discipline tool the agent reads before risky operations.

**`dragoon freeze`** declares directories off-limits to edits. stores the list in `.dragoon/freeze.json`. optionally installs a git pre-commit hook that fails the commit if any frozen path is touched. soft fence: `git commit --no-verify` overrides.

## ci integration

drop this in your workflow:

```yaml
- name: dragoon design check
  run: |
    npx dragoon scan
    npx dragoon review --diff --threshold 80
    npx dragoon docs
    npx dragoon accessibility --severity high
    npx dragoon land
```

or in package.json:

```json
"scripts": {
  "design:check": "dragoon review --diff --threshold 80",
  "design:fix": "dragoon slop --severity high",
  "a11y:check": "dragoon accessibility --severity high",
  "ship:check": "dragoon ship --threshold 80",
  "deploy:check": "dragoon land",
  "metrics:capture": "dragoon benchmark capture"
}
```

## dragoon.json

the manifest is the contract. the schema lives at `schema/dragoon.schema.json`. you can hand-edit `dragoon.json` after a scan to tune what the rules enforce.

```json
{
  "version": "1.0.0",
  "stack": { "framework": "next", "styling": ["tailwind"], "language": "typescript" },
  "tokens": {
    "color": { "palette": [...], "totalDistinct": 24 },
    "spacing": { "inferredGrid": 8, "gridConfidence": 0.93 },
    "type": { "inferredScaleRatio": 1.25, "scaleName": "major-third" }
  },
  "rules": {
    "spacingGrid": 8,
    "typeScaleRatio": 1.25,
    "maxShadowVariants": 3,
    "allowedColors": ["#0a0a0a", "#fafafa", "#3b82f6"]
  }
}
```

## supported hosts

claude-code, codex, cursor, opencode, factory, kiro. setup auto-detects.

```bash
./setup --list-hosts            # see all
./setup --hosts claude-code     # install only for one
./setup --uninstall             # clean removal
```

## what dragoon does not do

honest scoping matters. these are explicit non-goals:

- dragoon does not fetch the web (no `/research` web search, no `/second-opinion` ai calls)
- dragoon does not install browsers (the qa/diff runner scripts handle that)
- dragoon does not run lighthouse (it ingests reports you generate)
- dragoon does not block commands at runtime (`/careful` is a discipline tool)
- dragoon does not live-sync with figma (`/sync` is one-way export)
- dragoon does not deploy to production (`/land` is the gate, not the trigger)
- dragoon does not auto-install forged skills (sandbox first, copy by hand)

if a feature would require browsers, network access, or platform-specific creds, dragoon either skips it or scopes it down to a generator the user runs themselves.

## how it works

dragoon is plain node 18+ with zero npm dependencies. every script is auditable. no telemetry, no network calls. it walks your repo locally and writes one json file plus the artifacts you ask for.

every command has:
- a `--help` with full usage
- a dry-run default (build skills) or read-only (review skills)
- `--json` for CI consumption
- proper exit codes (0 ok, 1 findings, 2 bad usage)
- input validation that rejects path traversal, shell metacharacters, reserved identifiers

## development

```bash
git clone https://github.com/dragoon0x/dragoon-skills.git
cd dragoon-skills
node --test test/*.test.js     # 209 tests, zero deps
bash scripts/smoke.sh          # end-to-end on a fixture project, all 36 commands
```

## license

MIT. see LICENSE.

## experimental

dragoon is research-grade tooling. inference is heuristic. always validate against your design system. see DISCLAIMER.md.
