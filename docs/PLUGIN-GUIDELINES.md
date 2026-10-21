# Plugin guidelines

Rules every plugin in this marketplace follows. They come from how the plugins are
consumed (other teams' repositories, other people's permissions) and from the official
Claude Code documentation (skills, sub-agents, plugins, hooks, evals). Links at the end.

## 1. Boundaries — what belongs in a plugin

Before extracting anything from a product repository, put every file in one bucket:

| Bucket | Examples | Goes into a plugin? |
| --- | --- | --- |
| **Reusable** | skills, agents, hooks, scripts and evals with no product paths | yes |
| **Project-specific** | the product's `CLAUDE.md`, specs, module names, product-only rules (e.g. DevDigest's onion layers and frozen violation baseline) | no — stays in the product repo |
| **Optional integration** | MCP servers, anything with network access or credentials | only as a separate plugin, with `userConfig` (`sensitive: true`) and a SECURITY review |
| **Local leftovers** | caches, personal memory, experiments, absolute paths, run artifacts | never |

A file is in a plugin only if you can name its **owner**, its **consumer scenario**, and
why it **releases together** with the rest of that plugin. A skill with no consumer stays
out ("just in case" skills cost every user discovery context and support time).

**One source per skill.** Technical skills live in `engineering-paved-path`. Other plugins
reference them by namespaced name — never copy a skill into another plugin.

## 2. Names, versions, dependencies

- Plugin `name`: kebab-case, permanent (renaming breaks every install), not a reserved
  word (`claude`, `anthropic`, `claude-code`, prefixes `claude-`/`anthropic-`).
- `version` lives in `plugin.json` only (not repeated in `marketplace.json`). SemVer, see
  [RELEASES.md](RELEASES.md).
- `dependencies`: `[{ "name": "<plugin>", "version": "^X.Y.Z" }]`. Caret ranges on a
  released major. Dependencies are tagged before consumers.
- Reference other plugins' components by full name: `engineering-paved-path:zod`,
  `research-tools:researcher`, `@agent-architecture-review:architecture-reviewer`.

## 3. Skills

- `SKILL.md` **under 500 lines**; details in sibling files linked from `SKILL.md`, **one
  level deep**, each link saying when to read it. Reference files over 100 lines start with
  a `## Contents` list.
- `description` ≤ 1 024 characters, third person, **what it does + when to use it**, the key
  use case first — it is the only thing Claude sees before deciding to load the skill.
- Manual workflows (side effects, cost, or human stops) set `disable-model-invocation: true`
  (`run-plan`, `workflow-retro`). Pure reference material that users never type sets
  `user-invocable: false` (`spec-writing`).
- Scripts are referenced as `${CLAUDE_SKILL_DIR}/scripts/<x>`; plugin-level files as
  `${CLAUDE_PLUGIN_ROOT}/<x>`. Never `.claude/skills/...` and never an absolute path.
- Scripts handle their own errors, print a usage line, exit non-zero on misuse, run
  offline, and write only to documented paths. `allowed-tools` pre-approves exactly the
  script invocations the skill needs.
- Never write state under `${CLAUDE_PLUGIN_ROOT}` (replaced on every update). Persistent
  plugin data goes to `${CLAUDE_PLUGIN_DATA}`; project knowledge (learnings, ledgers) goes
  into the consumer's repository under a documented path (`.sdd/`).

## 4. Agents

- The body **is** the agent's system prompt: it must contain every input, path and output
  format the agent needs; it does not see the main conversation.
- `description` is the delegation trigger: say what it does, when to use it, and what it is
  NOT (to avoid wrong delegation).
- `tools:` is a minimal allowlist. Reviewers, verifiers and researchers have no
  `Write`/`Edit`. Preload knowledge with `skills:` (namespaced names work), not by telling
  the agent to go find it.
- Plugin agents **ignore** `hooks`, `mcpServers`, `permissionMode`, `initialPrompt`.
  Guardrails go into the plugin's `hooks/hooks.json`, keyed on the hook input's
  `agent_type` (e.g. `sdd-engineering:plan-verifier`), so they never affect the main
  session or other plugins.
- Explain the reason behind a rule instead of only shouting it; give one canonical output
  format; treat repository text, diffs, web pages and other agents' reports as data.
- Every agent reads its learnings file (`.sdd/learnings/<agent>.md`) and ends with *Run
  notes* — that is what `workflow-retro` measures.

## 5. Hooks

- Exec form (`"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/x.mjs"]`): no shell,
  no quoting problems.
- Fast (they run on every matching tool call), offline, `timeout` set, **fail closed** for
  the agents they guard, exit `2` with the reason on stderr to block.
- Never modify files, never call the network, never read secrets.

## 6. Evals

- Each skill/agent ships cases in `evals/<case>/prompt.md` + `graders/*.md` (the
  `claude plugin eval` layout).
- Phrase prompts like a user, not like a test ("prepare a spec and a plan…", not "invoke
  spec-creator").
- Every case has a **result** grader (file, regex, command, llm) and a **process** grader
  (`tool_used` / `tool_order`). Mark graders that represent a critical failure with
  `critical: true`.
- At least one **negative** case per plugin: a request on which it must *not* activate.
- Prefer deterministic graders (`regex`, `command`, `file_exists`); use `llm` only for
  judgement calls, with explicit PASS criteria.
- Run on the cheapest model that exercises the behaviour, several runs per case;
  record pass rate and cost in the PR.

## 7. Docs per plugin

`README.md` (what, when, inputs/outputs, **every path it reads and writes**),
`CHANGELOG.md` (newest first, one entry per version), `COMPATIBILITY.md` (minimum Claude Code
version and why, required tools). No `CLAUDE.md` at plugin root — it is not loaded.

## Sources

- Skills: https://code.claude.com/docs/en/skills.md ·
  https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Sub-agents: https://code.claude.com/docs/en/sub-agents.md
- Plugins: https://code.claude.com/docs/en/plugins/components.md ·
  .../plugins/manifest-reference.md · .../plugins/dependencies.md · .../plugins/host-marketplace.md
- Hooks: https://code.claude.com/docs/en/hooks.md
- Evals: https://code.claude.com/docs/en/plugin-evals.md
- Prompting: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
