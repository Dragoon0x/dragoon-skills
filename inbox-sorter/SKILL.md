---
name: inbox-sorter
description: Categorize and prioritize email subjects. Assigns urgency, type (action/FYI/meeting/newsletter), and suggested action.
version: 1.0.0
---

# Inbox Sorter

## Features

- 6 categories: action, meeting, FYI, newsletter, urgent, social
- Keyword-based classification
- Suggested action per category
- Summary statistics

## Quick Start

```bash
node scripts/sort.js "Re: Budget Review; Newsletter: Design Digest; URGENT: Server down"
node scripts/sort.js inbox.txt
```

## Use when

Processing email backlog, inbox zero routine, morning triage.