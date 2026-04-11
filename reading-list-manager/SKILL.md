---
name: reading-list-manager
description: Manage a reading list with status tracking (to-read/reading/finished), tags, ratings, and export.
version: 1.0.0
---

# Reading List Manager

## Features

- Add books, articles, papers, videos
- Status: to-read, reading, finished, abandoned
- Tags and star ratings
- Search and filter
- Export to markdown

## Quick Start

```bash
node scripts/manage.js add "Refactoring UI" --type book --tag design
node scripts/manage.js finish "Refactoring UI" --rating 5
node scripts/manage.js list --status reading
node scripts/manage.js export
```

## Use when

Tracking what you read, curating recommendations, sharing reading lists.