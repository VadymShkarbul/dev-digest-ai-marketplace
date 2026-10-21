#!/usr/bin/env bash
#
# Neutral gate capture for /sdd-engineering:run-plan.
#
#   capture-gates.sh <plan.md> <artifact-dir> [--diff-only]
#
# Writes into <artifact-dir> (must be under $TMPDIR or /tmp — never the repo):
#   manifest.tsv   one changed path per line (tracked changes + untracked files)
#   diff.patch     `git diff HEAD` plus each untracked file as an "=== untracked <path> ===" block
#   gates.md       one row per command found under the plan's "## Verification gates"
#   logs/NN.log    full output of each gate command
#
# Gate commands are the backticked commands that OPEN a numbered line of the plan's
# "## Verification gates" section ("1. `pnpm test` — …"). A line without a leading
# backticked command (prose, an expected-output note) or one that says NOT FOUND is
# recorded as "not run — no command", never as a pass and never executed. Runs offline; exit 0 even when a gate fails
# (the verdict is in gates.md), 2 on usage errors.

set -uo pipefail

PLAN="${1:-}"; ART="${2:-}"; MODE="${3:-}"
[ -n "$PLAN" ] && [ -n "$ART" ] || { echo "usage: capture-gates.sh <plan.md> <artifact-dir> [--diff-only]" >&2; exit 2; }
[ -f "$PLAN" ] || { echo "capture-gates: plan not found: $PLAN" >&2; exit 2; }
case "$ART" in
  /tmp/*|/private/tmp/*|/var/folders/*|"${TMPDIR:-/nonexistent}"*) ;;
  *) echo "capture-gates: artifact dir must be under \$TMPDIR or /tmp: $ART" >&2; exit 2 ;;
esac

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "capture-gates: not inside a git repository" >&2; exit 2; }
cd "$ROOT" || exit 2
mkdir -p "$ART/logs"

{ git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u > "$ART/manifest.tsv"
{
  git diff HEAD
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    printf '=== untracked %s ===\n' "$f"
    cat "$f"
    printf '\n'
  done < <(git ls-files --others --exclude-standard)
} > "$ART/diff.patch"
echo "manifest: $(wc -l < "$ART/manifest.tsv" | tr -d ' ') files · diff: $ART/diff.patch"

[ "$MODE" = "--diff-only" ] && exit 0

# Extract "1. `cmd` — …" lines from the Verification gates section.
SECTION="$(awk '/^## Verification gates/{f=1;next} /^## /{f=0} f' "$PLAN")"
{
  echo "# Gate results — $(basename "$PLAN") — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "| # | Command | Exit | Result |"
  echo "| --- | --- | --- | --- |"
} > "$ART/gates.md"

n=0
while IFS= read -r line; do
  case "$line" in [0-9]*.*) ;; *) continue ;; esac
  n=$((n + 1))
  cmd="$(printf '%s' "$line" | sed -n 's/^[0-9][0-9]*\.[[:space:]]*`\([^`]*\)`.*/\1/p')"
  if [ -z "$cmd" ] || printf '%s' "$line" | grep -q 'NOT FOUND'; then
    printf '| %d | — | — | not run — no command (%s) |\n' "$n" "$(printf '%s' "$line" | cut -c1-80)" >> "$ART/gates.md"
    echo "gate $n: not run — no command"
    continue
  fi
  log="$ART/logs/$(printf '%02d' "$n").log"
  bash -c "$cmd" > "$log" 2>&1
  rc=$?
  res="✅ pass"; [ "$rc" -ne 0 ] && res="❌ fail — see logs/$(printf '%02d' "$n").log"
  printf '| %d | `%s` | %d | %s |\n' "$n" "$cmd" "$rc" "$res" >> "$ART/gates.md"
  echo "gate $n: rc=$rc $cmd"
done <<< "$SECTION"

[ "$n" -eq 0 ] && { echo "| — | — | — | not run — the plan lists no verification gates |" >> "$ART/gates.md"; echo "no gates listed in the plan"; }
exit 0
