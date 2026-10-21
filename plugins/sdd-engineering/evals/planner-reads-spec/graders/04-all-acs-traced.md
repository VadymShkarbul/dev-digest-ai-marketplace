---
type: command
command: 'f=$(ls docs/plans/001-*.plan.md) && for id in AC-1 AC-2 AC-3 AC-4 EC-1; do grep -q "$id" "$f" || { echo missing $id; exit 1; }; done'
---
