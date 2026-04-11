---
name: meeting-notes
description: Transform raw meeting transcripts into structured summaries with decisions, action items, and follow-ups.
version: 1.0.0
---

# Meeting Notes

## Features

- Parse raw text for decisions, action items, questions, and topics
- @mention detection for owner assignment
- Markdown summary with collapsible raw transcript
- Obsidian vault integration

## Quick Start

```bash
node scripts/process.js meeting-raw.txt --output summary.md
pbpaste | node scripts/process.js - --output standup.md
node scripts/process.js notes.txt --vault ~/vault/meetings/
```

## What It Detects

| Pattern | Keywords |
|---------|----------|
| Decisions | decided, agreed, approved, confirmed, going to |
| Actions | action, todo, task, @person will, follow-up |
| Questions | question, TBD, need to figure out, lines ending in ? |
| Blockers | blocked, waiting for, stuck on, depends on |

## Use when

After any meeting where you took rough notes. Converts brain dumps into shareable summaries.