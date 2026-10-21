---
type: command
command: 'awk "/^## Acceptance criteria/{f=1;next} /^## /{f=0} f" specs/note-colours.md | grep -q "(US-2"'
critical: true
---
