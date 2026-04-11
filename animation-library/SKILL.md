---
name: animation-library
description: Generate CSS and JS animation presets for common UI patterns. Includes entrance, exit, emphasis, and transition animations with correct easing curves.
version: 1.0.0
---

# Animation Library

## Features
- 10 production-ready CSS animations (fade, slide, scale, shake, pulse, spin, shimmer)
- Correct easing curves (ease-out for enters, ease-in for exits)
- Includes prefers-reduced-motion handling
- Output all as a single CSS file or individual animations
- JSON output for programmatic use

## Quick Start
```bash
node scripts/generate.js --list
node scripts/generate.js all > animations.css
node scripts/generate.js fade-in
node scripts/generate.js all --format json
```

## Use when
Setting up animation utilities, bootstrapping a project's motion system, generating animation tokens.