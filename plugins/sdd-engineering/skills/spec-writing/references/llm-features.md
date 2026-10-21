# Specifying LLM features

Model output is nondeterministic, it costs money, and it's untrusted. A spec for a
feature that adds or changes a model call, a prompt section, or review output has to pin
down all of the following. Behaviour only: say which prompt section changes, never the
prompt text itself.

| Concern | What the spec states | Example criterion |
| --- | --- | --- |
| **Provenance** | Each input to the call, tagged `[deterministic]`, `[reused]` or `[new: N LLM call(s)]`. Prefer deterministic. | — |
| **Output contract** | The structured shape at the boundary (fields and allowed values), plus what happens to output that breaks it. | IF the model returns output that fails the review schema, THEN the system SHALL mark the run failed with reason "invalid model output". |
| **Grounding** | Every finding cites a file and line inside the diff; ungrounded findings are dropped. Any score derived from model output is recomputed deterministically, never taken from the model. | The system SHALL discard any finding whose cited line is not in the reviewed diff. |
| **Nondeterminism** | Acceptance by threshold over a fixed set, never by exact text. | WHEN the feature runs on the golden set, the system SHALL flag ≥ 8 of the 10 seeded defects. |
| **Cost** | A token or USD budget per run, and which model tier. | NF-n [cost] The system SHALL add at most 1 LLM call per review run. |
| **Latency and deadline** | The time budget, and what happens at the per-run deadline. | IF the run exceeds its deadline, THEN the system SHALL stop it and show "Timed out". |
| **Fallback** | Provider down, rate-limited, or key missing. | IF no provider key is configured, THEN the system SHALL skip the step and record why in the run trace. |
| **Injection posture** | Untrusted text (PR body, diff, repo docs, fetched links) goes into the prompt only inside an untrusted wrapper and is never followed. | The system SHALL pass repository documents to the model only inside the untrusted project-context section. |
| **Observability** | What the user or operator can see afterwards (inputs read, sizes, cost). | WHEN a review run completes, the system SHALL list every project-context document it read in the run trace. |
| **Size limits** | A cap per input and per prompt section, plus what gets dropped first. | IF the selected documents exceed the section budget, THEN the system SHALL drop the lowest-ranked documents first. |
| **Toggle** | An env flag or per-agent switch, and the default. | WHERE project context is disabled, the system SHALL omit the section and record that it was skipped. |

Questions to ask when these aren't stated:
- the budget number;
- whether the feature stays on when no provider is configured;
- how big the golden set is and who owns it;
- what happens to findings already stored when the logic changes (backward
  compatibility).
