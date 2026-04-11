---
name: responsive-screenshot
description: Take screenshots of a URL at multiple viewport widths for responsive design review. Uses Playwright.
version: 1.0.0
---

# Responsive Screenshot

## Features
- Screenshot any URL at 6 standard viewports (375px to 1920px)
- Full-page capture
- Custom viewport list support
- Output to organized directory

## Quick Start
```bash
npx playwright install chromium  # one-time setup
node scripts/screenshot.js https://example.com --output ./screens
```

## Use when
Reviewing responsive design, QA before shipping, documenting current state before redesign.