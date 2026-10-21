# architecture-review

`architecture-review:architecture-reviewer` — a **read-only** architecture review of a diff
against **the repository's own** rules. It ships no hard-coded boundaries: at run time it
reads the repository's `CLAUDE.md`/`AGENTS.md`, `ARCHITECTURE.md`, `docs/architecture*`,
ADRs and dependency-rule configs, and runs the architecture gate the repository declares
(if any). For the stacks the diff touches it loads `engineering-paved-path` skills.

## Use

```text
@agent-architecture-review:architecture-reviewer review the diff of this branch against main
```

`sdd-engineering:run-plan` calls it as the first step of its full review.

## Teach it your rules

Nothing to configure in the plugin. Document the rules in the repository:

- layering / module-boundary rules in `ARCHITECTURE.md` or `CLAUDE.md`;
- the gate, if you have one: a script (`"arch": "depcruise …"`) or a line
  `Architecture gate: <command>` in `CLAUDE.md`. A repository with **no** documented
  rules gets a skill-derived review, labelled as such.

## What it reads and writes

- **Reads:** the diff, the documents above, `.sdd/learnings/architecture-reviewer.md`.
- **Writes:** nothing (`tools: Read, Grep, Glob, Bash, Skill`; `hooks/readonly-guard.mjs`
  blocks mutating shell commands inside this agent).
- **Runs:** only the gate command the repository declares.

## Dependencies

- `engineering-paved-path@^1.0.0` — stack skills (`frontend-ui-architecture` is preloaded).
