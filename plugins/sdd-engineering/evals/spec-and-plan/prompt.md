---
name: spec-and-plan
description: "The fixed SDD scenario: a user asks for a spec and a plan for a small feature. Used for the cost baseline."
tags: [scenario, cost, spec, planner]
runs: 3
fixture: notes-app
max_turns: 60
timeout_seconds: 1200
append_system_prompt: "Non-interactive evaluation run: no human can answer questions. Whenever you or a subagent would ask the human something, choose the option marked (Recommended) and continue. Keep going until the requested artifacts exist. The user approves the spec as soon as it lints clean."
---
I'd like to add tags to notes in this project: a note can get and lose tags, and I can list the notes that have a given tag. Please prepare a proper spec for it and then an implementation plan. Don't write any code yet.
