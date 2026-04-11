---
name: color-palette-generator
description: Generate complete color scales (50-950) from a single base color using perceptual color science (OKLCH). Outputs CSS custom properties.
version: 1.0.0
---

# Color Palette Generator

## Features
- Generate 11-step color scale (50-950) from any hex color
- Perceptual lightness distribution
- Maintains hue consistency across the scale
- Adjusts saturation by lightness (desaturates lights, saturates darks)
- CSS custom properties output

## Quick Start
```bash
node scripts/generate.js "#2563EB" brand
node scripts/generate.js "#059669" success
node scripts/generate.js "#DC2626" error
```

## Use when
Building a design system color palette, generating semantic color scales, bootstrapping theme tokens.