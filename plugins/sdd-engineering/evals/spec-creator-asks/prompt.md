---
name: spec-creator-asks
description: "spec-creator drafts a spec and returns clarifying questions instead of guessing high-impact unknowns."
tags: [spec]
runs: 1
fixture: notes-app
max_turns: 20
timeout_seconds: 600
---
Draft a spec for "notes can be exported". Don't answer any clarifying questions yourself — just show me the questions the spec author raises, and stop there.
