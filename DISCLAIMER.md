# disclaimer

dragoon is experimental research-grade tooling for design hygiene in ai-coded projects.

## what dragoon is

a heuristic scanner. it reads your source files with regex-level parsing, infers structural patterns, and outputs measurements and findings. those findings are useful guidance, not legal compliance, not gospel.

## what dragoon is not

not a security tool. not a legal compliance audit. not an accessibility audit (it surfaces a few accessibility signals; it does not replace a real wcag audit). not a substitute for human design review.

## how to use it well

- always validate findings against your actual design system.
- treat scores as relative, not absolute. compare your project to itself over time.
- the inference is heuristic. expect false positives. the rules are tuned to be useful at scale, not perfect on any single file.
- edit `dragoon.json` rules by hand when the auto-derived defaults don't match your intent.

## privacy

dragoon makes no network calls. it reads files locally and writes one json file locally. no telemetry. no analytics. no cloud.

## warranty

none. see LICENSE for the full mit terms. the software is provided as is.

## learning in public

dragoon is built openly. issues, prs, and proposals welcome. the goal is design quality tooling that respects the realities of shipping software with ai. it's not perfect. it improves with use.
