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
| **Cost per successful workflow** (provider spend ÷ runs passing every grader) | **$0.0961** ($0.1922 ÷ 2) | **$0.0863** ($0.1725 ÷ 2) | -10 % · within noise |
| Cost per workflow without a critical failure (provider spend ÷ runs) | $0.0641 ($0.1922 ÷ 3) | $0.0575 ($0.1725 ÷ 3) | -10 % · within noise |
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

## Releases

| Tag | Commit | CI (`validate`) | Evals on that commit | Notes |
| --- | --- | --- | --- | --- |
| `engineering-paved-path--v1.0.0` · `research-tools--v1.0.0` · `architecture-review--v1.0.0` · `sdd-engineering--v1.0.0` | `a3a9250` | ✅ run 39602502514 | A/B series above (B = this content) + B eval set 7/8 (judge-only miss, grader fixed) + `planner-reads-spec` re-run ✅ (`docs/cost-data/rc-5c09795-planner-reads-spec.json`) | dependencies tagged first, consumer last; all four tags → the CI-validated commit |
| `sdd-engineering--v1.1.0` | see below | see below | new case `spec-requires-ac`: **1.0.0 ✗** (spec-creator bypassed; `spec-admin approve` accepted the uncovered draft — `docs/cost-data/v1.0.0-spec-requires-ac.json`) → **1.1.0 ✓** all 6 graders (`v1.1.0-spec-requires-ac.json`); old cases on 1.1.0: 8/8 ✅ (`v1.1.0-suite.json`); spec-creator re-check after the routing preamble ✅ | only the consumer is released — dependencies unchanged (`^1.0.0` still resolves to `…--v1.0.0`) |

### 1.0.0 in another project (`pastry-recipe-app`, Expo + Supabase, own `AGENTS.md`, `pnpm` gates)

| Check | Evidence |
| --- | --- |
| no local SDD components before install | `.claude/` absent; no `spec-creator`/`run-plan` files |
| install from GitHub, project scope | `marketplace add VadymShkarbul/dev-digest-ai-marketplace --scope project` → `install sdd-engineering@… --scope project` → "+ 3 dependencies"; `plugin list --json`: four plugins enabled, `1.0.0` / `1.0.0-a3a92506cb31`, no `errorDetails` |
| supporting files in the cache | scripts, references, hooks, `pricing.json`, split RTL references present under `~/.claude/plugins/cache/dev-digest-ai-marketplace/…/1.0.0/`; `spec-lint.mjs`, `workflow-check.mjs` run from there |
| spec → plan | `spec-to-plan` → `spec-creator` → strict lint → `spec-admin approve` → `implementation-planner`: `specs/oven-temperature-units.md`, `docs/plans/001-oven-temperature-units.plan.md` (gates discovered: `pnpm typecheck`, `pnpm test`, `pnpm lint`, scoped `prettier`) |
| run-plan + review gate | `implementer` → `architecture-review:architecture-reviewer` (no violations) → `plan-verifier` INCOMPLETE → fix round → `plan-verifier` PASS; 119 tests green; spec → `implemented` |
| researcher available | listed in the session's agents (`research-tools:researcher`); `spec-to-plan` skipped it because the scope was clear from the code |
| workflow-retro manual | `/sdd-engineering:workflow-retro --session a637f2e4` ran `workflow-check.mjs` from the cache via `${CLAUDE_SKILL_DIR}`, appended `.sdd/ledger.md` row 1 |
| trace shows plugin/version | stream `system:init` → `plugins: [{name: sdd-engineering, version: 1.0.0, source: sdd-engineering@dev-digest-ai-marketplace}, {engineering-paved-path 1.0.0 …}, …]` |
| project instructions kept | the spec-creator read the project's own docs and surfaced its backlog conflict (BL-031); no plugin `CLAUDE.md`, nothing in `AGENTS.md` changed |
| found a plugin bug | `capture-gates.sh` executed a backticked *note* on gate line 5 (rc 127) → fixed in 1.1.0 |

### Update and rollback in `pastry-recipe-app` (rehearsed 2026-10-21)

| Step | Command | Observed |
| --- | --- | --- |
| catalog update | `claude plugin marketplace update dev-digest-ai-marketplace` | catalog offers `sdd-engineering` 1.1.0 — **installed stays 1.0.0** |
| plugin update | `claude plugin update sdd-engineering@dev-digest-ai-marketplace --scope project` | "updated from 1.0.0 to 1.1.0"; deps stay `1.0.0-a3a92506cb31`; no errors |
| new session | `claude -p …` | `system:init.plugins`: `sdd-engineering 1.1.0`, deps 1.0.0; installed `spec-admin approve` refuses an uncovered spec ("US-2 (P1) is a mandatory requirement with no acceptance criterion"); the project's existing spec still lints clean |
| leave latest | `claude plugin uninstall sdd-engineering@dev-digest-ai-marketplace --scope project --keep-data` · `claude plugin prune --scope project -y` | consumer removed, 3 auto-installed deps pruned |
| stable channel | `claude plugin marketplace add "VadymShkarbul/dev-digest-ai-marketplace#stable" --scope project` · `claude plugin install sdd-engineering@dev-digest-ai-marketplace-stable --scope project` | all four at 1.0.0 (`a3a9250`), no errors |
| smoke eval | `/sdd-engineering:run-plan review <plan>` stage R0 only | 5/5: loaded 1.0.0 from stable · all six agents present · `plan-admin` ran from the 1.0.0 cache · session ok · no agent spawned; 1.0.0 linter accepts the uncovered spec again (old rule back) |
| project data | `shasum` over `specs/ docs/plans/ .sdd/` + the feature's code | `cf5674dbc113` before rollback = after rollback = after returning to latest |
| back to latest | uninstall stable `--keep-data` · prune · `claude plugin install sdd-engineering@dev-digest-ai-marketplace --scope project` | `sdd-engineering 1.1.0`, deps 1.0.0, no errors |

External state: none to restore — the SDD plugins make no network writes and commit nothing
unless asked; the rehearsal changed only `.claude/settings.json` (which channel is enabled).

<!-- RESULTS -->
