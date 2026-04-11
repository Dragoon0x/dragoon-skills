---
name: time-estimator
description: Estimate task completion time with complexity detection and planning fallacy correction.
version: 1.0.0
---

# Time Estimator

## Features

- Complexity-based estimation (simple/medium/complex/unknown)
- Planning fallacy multiplier (1.5x default)
- Three-point estimates (optimistic/realistic/pessimistic)
- Batch estimation from task list

## Quick Start

```bash
node scripts/estimate.js "Build login page" --complexity medium
node scripts/estimate.js "API integration; Auth flow; Dashboard; Testing" --buffer 1.5
```

## Use when

Estimating project timelines, sprint planning, setting stakeholder expectations.