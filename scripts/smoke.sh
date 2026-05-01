#!/usr/bin/env bash
# end-to-end smoke test for the full dragoon skill pack (36 commands)
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
FIXTURE="${DIR}/test/fixtures/sample-project"
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

cp -a "${FIXTURE}/." "${TMP}/"
DRAGOON="node ${DIR}/bin/dragoon"

cd "$TMP"

# initialize a real git repo so land/retro/freeze/second-opinion have context
git init -q
git config user.email "smoke@dragoon.test"
git config user.name "smoke"
git add -A
git commit -q -m "initial fixture"

###############################################################################
echo "=== recon ==="
NO_COLOR=1 $DRAGOON scan --quiet
[ -f dragoon.json ] || { echo "FAIL: dragoon.json missing"; exit 1; }
echo "  scan ok"

NO_COLOR=1 $DRAGOON map > /dev/null
echo "  map ok"

NO_COLOR=1 $DRAGOON research "test research topic" --apply --overwrite > /dev/null
ls .dragoon/research/ | grep -q "research-test-research-topic-" || { echo "FAIL: research"; exit 1; }
echo "  research ok"

NO_COLOR=1 $DRAGOON inventory > /dev/null
echo "  inventory ok"

###############################################################################
echo ""
echo "=== review ==="
set +e
NO_COLOR=1 $DRAGOON slop --quiet > /dev/null
slop_exit=$?
set -e
[ $slop_exit -eq 1 ] || { echo "FAIL: slop should exit 1 with findings (got $slop_exit)"; exit 1; }
echo "  slop ok (detected findings)"

NO_COLOR=1 $DRAGOON critique --quiet > /dev/null
echo "  critique ok"

set +e
NO_COLOR=1 $DRAGOON review > /dev/null
set -e
echo "  review ok"

NO_COLOR=1 $DRAGOON investigate "form hangs after upload" --apply --overwrite > /dev/null
ls .dragoon/investigations/ | grep -q "investigate-form-hangs" || { echo "FAIL: investigate"; exit 1; }
echo "  investigate ok"

NO_COLOR=1 $DRAGOON second-opinion "should we use redis or memory cache" --apply --overwrite > /dev/null
ls .dragoon/second-opinion/ | grep -q "should-we-use" || { echo "FAIL: second-opinion"; exit 1; }
echo "  second-opinion ok"

###############################################################################
echo ""
echo "=== build ==="
NO_COLOR=1 $DRAGOON component Card --apply --overwrite --dir src/ui > /dev/null
[ -f src/ui/Card.tsx ] || { echo "FAIL: Card.tsx not created"; exit 1; }
echo "  component ok"

NO_COLOR=1 $DRAGOON typography --apply --overwrite > /dev/null
ls src/styles/tokens.type.* > /dev/null
echo "  typography ok"

NO_COLOR=1 $DRAGOON color --apply --overwrite > /dev/null
ls src/styles/tokens.color.* > /dev/null
echo "  color ok"

NO_COLOR=1 $DRAGOON spacing --apply --overwrite > /dev/null
ls src/styles/tokens.spacing.* > /dev/null
echo "  spacing ok"

NO_COLOR=1 $DRAGOON motion --apply --overwrite > /dev/null
ls src/styles/tokens.motion.* > /dev/null
echo "  motion ok"

###############################################################################
echo ""
echo "=== plan ==="
NO_COLOR=1 $DRAGOON brief "test idea" --apply --overwrite > /dev/null
ls .dragoon/plans/ | grep -q "brief-test-idea-" || { echo "FAIL: brief"; exit 1; }
echo "  brief ok"

NO_COLOR=1 $DRAGOON plan-eng "test idea" --apply --overwrite > /dev/null
echo "  plan-eng ok"

NO_COLOR=1 $DRAGOON plan-design "test idea" --apply --overwrite > /dev/null
echo "  plan-design ok"

NO_COLOR=1 $DRAGOON autoplan "another idea" --apply --overwrite > /dev/null
ls .dragoon/plans/ | grep -q "another-idea" || { echo "FAIL: autoplan"; exit 1; }
echo "  autoplan ok"

