---
name: spacing-audit
description: Scan CSS/SCSS files for spacing inconsistencies. Detects values outside the base-4 grid, mixed units, and missing spacing tokens.
version: 1.0.0
---

# Spacing Audit

## Features
- Detect spacing values outside base-4 scale
- Find mixed px/rem/em usage
- Identify hardcoded spacing that should be tokens
- Report spacing distribution (histogram)
- Suggest nearest scale value for off-grid values

## Quick Start
```bash
node scripts/audit.js src/styles/ --recursive
node scripts/audit.js component.css --format json
```

## Use when
Enforcing a spacing scale, finding inconsistencies before design system migration, CI quality gates.