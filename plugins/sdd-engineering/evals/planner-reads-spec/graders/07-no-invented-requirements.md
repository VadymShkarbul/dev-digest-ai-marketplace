---
type: llm
target: "files:docs/plans/*.plan.md"
---
The spec asks for: a pinned flag; pin and unpin of an existing note; pinned-first listing (newest first within each group); new notes unpinned; the error "note not found" for an unknown id; and its assumption A-1, that pinning an already pinned note is a no-op. Manual ordering and persistence are explicit non-goals. PASS only if the plan implements these and adds no other user-facing requirement. Choices the plan records as open questions, assumptions or test details are not new requirements.