###############################################################################
echo ""
echo "=== ship ==="
NO_COLOR=1 $DRAGOON ship --threshold 0 --skip-slop > /dev/null
echo "  ship ok"

NO_COLOR=1 $DRAGOON handoff --apply --overwrite > /dev/null
ls .dragoon/handoff/ | grep -q "handoff" || { echo "FAIL: handoff"; exit 1; }
echo "  handoff ok"

# docs drift detection
echo "Run \`npm run nope\` see \`src/missing.ts\`" > docs-test.md
echo '{"name":"x","scripts":{"test":"echo"}}' > package.json
git add -A && git commit -q -m "docs test"  # commit so working tree stays clean for land
set +e
NO_COLOR=1 $DRAGOON docs > /dev/null
docs_exit=$?
set -e
[ $docs_exit -eq 1 ] || { echo "FAIL: docs should detect drift (exit $docs_exit)"; exit 1; }
echo "  docs ok (detected drift)"
rm -f docs-test.md
git add -A && git commit -q -m "remove docs test"

NO_COLOR=1 $DRAGOON land > /dev/null
echo "  land ok"

NO_COLOR=1 $DRAGOON canary "https://example.com" --apply --overwrite > /dev/null
[ -f scripts/canary.sh ] || { echo "FAIL: canary.sh missing"; exit 1; }
echo "  canary ok"

# verify canary rejects bad input
set +e
NO_COLOR=1 $DRAGOON canary "not a url" 2>/dev/null
canary_bad=$?
set -e
[ $canary_bad -eq 2 ] || { echo "FAIL: canary should reject invalid url (got $canary_bad)"; exit 1; }
echo "  canary input validation ok"

NO_COLOR=1 $DRAGOON storybook --apply --overwrite > /dev/null
[ -f .storybook/main.ts ] || { echo "FAIL: storybook config missing"; exit 1; }
echo "  storybook ok"

###############################################################################
echo ""
echo "=== test ==="
NO_COLOR=1 $DRAGOON qa --apply --overwrite > /dev/null
[ -f playwright.config.ts ] && [ -f tests/e2e/smoke.spec.ts ] && [ -f tests/e2e/run.sh ] || { echo "FAIL: qa"; exit 1; }
echo "  qa ok"

set +e
NO_COLOR=1 $DRAGOON accessibility src > /dev/null
set -e
echo "  accessibility ok"

NO_COLOR=1 $DRAGOON perf --severity high --quiet > /dev/null
echo "  perf ok"

NO_COLOR=1 $DRAGOON diff --apply --overwrite > /dev/null
[ -f playwright.visual.config.ts ] && [ -f tests/visual/snapshots.spec.ts ] && [ -f tests/visual/routes.ts ] || { echo "FAIL: diff"; exit 1; }
echo "  diff ok"

###############################################################################
echo ""
echo "=== reflect ==="
NO_COLOR=1 $DRAGOON retro --apply --overwrite > /dev/null
ls .dragoon/retros/ | grep -q "retro-" || { echo "FAIL: retro"; exit 1; }
echo "  retro ok"

NO_COLOR=1 $DRAGOON memory set test.key "test value" > /dev/null
got=$(NO_COLOR=1 $DRAGOON memory get test.key)
[ "$got" = "test value" ] || { echo "FAIL: memory get returned: $got"; exit 1; }
NO_COLOR=1 $DRAGOON memory list > /dev/null
NO_COLOR=1 $DRAGOON memory remove test.key > /dev/null
NO_COLOR=1 $DRAGOON memory clear --yes > /dev/null
echo "  memory ok (set/get/list/remove/clear)"

# verify memory rejects bad keys
set +e
NO_COLOR=1 $DRAGOON memory set "BADKEY" "value" 2>/dev/null
mem_bad=$?
set -e
[ $mem_bad -eq 2 ] || { echo "FAIL: memory should reject uppercase keys (got $mem_bad)"; exit 1; }
echo "  memory validation ok"

