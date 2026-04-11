---
name: note-linker
description: Find connections between markdown notes by analyzing shared keywords. Suggests backlinks with connection scores.
version: 1.0.0
---

# Note Linker

## Features

- Scan markdown files for shared keywords
- Connection strength scoring
- Top shared terms per connection
- Obsidian wiki-link format output

## Quick Start

```bash
node scripts/link.js ~/notes/ --top 20
node scripts/link.js ~/vault/ --min-score 3
```

## Use when

Building a knowledge graph, finding related notes, discovering connections between ideas.