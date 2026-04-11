---
name: css-audit
description: Scan CSS/SCSS files for anti-patterns, hardcoded values, AI slop indicators, specificity issues, and unused properties. Produces a scored audit report.
version: 1.0.0
---

# CSS Audit

Automated CSS quality scanner that detects the patterns senior frontend engineers catch in code review. Finds hardcoded hex colors that should be tokens, `!important` abuse, specificity bombs, AI-default values, and unused declarations.

## Features

- Hardcoded value detection (hex colors, px font sizes, magic numbers)
- AI slop pattern matching (the defaults Claude and Copilot reach for)
- Specificity scoring and analysis
- `!important` count and location
- Duplicate property detection
- Unused CSS estimation via class name cross-reference
- Scored report with severity grading (A-F)

## Quick Start

```bash
# Audit a single file
node scripts/audit.js src/styles/main.css

# Audit a directory
node scripts/audit.js src/ --recursive

# Output as JSON
node scripts/audit.js src/ --format json --output report.json

# Strict mode (fails CI on score below B)
node scripts/audit.js src/ --strict --min-grade B
```

## What It Catches

| Pattern | Severity | Example |
|---------|----------|---------|
| Hardcoded hex color | Warning | `color: #64748B` instead of `var(--color-text-secondary)` |
| Hardcoded px font-size | Warning | `font-size: 14px` instead of token |
| `!important` | Error | Usually a specificity problem |
| `transition: all` | Warning | Animate specific properties |
| `opacity: 0.5` on disabled | Info | Should be `0.38` (MD3 convergence) |
| `z-index: 9999` | Error | Use a z-index scale |
| Magic numbers | Warning | `margin-left: 37px` |
| Duplicate properties | Warning | Same property declared twice in one rule |

## Use when

Reviewing CSS before code review, enforcing design system token usage, CI quality gates, onboarding to a new codebase.