NO_COLOR=1 $DRAGOON benchmark capture > /dev/null
NO_COLOR=1 $DRAGOON benchmark list > /dev/null
sleep 1  # ensure different timestamp
NO_COLOR=1 $DRAGOON benchmark capture > /dev/null
NO_COLOR=1 $DRAGOON benchmark compare > /dev/null
echo "  benchmark ok (capture/list/compare)"

###############################################################################
echo ""
echo "=== power ==="
NO_COLOR=1 $DRAGOON forge "MyTestSkill" --description "test scaffold" --apply --overwrite > /dev/null
[ -f .dragoon/forge/my-test-skill/SKILL.md ] || { echo "FAIL: forge SKILL.md missing"; exit 1; }
[ -f .dragoon/forge/my-test-skill/scripts/my-test-skill.js ] || { echo "FAIL: forge script missing"; exit 1; }
echo "  forge ok"

# verify forge rejects bad names
set +e
NO_COLOR=1 $DRAGOON forge "../etc" --apply 2>/dev/null
forge_bad=$?
set -e
[ $forge_bad -eq 2 ] || { echo "FAIL: forge should reject path traversal (got $forge_bad)"; exit 1; }
echo "  forge validation ok"

NO_COLOR=1 $DRAGOON sync --apply --overwrite > /dev/null
[ -f figma.tokens.json ] || { echo "FAIL: figma.tokens.json missing"; exit 1; }
# verify it's valid JSON with expected shape
node -e 'const o = JSON.parse(require("fs").readFileSync("figma.tokens.json", "utf8")); if (!o.color || !o.spacing) process.exit(1);' || { echo "FAIL: figma tokens shape invalid"; exit 1; }
echo "  sync ok"

NO_COLOR=1 $DRAGOON tailwind --apply --overwrite > /dev/null
[ -f tailwind.config.js ] || { echo "FAIL: tailwind.config.js missing"; exit 1; }
# verify it's a valid module
node -e 'require("./tailwind.config.js");' || { echo "FAIL: tailwind config not loadable"; exit 1; }
echo "  tailwind ok"

NO_COLOR=1 $DRAGOON careful --apply --overwrite > /dev/null
[ -f .dragoon/CAREFUL.md ] || { echo "FAIL: CAREFUL.md missing"; exit 1; }
NO_COLOR=1 $DRAGOON careful --show > /dev/null
echo "  careful ok"

NO_COLOR=1 $DRAGOON freeze add src/legacy --apply > /dev/null
NO_COLOR=1 $DRAGOON freeze list > /dev/null
NO_COLOR=1 $DRAGOON freeze hook --apply > /dev/null
[ -f .dragoon/check-freeze.sh ] || { echo "FAIL: check-freeze.sh missing"; exit 1; }
NO_COLOR=1 $DRAGOON freeze remove src/legacy --apply > /dev/null
echo "  freeze ok (add/list/hook/remove)"

# verify freeze rejects path traversal
set +e
NO_COLOR=1 $DRAGOON freeze add "../etc" --apply 2>/dev/null
freeze_bad=$?
set -e
[ $freeze_bad -eq 2 ] || [ $freeze_bad -eq 1 ] || { echo "FAIL: freeze should reject path traversal (got $freeze_bad)"; exit 1; }
echo "  freeze validation ok"

###############################################################################
echo ""
echo "=== dispatcher ==="
NO_COLOR=1 $DRAGOON --version | grep -q '^1\.2\.0$' || { echo "FAIL: --version"; exit 1; }
echo "  --version ok"
NO_COLOR=1 $DRAGOON --help | grep -q 'dragoon' || { echo "FAIL: --help"; exit 1; }
echo "  --help ok"

set +e
NO_COLOR=1 $DRAGOON nonexistent_command > /dev/null 2>&1
unknown_exit=$?
set -e
[ $unknown_exit -eq 2 ] || { echo "FAIL: unknown command should exit 2"; exit 1; }
echo "  unknown command ok"

echo ""
echo "smoke: all 36 commands + dispatcher operational."
