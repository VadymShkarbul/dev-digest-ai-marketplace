# Extraction inventory — DevDigest `.claude/` → marketplace

Every component of the DevDigest harness, sorted into the four buckets of
[PLUGIN-GUIDELINES § 1](PLUGIN-GUIDELINES.md#1-boundaries--what-belongs-in-a-plugin). For
each extracted file: its owner, the consumer scenario, and why it releases together with
the rest of its plugin. Source snapshot: DevDigest `L08` branch at `70ff9bd` (2026-10-21).

## 1. Reusable → extracted

| DevDigest source | Plugin · path | Owner | Consumer scenario | Why it releases with this plugin | Generalization |
| --- | --- | --- | --- | --- | --- |
| `.claude/agents/spec-creator.md` | sdd-engineering · `agents/spec-creator.md` | AI Engineering | "write a spec for feature X" | first stage of the SDD contract (spec format ↔ planner ↔ verifier) | `/spec` scope file + hook → plugin guard by `agent_type`; `specs/` from `.sdd/config.json`; DevDigest exclusions and packages removed |
| `.claude/agents/implementation-planner.md` | sdd-engineering · `agents/implementation-planner.md` | AI Engineering | "plan this spec" | consumes the spec format, produces the plan format run-plan/verifier parse | DevDigest constraint register (onion, vendor copies, migrations) → built from the repo's own docs; skills routed by namespaced name; parallel workstreams dropped |
| `.claude/agents/implementer.md` | sdd-engineering · `agents/implementer.md` | AI Engineering | `/run-plan` stage R1 | executes the plan format | DevDigest conventions/never-touch lists → project instructions; gate discovery + no-test-command protocol |
| `.claude/agents/plan-verifier.md` | sdd-engineering · `agents/plan-verifier.md` | AI Engineering | `/run-plan` review gate | checks the plan format item by item | onion gate → plan's own gates; AC traceability added |
| `.claude/skills/run-plan/` (+ `feature/scripts/capture-gates.sh`) | sdd-engineering · `skills/run-plan/` | AI Engineering | `/sdd-engineering:run-plan <plan>` | orchestrates exactly these agents | new generic `capture-gates.sh` (gates from the plan); scripts via `${CLAUDE_SKILL_DIR}`; security-reviewer/test-writer stages dropped |
| `.claude/skills/spec-writing/` + `spec/scripts/spec-lint.mjs`, `spec-admin.mjs` | sdd-engineering · `skills/spec-writing/` | AI Engineering | preloaded into spec-creator; lint + approval | the spec format's single definition | DevDigest template v2 → generic template; new compact linter; glossary dropped (product terms) |
| `.claude/skills/spec/` + `feature/` (orchestrators) | sdd-engineering · `skills/spec-to-plan/` | AI Engineering | "prepare a spec and a plan" | drives spec-creator → approval → planner | rewritten: no scope file, no DevDigest stages |
| `.claude/skills/workflow-retro/` + `workflow-check/` | sdd-engineering · `skills/workflow-retro/` | AI Engineering | `/sdd-engineering:workflow-retro` after a run | parses these agents' *Run notes* | state → `.sdd/`; honours `CLAUDE_CONFIG_DIR`; plugin agents recognised by namespace; retro agent folded into the skill |
| `.claude/skills/engineering-insights/` | sdd-engineering · `skills/engineering-insights/` | AI Engineering | end of run-plan, end of a session | run-plan stage R5 calls it | modules = any repo directory (`--init` creates the file); DevDigest examples replaced |
| `.claude/hooks/agent-guard.mjs` | sdd-engineering · `hooks/agent-guard.mjs` (+ `readonly-guard.mjs` in the two dependency plugins) | AI Engineering | every tool call inside the plugin's agents | enforces those agents' scopes | wired from `hooks/hooks.json`, keyed on `agent_type`; DevDigest path rules removed |
| `.claude/agents/researcher.md` | research-tools · `agents/researcher.md` | AI Engineering | delegated discovery; standalone questions | useful on its own → own plugin, own cadence | DevDigest seams (vendored shared, clones) → "respect the project's exclusions" |
| `.claude/agents/architecture-reviewer.md` | architecture-review · `agents/architecture-reviewer.md` | Architecture Guild | `/run-plan` full review; standalone reviews | useful on its own; depends on paved-path skills | hard-coded onion/server/client checks → rules read from the repo's docs and declared gate |
| 11 skills: react-best-practices, react-testing-library, next-best-practices, fastify-best-practices, frontend-ui-architecture, drizzle-orm-patterns, postgresql-table-design, zod, typescript-expert, security, mermaid-diagram | engineering-paved-path · `skills/*` | Platform Team | loaded by name by implementer / planner / architecture-reviewer | one source per technical skill | frontend-ui-architecture § 9 (DevDigest `client/`) replaced; RTL split under 500 lines; TOCs |
| `.claude/agents/learnings/*.md` format + `.claude/tests/*` (guard, spec-lint, ledger) | the agents' learnings protocol; `scripts/tests/guards.test.mjs` | AI Engineering | — | tests of the extracted scripts | rewritten for the generic scripts |

## 2. Project-specific → stays in DevDigest

| Component | Why it stays |
| --- | --- |
| `CLAUDE.md`, `AGENTS.md`, `*/AGENTS.md`, `*/INSIGHTS.md` | DevDigest's own rules and knowledge; plugins read the consumer's equivalents |
| `specs/*.md`, `docs/plans/*.md`, `specs/_template.md` (template v2), `spec-writing/references/glossary.md` | product requirements and product vocabulary |
| `.claude/skills/onion-architecture/` (+ `known-violations.json`, dependency-cruiser config) | encodes DevDigest's server layers and a frozen debt baseline; another repo declares its own gate |
| `.claude/skills/pr-self-review/`, `.claude/commands/pr-self-review.md` | routes DevDigest paths to DevDigest skills; a candidate for a later generalized `review-tools` plugin |
| `.claude/agents/security-reviewer.md`, `test-writer.md`, `doc-writer.md`, `brainstorm.md` | carry DevDigest's threat model, test-path allowlist and docs map; not part of the first SDD release |
| `.claude/skills/devdigest-demo/` | DevDigest demo conventions |
| `evals/` (vitest + Agent SDK suites, baselines, CI tiers) | DevDigest's harness evals; the marketplace ships its own cases per plugin |

## 3. Optional integrations → not in this release

| Component | Why |
| --- | --- |
| `mcp/` (`devdigest-mcp` server), `.mcp.json.example` | network access to a running DevDigest API; would need `userConfig`, a SECURITY review and its own plugin |
| `evals/proxy/` (LiteLLM → OpenRouter) | credentials and a container; an operator tool, not a plugin |

## 4. Local leftovers → never extracted

`.claude/settings.local.json`, `.claude/state/` (spec scope, workflow history),
`.claude/skill-workspaces/`, `.claude/worktrees/`, `evals/results/`, `.devdigest/`,
personal memory under `~/.claude/projects/…`, absolute paths in any of them.
