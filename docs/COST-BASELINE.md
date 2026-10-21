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

## How we got to a fair comparison

Every series below runs the same case on the same model; only the commit changes.

| Series | Commit | What changed | Scenario result | Finding |
| --- | --- | --- | --- | --- |
| debug | `f604b16` | first run | — | agents ran on their frontmatter models (Sonnet/Opus): **$3.01** provider spend vs $0.08 estimated → alias mapping added to the runner |
| A0 | `00863f0` | baseline v1 | 0/3 all-graders · 2/3 without critical failure · provider $0.133 | 1 run stopped before the planner; 2 runs failed only on noisy LLM judges |
| B0 | `311fd08` | A0 + prompt dedupe | 1/3 · 1/3 without critical · provider $0.099 | 2 runs stopped before the planner — lower cost came from *truncated* runs, so no conclusion; trace showed the session bypassed the `spec-to-plan` skill |
| A1 | `204df35` | A0 + routing fix (agent descriptions point at `spec-to-plan`) | 0/3 · provider $0.100 | skill now loads every time; session then asked the questions in plain text and stopped (no `AskUserQuestion` headless) |
| A2 | `325a642` | A1 + "decide Recommended when the human can't be asked" | 0/3 · provider $0.112 | flow reaches the approval step and **correctly** stops: the eval put the user's approval in the *system* prompt → case fixed (approval moved to the user's message) |

Lessons: read the provider number, not the estimate; never compare a series whose
failures truncate runs (they look cheaper); and a "failure" can be the guardrail working —
check the trace before changing the plugin.

## Result — prompt dedupe (A vs B)

- **A (baseline):** `4c9ae2d` — sdd-engineering 1.0.0 candidate (routing fixed, case fixed).
- **B (one change):** `f691f8a` — duplicated instructions removed from the four agent prompts
  (EARS/ID rules now only in the preloaded `spec-writing` skill; gate discovery, the
  no-test-command protocol and the Run notes format in on-demand `sdd-conventions`
  references). Agent prompt bytes 34 892 → 31 047 (−11 %). Model and routing unchanged.
- **Model:** `anthropic/claude-haiku-5.5` for session, agents and judge · Claude Code 2.1.267 · 3 runs per series, 2026-10-21.

| Metric (per run) | A · `4c9ae2d` (n=3) median (min–max) | B · `f691f8a` (n=3) median (min–max) | Δ median |
| --- | --- | --- | --- |
| Cost, estimated | $0.0685 ($0.0491–$0.0745) | $0.0582 ($0.0514–$0.0689) | -15 % · within noise |
| Latency | 369 s (277 s–437 s) | 310 s (271 s–371 s) | -16 % · within noise |
| Input tokens (uncached) | 62 (46–68) | 64 (58–66) | +3 % · within noise |
| Output tokens | 78.2k (57.9k–96.7k) | 65.3k (56.3k–79.7k) | -16 % · within noise |
| Cache-read tokens | 918.3k (719.5k–1215.5k) | 1104.5k (964.3k–1261.7k) | +20 % · within noise |
| Cache-write tokens | 135.6k (103.1k–137.9k) | 115.9k (108.9k–131.7k) | -15 % · within noise |
| API calls | 24 (19–29) | 27 (24–28) | +13 % · within noise |
| Tool calls | 35 (33–54) | 39 (34–45) | +11 % · within noise |
| Provider-reported spend, whole series | $0.1922 | $0.1725 | -10 % per run |
| Runs passing every grader | 2/3 | 2/3 | |
| Runs without a critical failure | 3/3 | 3/3 | |
| Mean score | 0.97 | 0.97 | |
| Critical failures | none | none | |

On-demand loading: across B's 3 runs the agents read an `sdd-conventions` reference once
(`run-notes.md`), so moving the rules out did not add a read per run.

**Quality gate: green.** Both series: 3/3 runs without a critical failure, mean score 0.97,
no new critical false negative. The only failed graders are LLM judges (A#1 `09`, B#2 `09`),
non-critical; A#1's judge wrote "the correct result is PASS" before emitting a `false`
verdict, so the runner now takes the judge's *last* JSON verdict (applies to runs after
this experiment). B's eval set: 7/8 pass; the miss is the `planner-reads-spec` judge whose
criteria omitted the spec's own assumption A-1 (grader fixed, case re-run on the release
commit — see below).

**Cost and latency: not proven.** Every median moved in the expected direction
(provider-reported spend −10 % per run, cache-write tokens −15 %, output −16 %, latency
−16 %), but each difference is smaller than the spread inside a single series, and API/tool
calls went up slightly. With n = 3 this is **within noise** — we do not claim a saving.

**Decision:** keep B. It does not cost quality, and it removes three places where the
same rule could drift apart (one source per rule). Re-measure with n ≥ 10 before citing a
number; that series costs ≈ $0.65 per arm at today's prices.

Critical errors observed across the whole experiment (all fixed before A/B): session
skipped the `spec-to-plan` skill (routing), session asked questions in text when headless,
eval case put the user's approval in the system prompt.

<!-- RESULTS -->
