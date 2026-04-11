---
name: okr-tracker
description: Track OKRs with progress scoring, confidence levels, and check-in history. Persistent data file.
version: 1.0.0
---

# Okr Tracker

## Features

- Define objectives with key results
- Progress scoring (0-100%)
- Visual progress bars
- On track / At risk / Off track status
- Check-in history

## Quick Start

```bash
node scripts/track.js init "Ship v2.0" --kr "Launch by March" --kr "90% coverage"
node scripts/track.js update "Ship v2.0" --kr 1 --progress 75
node scripts/track.js summary
```

## Use when

Quarterly planning, tracking objectives, performance review prep.