#!/usr/bin/env bash
#
# Append insights to a module's INSIGHTS.md — append-only, verified.
#
#   append-insight.sh <module> <section> <entry>   # one entry (capture-as-you-go)
#   append-insight.sh <module> --batch <file>      # many entries (session wrap-up)
#   append-insight.sh <module> --init              # create <module>/INSIGHTS.md with the 7 sections
#
# <module>   a repo-relative directory that holds (or, with --init, will hold) INSIGHTS.md —
#            e.g. "client", "packages/api", or "." for the repository root
# <section>  one of the 7 headings already in the file — must match exactly
# <file>     TSV, one "Section<TAB>entry" per line; blank lines and #-comments ignored
#
# The repository root is the git top-level of the CURRENT directory (the script itself
# lives in the plugin cache). Entries are inserted directly under their section heading.
# EVERY entry is date-stamped automatically: "Session Notes" as "YYYY-MM-DD — ", all
# other sections as a "[YYYY-MM-DD]" prefix. Cite a file:line in the text.
#
# Nothing is written unless EVERY row validates first AND the resulting diff is
# additions-only — so existing entries cannot be reordered, overwritten or lost.
#
# Exit codes: 0 ok · 1 usage · 2 bad module · 3 bad section · 4 verification failed

set -euo pipefail

die() { printf '%s\n' "$2" >&2; exit "$1"; }

usage() {
  sed -n '3,22p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2
  exit 1
}

[ $# -ge 2 ] || usage

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die 2 "append-insight: run it from inside the project's git repository"
MODULE="${1%/}"; shift

# ---- module -----------------------------------------------------------------
case "$MODULE" in
  /*|*..*) die 2 "append-insight: module must be a repo-relative directory without '..': '$MODULE'" ;;
esac
[ -d "$ROOT/$MODULE" ] || die 2 "append-insight: no such directory in the repository: $MODULE"

if [ "${1:-}" = "--init" ]; then
  [ -f "$ROOT/$MODULE/INSIGHTS.md" ] && die 1 "append-insight: $MODULE/INSIGHTS.md already exists"
  cat > "$ROOT/$MODULE/INSIGHTS.md" <<'TEMPLATE'
# Engineering insights

<!-- Append-only. Written through the sdd-engineering engineering-insights skill
(append-insight.sh). Read this file before working in this module. -->

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors

## Session Notes

## Open Questions
TEMPLATE
  printf 'append-insight: created %s/INSIGHTS.md\n' "$MODULE"
  exit 0
fi

FILE="$ROOT/$MODULE/INSIGHTS.md"
[ -f "$FILE" ] || die 2 "append-insight: no $MODULE/INSIGHTS.md — create it with: append-insight.sh $MODULE --init"

# ---- collect (section, entry) pairs ------------------------------------------
TMPDIR_="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_"' EXIT
PAIRS="$TMPDIR_/pairs.tsv"
: > "$PAIRS"

if [ "$1" = "--batch" ]; then
  [ $# -eq 2 ] || usage
  BATCH="$2"
  [ -f "$BATCH" ] || die 1 "append-insight: no such batch file: $BATCH"
  # Strip comments/blank lines; keep everything else verbatim.
  grep -v -e '^[[:space:]]*$' -e '^[[:space:]]*#' "$BATCH" > "$PAIRS" || true
  [ -s "$PAIRS" ] || die 1 "append-insight: batch file '$BATCH' has no entries"
else
  [ $# -eq 2 ] || usage
  printf '%s\t%s\n' "$1" "$2" > "$PAIRS"
fi

# ---- validate EVERY row before touching anything -----------------------------
TOTAL=0
while IFS=$'\t' read -r section entry rest; do
  [ -n "${section:-}" ] || die 3 "append-insight: row with empty section name"
  [ -n "${entry:-}" ]   || die 3 "append-insight: no entry text for section '$section'"
  [ -z "${rest:-}" ]    || die 3 "append-insight: row for '$section' has extra tab-separated fields"

  count=$(grep -Fxc "## $section" "$FILE" || true)
  if [ "$count" != "1" ]; then
    die 3 "$(printf 'append-insight: section "%s" matched %s headings in %s (need exactly 1).\nValid sections in this file:\n%s' \
      "$section" "$count" "$FILE" "$(grep '^## ' "$FILE" | sed 's/^## /  - /')")"
  fi
  TOTAL=$((TOTAL + 1))
done < "$PAIRS"

# ---- date-stamp every entry --------------------------------------------------
# Session Notes keep the "YYYY-MM-DD — " style; all other sections get a
# "[YYYY-MM-DD] " prefix so each line carries its own date next to its file:line.
# Rows that already start with their date are left as-is (re-stamping is a no-op).
TODAY="$(date +%F)"
STAMPED="$TMPDIR_/stamped.tsv"
awk -F'\t' -v OFS='\t' -v today="$TODAY" '
  $1 == "Session Notes" {
    if ($2 !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2} /) $2 = today " — " $2
    print; next
  }
  $2 !~ /^\[[0-9]{4}-[0-9]{2}-[0-9]{2}\] / { $2 = "[" today "] " $2 }
  { print }
' "$PAIRS" > "$STAMPED"

# ---- build the new file ------------------------------------------------------
NORM="$TMPDIR_/orig.md"
cp "$FILE" "$NORM"
if [ -n "$(tail -c1 "$NORM")" ]; then echo >> "$NORM"; fi   # tolerate a missing final newline

NEW="$TMPDIR_/new.md"
awk -v ins="$STAMPED" '
  function emit(s,   i) { for (i = 1; i <= n[s]; i++) print "- " e[s, i] }
  BEGIN {
    FS = "\t"
    while ((getline line < ins) > 0) {
      split(line, a, "\t")
      n[a[1]]++
      e[a[1], n[a[1]]] = a[2]
    }
  }
  substr($0, 1, 3) == "## " {
    if (awaiting) { emit(cur); awaiting = 0 }        # previous section had no body at all
    print
    cur = substr($0, 4)
    awaiting = (cur in n) ? 1 : 0
    next
  }
  awaiting {
    if (substr($0, 1, 4) == "<!--") { print; emit(cur) }   # keep the template hint on top
    else                            { emit(cur); print }
    awaiting = 0
    next
  }
  { print }
  END { if (awaiting) emit(cur) }                    # section was the last line in the file
' "$NORM" > "$NEW"

# ---- verify: additions only, exact count -------------------------------------
old_lines=$(grep -c '' "$NORM")
new_lines=$(grep -c '' "$NEW")
expected=$((old_lines + TOTAL))
[ "$new_lines" -eq "$expected" ] ||
  die 4 "append-insight: refusing to write — expected $expected lines, produced $new_lines. $FILE is untouched."

removed=$(diff "$NORM" "$NEW" | grep -c '^<' || true)
[ "$removed" -eq 0 ] ||
  die 4 "append-insight: refusing to write — the result would drop or alter $removed existing line(s). $FILE is untouched."

# ---- commit ------------------------------------------------------------------
mv "$NEW" "$FILE"
printf 'append-insight: added %s entr%s to %s/INSIGHTS.md\n\n' \
  "$TOTAL" "$([ "$TOTAL" -eq 1 ] && echo y || echo ies)" "$MODULE"
diff "$NORM" "$FILE" || true
