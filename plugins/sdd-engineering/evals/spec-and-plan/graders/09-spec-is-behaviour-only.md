---
type: llm
target: "files:specs/*.md"
---
PASS only if ALL hold: (1) the spec's stories cover adding a tag to a note, removing a tag, and listing the notes that have a given tag; (2) the acceptance criteria and stories describe behaviour only — no file paths, function names or code; (3) at least one edge case covers an invalid or missing input. Ignore wording style.
