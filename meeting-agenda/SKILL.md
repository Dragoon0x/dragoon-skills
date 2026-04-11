---
name: meeting-agenda
description: Generate structured meeting agendas with time allocations, topic types, and pre-read sections.
version: 1.0.0
---

# Meeting Agenda

## Features

- Time-allocated agenda items
- Topic types: discussion, decision, update, brainstorm
- Pre-read and desired outcomes sections
- Action item template

## Quick Start

```bash
node scripts/generate.js "Sprint Planning" --duration 60 --topics "Review velocity; Prioritize backlog; Assign stories"
node scripts/generate.js "Design Review" --duration 30 --topics "Present mocks; Gather feedback"
```

## Use when

Preparing meetings, sending pre-read agendas, ensuring meetings have clear outcomes.