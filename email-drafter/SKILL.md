---
name: email-drafter
description: Draft professional emails with tone presets (formal, friendly, direct, diplomatic). Subject lines, body, and sign-offs calibrated to context.
version: 1.0.0
---

# Email Drafter

## Features

- 4 tone presets: formal, friendly, direct, diplomatic
- 5 email types: standard, followup, reply, cold, meeting
- Subject line generation
- Structure guide per type

## Quick Start

```bash
node scripts/draft.js "Ask manager for Friday off" --tone friendly
node scripts/draft.js "Follow up on proposal" --tone formal --type followup
node scripts/draft.js "Decline meeting" --tone diplomatic --type reply
node scripts/draft.js "Introduce our tool" --tone direct --type cold
```

## Use when

Drafting professional emails where tone calibration matters.