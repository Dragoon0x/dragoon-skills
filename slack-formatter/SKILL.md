---
name: slack-formatter
description: Convert markdown to Slack mrkdwn format. Generate formatted announcements, status updates, and standup messages.
version: 1.0.0
---

# Slack Formatter

## Features

- Markdown to Slack mrkdwn conversion
- Templates: announcement, status, standup, deploy
- Emoji mapping
- File input or inline text

## Quick Start

```bash
node scripts/format.js "Deploy completed" --type status --emoji ":rocket:"
node scripts/format.js README.md --convert
node scripts/format.js "Sprint completed" --type announcement
```

## Use when

Formatting Slack messages, converting docs to Slack format, structured updates.