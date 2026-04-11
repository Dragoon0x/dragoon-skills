---
name: design-token-extractor
description: Extract design tokens (colors, fonts, spacing, shadows, radii) from existing CSS/SCSS files and output as JSON, CSS custom properties, or Style Dictionary format.
version: 1.0.0
---

# Design Token Extractor

## Features
- Extract colors, fonts, spacing, shadows, border-radius from CSS
- Deduplicate and categorize automatically
- Output: JSON, CSS custom properties, Style Dictionary format
- Semantic name suggestion based on usage context

## Quick Start
```bash
node scripts/extract.js src/styles/ --recursive --format json
node scripts/extract.js app.css --format css
node scripts/extract.js theme.scss --format style-dictionary --output tokens/
```

## Use when
Migrating from hardcoded CSS to design tokens, auditing existing token usage, bootstrapping a design system from legacy code.