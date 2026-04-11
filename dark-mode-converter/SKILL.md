---
name: dark-mode-converter
description: Convert light-mode CSS to dark mode. Remaps colors using perceptual rules (not simple inversion). Handles backgrounds, text, borders, and shadows.
version: 1.0.0
---

# Dark Mode Converter

## Features
- Perceptual color remapping (not naive inversion)
- Background, text, border, and shadow conversion
- Preserves brand color hue while adjusting lightness/saturation
- Outputs CSS with [data-theme="dark"] or prefers-color-scheme media query
- Handles gradients and rgba values

## Quick Start
```bash
node scripts/convert.js light-theme.css --output dark-theme.css
node scripts/convert.js styles.css --method media-query
node scripts/convert.js styles.css --method data-attribute
```

## Conversion Rules
- Backgrounds: light → dark (invert lightness, reduce saturation 10%)
- Text: dark → light (not pure white — use #F1F5F9 for primary)
- Borders: lighten to ~20% opacity equivalent on dark surface
- Shadows: remove (use surface lightening for elevation instead)
- Brand colors: increase lightness 15%, reduce saturation 15%

## Use when
Adding dark mode to existing projects, generating dark theme tokens, auditing dark mode color choices.