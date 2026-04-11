---
name: standup-generator
description: Generate daily standup updates from git log or manual input. Formats as Yesterday/Today/Blockers.
version: 1.0.0
---

# Standup Generator

## Features

- Pull from git log for yesterday section
- Structured: Yesterday / Today / Blockers
- Output formats: Slack mrkdwn, markdown, plain text
- Auto-detect project from current directory

## Quick Start

```bash
node scripts/generate.js --git
node scripts/generate.js --yesterday "Shipped auth" --today "Start payments" --blocker "API keys"
node scripts/generate.js --git --format slack
```

## Use when

Daily standups, async team updates, end-of-day summaries.