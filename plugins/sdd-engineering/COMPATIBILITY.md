# Compatibility — sdd-engineering

| Requirement | Version | Why |
| --- | --- | --- |
| Claude Code | `>=2.1.110` | version-constrained plugin `dependencies` (`^1.0.0`) used by this release |
| Claude Code (tested) | 2.1.267 | `agent_type` in PreToolUse hook input (the guard), namespaced `skills:` preload, `${CLAUDE_PLUGIN_ROOT}` in agent bodies, `${CLAUDE_SKILL_DIR}` in skills — all verified on this build |
| Node.js | `>=18` | `spec-lint.mjs`, `spec-admin.mjs`, `plan-admin.mjs`, `workflow-check.mjs`, guard hook |
| bash, git | any recent | `capture-gates.sh`, `append-insight.sh`, diffs |

Dependencies: `engineering-paved-path@^1.0.0`, `research-tools@^1.0.0`,
`architecture-review@^1.0.0`.

Not supported: running the agents outside a git repository (gates and diffs need one).
