---
name: color-extractor
description: Extract dominant color palettes from images (PNG, JPG, WebP, SVG). Outputs hex values, CSS custom properties, and Tailwind config. Uses quantization algorithm, no external dependencies.
version: 1.0.0
---

# Color Extractor

Extract the dominant colors from any image and output a usable palette. Pure Node.js implementation using k-means quantization on raw pixel data.

## Features

- Extract 3-12 dominant colors from any image
- Output formats: hex list, CSS custom properties, Tailwind config, JSON
- Sort by dominance, lightness, or saturation
- Name detection (maps extracted colors to nearest named color)
- Light/dark palette variant generation

## Quick Start

```bash
# Extract 6 colors from an image
node scripts/extract.js hero.png --count 6

# Output as CSS custom properties
node scripts/extract.js brand-photo.jpg --format css

# Output as Tailwind config
node scripts/extract.js hero.png --format tailwind --output colors.js

# Batch process a directory
node scripts/extract.js assets/images/ --count 5 --format json
```

## Use when

Building a color system from brand photography, extracting palettes for mood boards, generating design tokens from existing assets.
