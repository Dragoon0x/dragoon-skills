---
name: calendar-blocks
description: Generate time-blocked daily schedules from task lists. Respects energy levels: deep work mornings, meetings afternoons, admin evenings.
version: 1.0.0
---

# Calendar Blocks

## Features

- Energy-aware scheduling (deep work AM, meetings PM, admin late PM)
- Auto-estimate task durations by keyword
- Buffer time between blocks
- Lunch break protection

## Quick Start

```bash
node scripts/generate.js "Write proposal; Review PRs; Team standup; Update docs"
node scripts/generate.js tasks.txt --start 9:00
```

## Use when

Planning your day, converting a todo list into a concrete schedule.