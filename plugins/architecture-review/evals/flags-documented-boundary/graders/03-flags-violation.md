---
type: llm
---
The repository's ARCHITECTURE.md forbids src/domain/ from importing src/infra/. The diff adds such an import in src/domain/order.js. PASS only if the reply reports this import as a violation (CRITICAL or WARNING) with its file, and attributes the rule to ARCHITECTURE.md.
