# Changelog — sdd-engineering

## 1.1.0 — 2026-10-21
- spec-creator does not finish a spec while a mandatory requirement (a P1 or P2 story) has no
  acceptance criterion; `spec-lint.mjs` reports it as an ERROR, so `spec-admin.mjs approve`
  refuses too. Backward-compatible: specs that already cover their P1/P2 stories are unaffected.
- Routing: `spec-to-plan` also covers finishing/revising a spec, and `spec-writing` says it
  is not for the main session (description + a redirect at the top of its body) — on 1.0.0
  the main session edited a spec itself, bypassing spec-creator and its guard.
- New eval `spec-requires-ac` (incl. a deterministic check that `spec-admin.mjs approve`
  refuses the uncovered draft); new unit test for the rule.
- Fixed: `capture-gates.sh` executed the first backticked text on a gate line even when it
  was a note ("Expected: only `x.test.tsx:81` matches" → rc 127). Only a command that opens
  the numbered line is run; found by the first install in another project.

## 1.0.0 — 2026-10-21
- Initial release, extracted from DevDigest's `.claude/` SDD pipeline and generalized:
  - agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`;
  - skills `spec-to-plan` (entry-point orchestrator for spec rounds → approval → plan),
    `spec-writing` (template, `spec-lint.mjs`, `spec-admin.mjs`), `run-plan`
    (`plan-admin.mjs`, `capture-gates.sh`), `workflow-retro` (`workflow-check.mjs`,
    `append-learning.mjs`, `append-ledger.mjs`), `engineering-insights` (`append-insight.sh`);
  - `hooks/agent-guard.mjs` keyed on `agent_type` (plugin agents cannot carry `hooks:`).
- Paths are explicit inputs (`.sdd/config.json`, defaults `specs/` and `docs/plans/`);
  gate commands are discovered, and a missing test command is reported, never invented.
- Dependencies: `engineering-paved-path@^1.0.0`, `research-tools@^1.0.0`,
  `architecture-review@^1.0.0`; all cross-plugin references are namespaced.
- Dropped from the DevDigest original: parallel workstreams, the security-reviewer and
  test-writer stages; DevDigest's `/spec` + `/feature` orchestrators are replaced by the
  generic `spec-to-plan` skill.
- Agent prompts deduplicated (cost experiment, see docs/COST-BASELINE.md): EARS/ID rules
  only in the preloaded `spec-writing` skill; gate discovery, the no-test-command protocol and
  the Run notes format moved to the on-demand `sdd-conventions` references (−11 % agent
  prompt bytes).
- `run-plan` spawns every agent in the foreground (a background agent can outlive a
  headless session).
