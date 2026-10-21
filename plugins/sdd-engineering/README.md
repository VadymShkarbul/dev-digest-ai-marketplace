# sdd-engineering

A spec-driven development workflow for Claude Code: write the **what** (spec), plan the
**how** (plan), execute it with independent review, and learn from the run.

```
you ─► sdd-engineering:spec-creator ──questions──► you ──answers──► … ─► specs/<slug>.md (draft)
         (delegates discovery to research-tools:researcher)            │ you approve: spec-admin.mjs approve
                                                                        ▼
       sdd-engineering:implementation-planner ──questions──► you ─► docs/plans/NNN-<slug>.plan.md
                                                                        │ /sdd-engineering:run-plan <plan>
                                                                        ▼ (you approve the plan)
       sdd-engineering:implementer ─► gates ─► architecture-review:architecture-reviewer
                                             ─► sdd-engineering:plan-verifier ─► PASS / fix round
                                                                        │
       /sdd-engineering:workflow-retro (manual) ◄───────────────────────┘
```

## Components

| Component | Kind | What it does |
| --- | --- | --- |
| `spec-creator` | agent | writes ONE spec (stories, EARS acceptance criteria, edge cases), returns questions |
| `implementation-planner` | agent | reviews requirements, asks questions, writes ONE plan |
| `implementer` | agent | executes an **approved** plan, runs its gates, reports |
| `plan-verifier` | agent | read-only item-by-item conformance check → `PASS`/`INCOMPLETE` |
| `spec-to-plan` | skill (auto) | entry point: runs spec-creator rounds, the human approval, then the planner |
| `spec-writing` | skill (reference) | template, EARS rules, references; `spec-lint.mjs`, `spec-admin.mjs` (preloaded into spec-creator) |
| `run-plan` | skill (`/sdd-engineering:run-plan`, manual) | orchestrates implement → gates → review → fix loop |
| `workflow-retro` | skill (`/sdd-engineering:workflow-retro`, manual) | measures a run from Claude Code transcripts, proposes learnings |
| `engineering-insights` | skill | appends verified insights to a module's `INSIGHTS.md` |
| `hooks/agent-guard.mjs` | hook | write scope + read-only Bash for this plugin's agents (keys on `agent_type`) |

Dependencies (installed automatically): `engineering-paved-path` (technical skills the
implementer loads by name), `research-tools` (delegated discovery), `architecture-review`
(the independent review gate).

## Start

```text
> I want a spec and a plan for <feature>.
```

The `spec-to-plan` skill takes it from there: it delegates to `sdd-engineering:spec-creator`,
relays its questions to you and sends your answers back (up to 3 rounds), asks you to
approve the spec, then runs `sdd-engineering:implementation-planner`, which asks its own
questions and writes the plan. Run it
with `/sdd-engineering:run-plan docs/plans/001-<slug>.plan.md`.

## Where the workflow reads and writes

| Artifact | Default path | Override (`.sdd/config.json`) | Written by |
| --- | --- | --- | --- |
| Spec | `specs/<slug>.md` | `"specsDir"` | spec-creator (draft); `spec-admin.mjs` (status — the human) |
| Spec index (optional) | `specs/README.md` | — | spec-creator (one line, Edit only) |
| Plan | `docs/plans/NNN-<slug>.plan.md` | `"plansDir"` | implementation-planner; `plan-admin.mjs` (approval — the human) |
| Gate commands | discovered (below) | `"gates": { "typecheck": "…", "test": "…" }` | — |
| Code | wherever the plan says | — | implementer |
| Run artifacts | `$TMPDIR/sdd-engineering/<NNN-slug>/` | — | run-plan (`capture-gates.sh`) |
| Agent learnings | `.sdd/learnings/<agent>.md` | — | workflow-retro (`append-learning.mjs`) |
| Retro ledger / history | `.sdd/ledger.md`, `.sdd/workflow-history.jsonl` | — | workflow-retro |
| Insights | `<module>/INSIGHTS.md` | — | engineering-insights (`append-insight.sh`) |

Example `.sdd/config.json`:

```json
{ "specsDir": "docs/specs", "plansDir": "docs/plans", "gates": { "typecheck": "pnpm typecheck", "test": "pnpm test" } }
```

Commit `specs/`, `docs/plans/`, `.sdd/learnings/` and `.sdd/ledger.md`; they are project
knowledge. The plugin never writes outside these paths and the code the approved plan names.

## Gates and "no test command found"

Gate commands are discovered in this order: `.sdd/config.json` `gates` → commands named in
`CLAUDE.md`/`AGENTS.md` → manifest scripts (`package.json`, `Makefile`, `pyproject.toml`,
`go test`, `cargo test`) → CI workflow steps.

If **no test command** is found, nobody invents one:

1. the planner records `Test command: NOT FOUND (searched: …)` and asks you whether to add a
   test step or accept named `manual:` checks;
2. the implementer reports `test: not run — no test command found` and never installs a
   test runner on its own;
3. `capture-gates.sh` records `not run — no command`, never a pass;
4. plan-verifier marks the dependent items `not verifiable` → `INCOMPLETE`, unless the plan
   records your decision to accept the manual checks.

## Guardrails

- **Approval is human-only.** `plan-admin.mjs approve` and `spec-admin.mjs approve` run in
  the main session; the guard hook blocks them inside every sdd-engineering agent, and blocks
  a planner write that carries an `**Approved:**` line.
- **Write scopes.** spec-creator → `<specsDir>/*.md`; planner → `<plansDir>/NNN-*.plan.md`;
  implementer → anything except specs, plans, `.sdd/`, lock files; plan-verifier → nothing.
- **Read-only Bash** for spec-creator, planner and plan-verifier (no redirection into the repo,
  no `sed -i`, git writes, installs or network).
- **Untrusted input is data** in every agent prompt (designs, repo docs, diffs, reports).
- **Project instructions win.** The agents read `CLAUDE.md`/`AGENTS.md`; the plugin adds no
  `CLAUDE.md` of its own and never overrides project rules.
- **workflow-retro is manual-only** (`disable-model-invocation: true`).

## Requirements

See `COMPATIBILITY.md`.
