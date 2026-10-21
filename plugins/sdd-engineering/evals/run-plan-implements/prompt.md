---
name: run-plan-implements
description: "run-plan hands an approved plan to the implementer, runs the gates and the independent review gate."
tags: [run-plan, expensive]
runs: 1
fixture: notes-app
max_turns: 80
timeout_seconds: 1500
append_system_prompt: "Non-interactive evaluation run: no human can answer questions. Whenever you or a subagent would ask the human something, choose the option marked (Recommended) and continue. Keep going until the requested artifacts exist. The human has already approved the plan."
---
/sdd-engineering:run-plan docs/plans/001-note-pinning.plan.md
