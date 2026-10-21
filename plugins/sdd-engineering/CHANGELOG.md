# Changelog — sdd-engineering

## 1.0.0 — 2026-10-21
- Initial release, extracted from DevDigest's `.claude/` SDD pipeline and generalized:
  - agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`;
  - skills `spec-writing` (template, `spec-lint.mjs`, `spec-admin.mjs`), `run-plan`
    (`plan-admin.mjs`, `capture-gates.sh`), `workflow-retro` (`workflow-check.mjs`,
    `append-learning.mjs`, `append-ledger.mjs`), `engineering-insights` (`append-insight.sh`);
  - `hooks/agent-guard.mjs` keyed on `agent_type` (plugin agents cannot carry `hooks:`).
- Paths are explicit inputs (`.sdd/config.json`, defaults `specs/` and `docs/plans/`);
  gate commands are discovered, and a missing test command is reported, never invented.
- Dependencies: `engineering-paved-path@^1.0.0`, `research-tools@^1.0.0`,
  `architecture-review@^1.0.0`; all cross-plugin references are namespaced.
- Dropped from the DevDigest original: parallel workstreams, the security-reviewer and
  test-writer stages, `/feature` and `/spec` orchestrator skills (DevDigest-specific).
