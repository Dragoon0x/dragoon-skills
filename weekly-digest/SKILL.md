---
name: weekly-digest
description: Compile weekly summaries from git commits. Groups by date, shows stats, ready for Slack or email.
version: 1.0.0
---

# Weekly Digest

## Features

- Aggregate git commits for the week
- Stats: commits, files changed, lines added/removed
- Group by date
- Markdown or Slack output

## Quick Start

```bash
node scripts/generate.js --git
node scripts/generate.js --git --since "last monday" --format slack
```

## Use when

Friday wrap-ups, weekly team updates, personal progress tracking.