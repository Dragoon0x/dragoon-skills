---
name: voice-memo-processor
description: Process voice memo transcripts into structured notes with key points, action items, and tags.
version: 1.0.0
---

# Voice Memo Processor

## Features

- Extract key points from raw transcripts
- Detect action items and questions
- Auto-tag by topic keywords
- Clean up filler words and repetitions
- Markdown output

## Quick Start

```bash
node scripts/process.js transcript.txt --output notes.md
node scripts/process.js raw-memo.txt --clean --output cleaned.md
```

## Use when

Processing voice memo transcripts, cleaning up dictated notes, extracting structure from stream-of-consciousness text.