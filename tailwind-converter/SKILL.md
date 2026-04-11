---
name: tailwind-converter
description: Convert raw CSS properties to Tailwind utility classes. Handles colors, spacing, typography, flexbox, grid, and responsive modifiers.
version: 1.0.0
---

# Tailwind Converter

## Features
- Convert CSS declarations to Tailwind utility classes
- Handles layout (flex, grid), spacing, typography, positioning
- Maps px spacing to Tailwind scale (4px → 1, 8px → 2, etc.)
- Comments unmapped properties for manual review

## Quick Start
```bash
node scripts/convert.js "display: flex; align-items: center; gap: 16px; padding: 24px;"
```

## Use when
Migrating from CSS to Tailwind, learning Tailwind equivalents, quick conversion during development.