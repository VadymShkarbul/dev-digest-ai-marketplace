---
name: spec-requires-ac
description: "1.1.0: spec-creator does not finish a spec while a mandatory (P1/P2) story has no acceptance criterion."
tags: [spec, v1.1.0]
runs: 1
fixture: notes-app
max_turns: 30
timeout_seconds: 900
append_system_prompt: "Non-interactive evaluation run: no human can answer questions. Whenever you or a subagent would ask the human something, choose the option marked (Recommended) and continue."
---
specs/note-colours.md is a draft. Get it finished so it's ready for my approval — don't write a plan or any code.
