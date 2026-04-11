---
name: design-lint
description: Lint design decisions in frontend code. Detects anti-patterns like nested ternaries in className, inline styles, inconsistent spacing, and component naming issues.
version: 1.0.0
---

# Design Lint

## Features
- 8 design-specific lint rules for React/JSX
- Catches inline styles, div-as-button, nested ternary classNames
- Detects hardcoded colors and magic numbers
- Recursive directory scanning

## Quick Start
```bash
node scripts/lint.js src/components/
node scripts/lint.js Button.tsx
```

## Use when
Code review for design quality, enforcing component patterns, CI quality gates.