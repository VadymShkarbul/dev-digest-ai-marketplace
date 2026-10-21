---
type: llm
target: "files:docs/plans/*.plan.md"
---
PASS only if ALL hold: (1) every requirement in the plan traces to the spec (a Spec traceability table maps AC ids to steps); (2) the plan does not add features beyond tagging notes (no persistence, UI, search or sharing); (3) steps name concrete files under src/ and test/; (4) the verification gates use npm test.
