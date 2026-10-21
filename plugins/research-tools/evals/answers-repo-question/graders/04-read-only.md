---
type: command
command: 'git diff --quiet HEAD && test -z "$(git status --porcelain)"'
critical: true
---
