---
type: command
command: 'set -e; n=0; for f in specs/*.md; do [ "$(basename "$f")" = README.md ] && continue; n=$((n+1)); node "$EVAL_SDD_ROOT/skills/spec-writing/scripts/spec-lint.mjs" "$f"; done; [ "$n" -ge 1 ]'
critical: true
---
