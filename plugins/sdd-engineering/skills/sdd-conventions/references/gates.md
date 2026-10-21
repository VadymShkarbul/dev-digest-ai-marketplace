# Gates and "no test command found"

## Discovery order

Stop at the first source that names the command:

1. `.sdd/config.json` → `gates` (`{ "typecheck": "…", "test": "…" }`)
2. commands named in the project's `CLAUDE.md` / `AGENTS.md`
3. manifest scripts: `package.json` (`typecheck`, `test`), `Makefile` targets,
   `pyproject.toml` tool config, `go test ./...` for a Go module, `cargo test`
4. CI workflow steps (`.github/workflows/*.yml`)

Record the exact command and where you found it.

## No test command

Nobody invents one, and nobody installs a test runner on their own.

| Agent | What it does |
| --- | --- |
| implementation-planner | records `Test command: NOT FOUND (searched: …)` and asks the human whether to add a test step or accept named `manual:` checks |
| implementer | reports `test: not run — no test command found (searched: …)` and lists each `manual:` check it performed with its outcome |
| capture-gates.sh | writes `not run — no command`, never a pass |
| plan-verifier | marks the dependent items `not verifiable — no test command` (verdict `INCOMPLETE`), unless the plan records the human's decision to accept a `manual:` check — then performs it if it can (read the code path) or marks it `NOT MECHANICALLY CHECKABLE — needs a human` |
