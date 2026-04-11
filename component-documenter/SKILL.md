---
name: component-documenter
description: Extract React component props, defaults, and types from TypeScript files. Generate markdown documentation automatically.
version: 1.0.0
---

# Component Documenter

## Features
- Extract props, types, and defaults from React/TypeScript components
- Generate markdown documentation tables
- Batch process component directories
- Detect required vs optional props
- Extract inline prop comments as descriptions

## Quick Start
```bash
node scripts/document.js src/components/Button.tsx
node scripts/document.js src/components/ --output COMPONENTS.md
```

## Use when
Generating component documentation, auditing prop APIs, maintaining design system docs.