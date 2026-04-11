---
name: type-scale-generator
description: Generate mathematically proportional type scales with CSS clamp() formulas, rem values, and responsive breakpoints. Supports custom ratios and base sizes.
version: 1.0.0
---

# Type Scale Generator

## Features
- 8 built-in ratios (Minor Second through Golden Ratio)
- CSS custom properties output with clamp() formulas
- Tailwind fontSize config output
- Preview table showing px, rem, and clamp values
- Custom base size and ratio support

## Quick Start
```bash
# Generate with Perfect Fourth ratio (default)
node scripts/generate.js

# Custom ratio and base
node scripts/generate.js --ratio 1.25 --base 16 --steps 8

# Named ratios
node scripts/generate.js --ratio golden --format css

# Tailwind output
node scripts/generate.js --ratio 1.2 --format tailwind
```

## Built-in Ratios
| Name | Ratio | Feel |
|------|-------|------|
| Minor Second | 1.067 | Very tight |
| Major Second | 1.125 | Tight |
| Minor Third | 1.2 | Comfortable (SaaS) |
| Major Third | 1.25 | Balanced |
| Perfect Fourth | 1.333 | Editorial |
| Augmented Fourth | 1.414 | Dramatic |
| Perfect Fifth | 1.5 | Bold |
| Golden Ratio | 1.618 | Maximum contrast |

## Use when
Setting up a new project's typography, standardizing an inconsistent type system, generating responsive type with clamp().