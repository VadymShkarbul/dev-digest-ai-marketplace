---
type: llm
target: "files:specs/*.md"
---
PASS only if ALL hold: (1) the spec describes tagging behaviour (adding a tag, removing a tag, listing notes by tag); (2) every acceptance criterion is a single EARS sentence with SHALL; (3) stories and criteria contain no file paths, function names or code; (4) at least one edge case covers an invalid or missing input.
