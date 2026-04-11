---
name: icon-sprite-generator
description: Combine individual SVG icon files into an optimized SVG sprite sheet with symbol references.
version: 1.0.0
---

# Icon Sprite Generator

## Features
- Combine SVG files into a single sprite sheet
- Symbol-based references for clean HTML usage
- Preserves viewBox from source SVGs
- Alphabetical ordering
- Clean output with consistent formatting

## Quick Start
```bash
node scripts/generate.js ./icons --output sprite.svg
```

## Use when
Building icon systems, reducing HTTP requests, creating reusable icon sprites for production.