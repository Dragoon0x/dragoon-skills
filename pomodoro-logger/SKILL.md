---
name: pomodoro-logger
description: Track pomodoro work sessions with task labels, durations, and daily/weekly summaries.
version: 1.0.0
---

# Pomodoro Logger

## Features

- Start/stop sessions with task names
- Daily and weekly summaries
- Time-per-task breakdown with bar charts
- Persistent log file

## Quick Start

```bash
node scripts/log.js start "Write documentation"
node scripts/log.js stop
node scripts/log.js summary
node scripts/log.js summary --week
```

## Use when

Tracking deep work sessions, measuring focus time, building a work log.