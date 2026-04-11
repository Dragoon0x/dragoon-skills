---
name: svg-optimizer
description: Clean, optimize, and standardize SVG files. Remove metadata, editor artifacts, unnecessary attributes. Reduce file size 30-70% with zero visual change.
version: 1.0.0
---

# Svg Optimizer

## Features
- Strip editor metadata (Illustrator, Sketch, Figma artifacts)
- Remove unnecessary attributes (xml:space, data-name, etc.)
- Collapse redundant groups
- Shorten hex colors (#FFFFFF → #FFF)
- Round coordinates to 2 decimal places
- Remove empty elements
- Add/fix viewBox if missing
- Batch process directories

## Quick Start
```bash
node scripts/optimize.js icon.svg
node scripts/optimize.js icons/ --recursive --output optimized/
node scripts/optimize.js logo.svg --precision 1
```

## Use when
Preparing icons for production, reducing SVG sprite size, cleaning exports from design tools, standardizing icon library files.