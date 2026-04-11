---
name: accessibility-audit
description: Scan HTML files for common accessibility violations. Checks alt text, ARIA roles, heading hierarchy, color contrast indicators, and form labels.
version: 1.0.0
---

# Accessibility Audit

## Features
- 10 automated checks (alt text, labels, headings, ARIA, tabindex, outline, autoplay)
- Heading hierarchy validation
- Severity grading (error, warning, info)
- Batch file processing

## Quick Start
```bash
node scripts/audit.js index.html
node scripts/audit.js src/components/Modal.tsx
```

## Use when
Pre-commit accessibility check, CI/CD quality gate, quick audit before code review.