---
type: llm
target: "files:docs/plans/*.plan.md"
---
The spec asks only for: a pinned flag, pin and unpin of an existing note, pinned-first listing (newest first within each group), new notes unpinned, and the error "note not found" for an unknown id. Manual ordering and persistence are explicit non-goals. PASS only if the plan implements exactly these and adds no other user-facing requirement.
