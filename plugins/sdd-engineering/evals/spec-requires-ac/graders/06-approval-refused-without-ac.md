---
type: command
command: 'mkdir -p .eval-gate && git show main:specs/note-colours.md > .eval-gate/uncovered.md && node "$EVAL_SDD_ROOT/skills/spec-writing/scripts/spec-admin.mjs" approve .eval-gate/uncovered.md; test "$?" -eq 1'
critical: true
---
The plugin's own approval gate must refuse (exit 1) the original draft, whose P1 story US-2 has no acceptance criterion.
