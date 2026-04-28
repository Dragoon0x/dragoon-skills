# changelog

## v1.2.1 / 2026-04-28

patch release. one fix.

### fixed

- **macOS / symlinked-base path resolution.** `resolveSafe` was comparing the realpath of a target against the lexical (non-realpath) of the base. on macOS, `/tmp` is a symlink to `/private/tmp`, so any write under `/tmp` false-rejected with "path resolves through symlink outside base." this also affected linux/macOS users whose project lives under any symlinked path (e.g. `/Users/x/Code` → `/Volumes/SSD/Code`).
- the fix realpaths the base too, then computes the effective realpath of the target by walking up to the deepest existing ancestor and appending the unresolved tail. realpath-to-realpath comparison.
- new regression test simulates the macOS shape on linux so this never regresses.

### no other behavior changes

- 36 commands unchanged
- security boundaries unchanged (escape-by-`..` still rejected, true symlink-out-of-base still rejected)
- 210 tests passing (was 209, +1 regression)

## v1.2.0 / 2026-04-28

initial public release.

- 36 commands across 8 phases: recon, review, build, plan, ship, test, reflect, power
- shared engines under `lib/`
- every command reads or writes `dragoon.json`
- 209 tests, zero npm dependencies
- security-validated: shell injection blocked in `canary`, path traversal blocked in `freeze` and `forge`, file-inclusion sandbox in `second-opinion`, key/value/count limits in `memory`
