---
name: contrast-checker
description: Check WCAG 2.1 color contrast ratios between foreground and background colors. Supports hex, RGB, HSL input. Reports AA and AAA compliance for normal and large text.
version: 1.0.0
---

# Contrast Checker

WCAG 2.1 contrast ratio calculator. Pass two colors, get a compliance report. Supports batch checking from CSS files and design token files.

## Features

- Calculate contrast ratio between any two colors
- WCAG AA and AAA compliance for normal and large text
- Batch mode: scan a CSS file for all color/background pairs
- Token mode: check all token combinations in a JSON token file
- Suggestion engine: recommends closest compliant color when failing
- Supports hex (#RGB, #RRGGBB, #RRGGBBAA), rgb(), hsl(), named colors

## Quick Start

```bash
# Check two colors
node scripts/check.js "#FFFFFF" "#6B7280"

# Batch check a CSS file
node scripts/check.js --file src/styles.css

# Check design tokens
node scripts/check.js --tokens tokens.json

# Find nearest compliant color
node scripts/check.js "#F1F5F9" "#94A3B8" --suggest
```

## WCAG Requirements

| Level | Normal Text (< 18px) | Large Text (18px+ or 14px bold) |
|-------|---------------------|-------------------------------|
| AA | 4.5:1 | 3:1 |
| AAA | 7:1 | 4.5:1 |
| UI Components | 3:1 | 3:1 |

## Use when

Checking color accessibility, auditing design systems, CI/CD accessibility gates, validating dark mode colors.
