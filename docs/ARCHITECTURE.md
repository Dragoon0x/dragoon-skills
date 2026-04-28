# dragoon architecture

a short tour of how dragoon is structured and why.

## philosophy

three rules drive every design decision in dragoon:

1. **deterministic over probabilistic.** every output is derivable from the source. no llm calls, no machine learning, no random seeds. you should be able to run the same command twice and get the same result.

2. **transparent math, no vibes.** every score, every finding, every percentage is traceable to a metric you can read in `dragoon.json`. if dragoon says your spacing score is 73, you can see exactly why.

3. **no dependencies.** zero npm packages. the entire pack runs on plain node 18+. anyone can audit every line in an hour. install takes one second.

## the artifact contract

`dragoon.json` is the heart of the pack. every command reads or writes it. the schema lives in `schema/dragoon.schema.json`.

```
recon -> /scan -> dragoon.json
                       |
                       v
review -> /slop, /critique, /review (read manifest, tune their behavior)
```

without a manifest, dragoon still works but with generic rules. with a manifest, dragoon becomes codebase-aware: spacing-off-grid uses your detected grid, off-palette colors use your detected palette, etc.

## directory layout

```
dragoon-skills/
├── bin/dragoon              # main cli dispatcher (routes 36 commands across 8 phases)
├── lib/                     # shared engines, pure functions, no cli
│   ├── colors.js            # hex normalization, contrast, role classification
│   ├── critique-engine.js   # 0-100 scoring math
│   ├── files.js             # gitignore-aware repo walker
│   ├── output.js            # consistent terminal output (color-aware)
│   ├── parsers.js           # regex value extraction
│   ├── safe-paths.js        # path traversal prevention, identifier validation
│   ├── patch.js             # atomic file writer with dry-run
│   ├── codegen.js           # template renderer (no eval, no injection)
│   ├── tokens.js            # grid + type-scale inference
│   ├── scan-engine.js       # writes dragoon.json (recon)
│   ├── map-engine.js        # import-graph architecture map (recon)
│   ├── research-engine.js   # research template (recon)
│   ├── inventory-engine.js  # component/hook/page catalog (recon)
│   ├── slop-rules.js        # 12 slop detection rules (review)
│   ├── review-extra-engine.js # investigate + second-opinion templates (review)
│   ├── component-builder.js # component scaffold templates (build)
│   ├── token-applier.js     # type/color/spacing/motion token generators (build)
│   ├── token-cli.js         # shared cli for token skills (build)
│   ├── plan-engine.js       # brief / plan-eng / plan-design templates (plan)
│   ├── plan-cli.js          # shared cli for plan skills (plan)
│   ├── ship-engine.js       # pre-PR check orchestrator (ship)
│   ├── handoff-engine.js    # handoff doc generator (ship)
│   ├── docs-engine.js       # docs drift detector (ship)
│   ├── ship-extra-engine.js # land/canary/storybook scaffolders (ship)
│   ├── qa-engine.js         # playwright e2e scaffold (test)
│   ├── a11y-engine.js       # 8 a11y rules (test)
│   ├── perf-engine.js       # static perf rules + lighthouse parser (test)
│   ├── diff-engine.js       # playwright snapshot scaffold (test)
│   ├── reflect-engine.js    # retro / memory / benchmark (reflect)
│   └── power-engine.js      # forge / sync / tailwind / careful / freeze (power)
├── schema/dragoon.schema.json
├── skills/                  # 36 skill folders, each with SKILL.md + scripts/
├── test/                    # 209 tests, node:test, no external framework
├── scripts/smoke.sh         # end-to-end: exercises all 36 commands
└── setup                    # bash multi-host install
```

## why no ast parser

real ast parsers (babel, swc, postcss) are heavy, framework-specific, and add install time. dragoon uses targeted regex on css/scss/jsx/tsx/vue/svelte content. trade-off: we miss some edge cases (string-template-embedded styles, computed class names). gain: the entire pack is one folder, one node call, no install step.

for the design fingerprinting use case, regex is sufficient. fingerprinting is statistical: we want the dominant shape of the codebase, not perfect coverage of every edge case.

## why no llm

llm-driven scoring is non-deterministic and unauditable. you can't put it in ci. you can't compare scores week over week with confidence. you can't explain a deduction.

every dragoon score traces to a metric. typography deduces from font-family count, scale-confidence, font-size variant count. that's it. you can read the math.

## extensibility

want to add a slop rule? add an entry to `RULES` in `lib/slop-rules.js` with this shape:

```js
{
  id: 'slop-013',
  name: 'your-rule',
  severity: 'low' | 'medium' | 'high',
  description: '...',
  detect(content, ctx) {
    // return [{ line, column, snippet, message, fix }, ...]
  }
}
```

write tests in `test/slop.test.js` with positive and negative cases. that's the whole loop.

want to extend the manifest? edit the schema, then update `lib/scan-engine.js` to populate the new fields. existing skills will ignore unknown fields.

## testing strategy

- every engine has unit tests with positive and negative cases.
- every slop rule has a test that verifies the rule fires on its target pattern and does not fire on similar but innocent patterns.
- there's an end-to-end smoke test (`scripts/smoke.sh` if added) that runs all four commands against a known fixture.

run all tests:

```
node --test test/*.test.js
```

209 tests today. zero dependencies.

## stability

`dragoon.json` schema follows semantic versioning. breaking changes bump the major version. consumer skills should check `manifest.version` when they read it.

cli flags are also versioned. existing flags will not be removed within a major. new flags may be added between minors.

## what dragoon is not

- not a code formatter. doesn't rewrite your code.
- not a linter that lives in your editor. it's a scanner and reporter.
- not a perfect ground truth. it surfaces signals, not absolute judgments.
- not a substitute for human design review.
