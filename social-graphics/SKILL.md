---
name: social-graphics
description: Generate social media graphics (Instagram, Twitter, LinkedIn) from templates using Playwright. Brand-configurable.
version: 1.0.0
---

# Social Graphics

## Features
- 5 social media format templates (Instagram post/story, Twitter, LinkedIn, YouTube)
- Customizable title, colors, brand elements
- Playwright screenshot to PNG
- Consistent brand styling across formats

## Quick Start
```bash
node scripts/generate.js twitter-post "Design systems that actually work" --bg "#0F172A" --accent "#3B82F6"
npx playwright screenshot twitter-post.html twitter-post.png --viewport-size=1200,675
```

## Use when
Creating consistent social media graphics for launches, blog posts, or announcements.