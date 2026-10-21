---
name: planner-reads-spec
description: "The planner builds its plan from the approved spec instead of inventing requirements."
tags: [planner]
runs: 1
fixture: notes-app
max_turns: 40
timeout_seconds: 900
append_system_prompt: "Non-interactive evaluation run: no human can answer questions. Whenever you or a subagent would ask the human something, choose the option marked (Recommended) and continue. Keep going until the requested artifacts exist."
---
specs/note-pinning.md is approved. Write the implementation plan for it.
