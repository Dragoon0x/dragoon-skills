---
name: design-brief
description: Generate structured design briefs from natural language prompts. Outputs problem statement, constraints, success criteria, and scope definition.
version: 1.0.0
---

# Design Brief

## Features
- Generate structured design briefs from a one-line prompt
- Includes: problem statement, target user, success criteria, scope, constraints, direction
- Markdown output ready for team collaboration
- Prompts for all critical sections a designer needs

## Quick Start
```bash
node scripts/generate.js "Redesign the settings page for better findability"
node scripts/generate.js "Add dark mode support to the dashboard" --output brief.md
```

## Use when
Starting a new design project, aligning stakeholders on scope, ensuring nothing is missed before design begins.