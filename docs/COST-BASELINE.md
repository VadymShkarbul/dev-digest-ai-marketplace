# Cost baseline

What one short spec-driven run costs, measured the same way every time, so a prompt or
routing change can be judged on numbers instead of impressions.

## Method

| | |
| --- | --- |
| **Scenario** | `plugins/sdd-engineering/evals/spec-and-plan` — a user asks for a spec and an implementation plan for "tags on notes" in the `notes-app` fixture (Node, `npm test`). Non-interactive: the session picks each *(Recommended)* option; the user approves the spec once it lints clean. |
| **Quality gate** | that case's 10 graders (spec-creator and planner used, in order; spec lints; plan exists, traces `AC-1`, uses the project's test command; no code changed; two LLM-judged criteria) **plus** the whole eval set once (8 cases incl. 2 negative). Graders marked `critical` are the "critical errors". |
| **Runner** | `node scripts/eval-runner.mjs` — `claude -p --output-format stream-json` with the four plugins loaded via `--plugin-dir` from the working tree, a clean env and a throwaway `CLAUDE_CONFIG_DIR` (no personal plugins/skills/settings), subagents forced to the foreground. |
| **Model** | `anthropic/claude-haiku-5.5` via OpenRouter for the session **and every agent** (the agents' `model: sonnet/opus` aliases are mapped to the eval model, so one model is measured); judge = same model, 2-of-3 votes. |
| **Tokens / calls** | from the run's `result.modelUsage` (includes subagents): input, output, cache read, cache write; API calls = distinct assistant message ids; tool calls = every `tool_use` (main + subagents). |
| **Cost** | *provider-reported* = OpenRouter key usage before/after the series (ground truth, includes judge calls); *estimated* = tokens × OpenRouter list price (<100k-token tier). |
| **Latency** | wall-clock of the `claude -p` process. |

Not changed between series: model, eval set, fixture, routing, Claude Code version (2.1.267).

Lesson from the first debug runs (recorded because it would have invalidated the
experiment): without the alias mapping the agents ran on their frontmatter models
(Sonnet/Opus) and one debug pass cost **$3.01** at the provider while the Haiku-priced
estimate said $0.08. Always read the provider number.

<!-- RESULTS -->
