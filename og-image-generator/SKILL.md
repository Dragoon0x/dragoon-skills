---
name: og-image-generator
description: Generate Open Graph (og:image) social sharing images with customizable templates using Playwright. Supports title, description, brand colors, and logo.
version: 1.0.0
---

# Og Image Generator

## Features
- Generate 1200x630px Open Graph images as HTML
- Customizable title, subtitle, colors
- Screenshot to PNG via Playwright
- Multiple templates (minimal, gradient, photo overlay)

## Quick Start
```bash
node scripts/generate.js "My Blog Post Title" --subtitle "A deep dive into design systems" --output og.html
npx playwright screenshot og.html og.png --viewport-size=1200,630
```

## Use when
Generating social sharing images for blog posts, product pages, or documentation.