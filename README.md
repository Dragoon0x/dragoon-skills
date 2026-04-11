# Dragoon Skills

> **Disclaimer:** This project is for **educational and experimental purposes only.** All tools are provided as-is. DYOR before relying on any output. See [DISCLAIMER.md](DISCLAIMER.md) for full terms.


A collection of design and frontend workflow skills for [Claude Code](https://claude.ai/code). Each skill has executable scripts that actually do something — audit CSS, check contrast ratios, generate type scales, extract color palettes, optimize SVGs, and more.

## Available Skills

### Audit & Quality

| Skill | What It Does |
|-------|-------------|
| [**css-audit**](css-audit) | Scan CSS for anti-patterns, hardcoded values, AI slop indicators. Scored report (A-F). |
| [**contrast-checker**](contrast-checker) | WCAG 2.1 contrast ratio calculator. AA/AAA compliance. Nearest-compliant color suggestion. |
| [**spacing-audit**](spacing-audit) | Detect spacing values outside base-4 grid. Distribution histogram. |
| [**accessibility-audit**](accessibility-audit) | Scan HTML for alt text, labels, heading hierarchy, ARIA, tabindex issues. |
| [**design-lint**](design-lint) | Lint React/JSX for design anti-patterns — inline styles, div-as-button, magic numbers. |

### Generation & Conversion

| Skill | What It Does |
|-------|-------------|
| [**type-scale-generator**](type-scale-generator) | Generate type scales with CSS clamp() formulas. 8 built-in ratios. |
| [**color-palette-generator**](color-palette-generator) | Generate 11-step color scale (50-950) from a single hex color. |
| [**color-extractor**](color-extractor) | Extract dominant colors from images. Output as CSS tokens or Tailwind config. |
| [**dark-mode-converter**](dark-mode-converter) | Convert light CSS to dark mode with perceptual remapping (not inversion). |
| [**animation-library**](animation-library) | Generate CSS animation presets with correct easing. 10 production-ready animations. |
| [**og-image-generator**](og-image-generator) | Generate 1200x630 Open Graph images as HTML. Screenshot via Playwright. |
| [**social-graphics**](social-graphics) | Generate social media graphics (Instagram, Twitter, LinkedIn, YouTube). |
| [**design-brief**](design-brief) | Generate structured design briefs from one-line prompts. |
| [**icon-sprite-generator**](icon-sprite-generator) | Combine SVG files into an optimized sprite sheet. |

### Extraction & Analysis

| Skill | What It Does |
|-------|-------------|
| [**design-token-extractor**](design-token-extractor) | Extract design tokens (colors, fonts, spacing) from existing CSS/SCSS. |
| [**font-classifier**](font-classifier) | Classify fonts by category and suggest pairings based on contrast principles. |
| [**component-documenter**](component-documenter) | Extract React component props and generate markdown documentation. |
| [**svg-optimizer**](svg-optimizer) | Clean, optimize, and standardize SVG files. 30-70% size reduction. |
| [**tailwind-converter**](tailwind-converter) | Convert raw CSS declarations to Tailwind utility classes. |
| [**responsive-screenshot**](responsive-screenshot) | Screenshot a URL at 6 viewport widths. Uses Playwright. |

## Installation

```bash
# Clone the repository

> **Disclaimer:** This project is for **educational and experimental purposes only.** All tools are provided as-is. DYOR before relying on any output. See [DISCLAIMER.md](DISCLAIMER.md) for full terms.

git clone https://github.com/Dragoon0x/dragoon-skills.git

# Copy desired skills to Claude Code
cp -r dragoon-skills/css-audit ~/.claude/skills/
cp -r dragoon-skills/contrast-checker ~/.claude/skills/
# ... or copy all:
cp -r dragoon-skills/*/ ~/.claude/skills/
```

## Requirements

- **Node.js 18+** (all scripts are Node.js)
- **Playwright** (for screenshot and image generation skills): `npx playwright install chromium`
- **ImageMagick** (for color-extractor): `brew install imagemagick` / `apt install imagemagick`

## Usage

Skills are automatically triggered by Claude Code based on context. You can also run scripts directly:

```bash
# Audit CSS quality
node ~/.claude/skills/css-audit/scripts/audit.js src/ --recursive

# Check contrast
node ~/.claude/skills/contrast-checker/scripts/check.js "#333" "#FFF"

# Generate a type scale
node ~/.claude/skills/type-scale-generator/scripts/generate.js --ratio 1.25 --format css
```

## Skill Structure

```
skill-name/
├── SKILL.md              # Skill metadata and documentation
└── scripts/
    └── script-name.js    # Executable Node.js script
```

Each skill is self-contained. No shared dependencies between skills.

## Contributing

PRs welcome. Each new skill needs:

1. A `SKILL.md` with frontmatter (name, description, version)
2. At least one executable script in `scripts/`
3. Working `--help` flag on the script
4. Documentation in the SKILL.md showing quick start and use cases

## License

MIT — see [LICENSE](LICENSE).

---

**By [Dragoon0x](https://github.com/Dragoon0x). 40 design and productivity workflow skills. All executable. All useful.**

### Personal Productivity

| Skill | What It Does |
|-------|-------------|
| [**meeting-notes**](meeting-notes) | Transform raw meeting transcripts into structured summaries with decisions, actions, and questions. |
| [**email-drafter**](email-drafter) | Draft professional emails with tone presets (formal, friendly, direct, diplomatic). |
| [**calendar-blocks**](calendar-blocks) | Generate energy-aware time-blocked schedules from task lists. Deep work AM, meetings PM. |
| [**standup-generator**](standup-generator) | Generate standup updates from git log or manual input. Yesterday/Today/Blockers format. |
| [**weekly-digest**](weekly-digest) | Compile weekly summaries from git commits with date grouping and stats. |
| [**task-prioritizer**](task-prioritizer) | Score tasks using Eisenhower matrix. Keyword-based urgency/importance with quadrant assignment. |
| [**voice-memo-processor**](voice-memo-processor) | Process voice memo transcripts into structured notes. Strips filler words, extracts key points. |
| [**journal-prompt**](journal-prompt) | Generate journaling prompts based on time of day. Morning, evening, and gratitude modes. |
| [**pomodoro-logger**](pomodoro-logger) | Track pomodoro sessions with persistent log. Start/stop/summary with daily stats. |
| [**inbox-sorter**](inbox-sorter) | Categorize email subjects by type (action, meeting, newsletter, urgent) with suggested actions. |
| [**meeting-agenda**](meeting-agenda) | Generate structured agendas with time allocations, topic types, and action item templates. |
| [**note-linker**](note-linker) | Find connections between markdown notes by shared keywords. Connection scoring. |
| [**time-estimator**](time-estimator) | Estimate task durations with planning fallacy correction. Three-point estimates. |
| [**personal-changelog**](personal-changelog) | Generate personal changelogs from git or manual input. What you shipped this week. |
| [**feedback-formatter**](feedback-formatter) | Structure feedback using SBI framework (Situation, Behavior, Impact). |
| [**okr-tracker**](okr-tracker) | Track OKRs with progress bars, confidence levels, and persistent data. |
| [**retro-generator**](retro-generator) | Generate retrospective templates (Start/Stop/Continue, 4Ls, Sailboat). |
| [**reading-list-manager**](reading-list-manager) | Manage reading lists with status tracking, ratings, and persistent storage. |
| [**slack-formatter**](slack-formatter) | Convert markdown to Slack mrkdwn format. Announcement and status templates. |
| [**daily-planner**](daily-planner) | Generate morning plans with time blocks and evening review templates. |
