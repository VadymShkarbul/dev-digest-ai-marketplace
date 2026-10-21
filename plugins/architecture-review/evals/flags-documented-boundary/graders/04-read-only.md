---
type: command
command: 'test "$(git status --porcelain | wc -l | tr -d " ")" = 1'
critical: true
---
