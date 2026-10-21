# Sweep profiles

Pick every profile the feature touches. A new list column touches **UI** and **API/data**;
a new model call touches **LLM feature** and **API/data**. For each probe:
cover it with a criterion, ask a `Q-n`, or mark it n/a with a reason in your report.

## Core six (every profile)

| Category | Probe |
| --- | --- |
| Data & loading | Where does each datum come from? Is it stored or computed? When is it fetched (page load, expand, lazily)? How fresh is it? Does it cost a paid call? |
| Display & sorting | What's shown, in what order, how is it grouped? Truncation, number/date/currency format, the empty-value glyph (`—`), limits and pagination. |
| Interactions | Trigger → response for every control. Single or multi-select, toggle off, keyboard, navigation, undo. |
| State & persistence | What survives reload, navigation or a new session? URL state? Per-user, per-repo or global? How does it reset? |
| Feedback | Loading, success, the exact error copy, optimistic updates, why something is disabled. |
| Edge cases | Empty, error, huge, concurrent (operation in progress), partial data, dependency down, stale, first run. |

## UI surface

- **State matrix** per surface: default, loading, empty, partial, error, overflow,
  disabled, stale/refreshing, first run.
- **Every new or changed control:** what triggers it, the response, feedback,
  cancel/undo, confirmation if destructive, and the keyboard path. Content shown only on
  hover needs a focus equivalent (see `a11y.md`).
- **Consistency:** reuse existing patterns (badges, drawers, popovers, empty
  states). An unexplained divergence is a gap.
- **Responsive:** a 390 px width. What collapses, truncates or scrolls?
- **Cross-surface agreement:** if the same entity shows on two surfaces (a list and its
  detail page), their counts must match. Write that as an AC.

## API / data

- **Consumers:** which surfaces, services or tools read this? What does each one need?
- **Backward compatibility:** what do rows or runs created **before** this feature show
  (`—`, hidden, or recomputed)? Is a behaviour-level backfill needed?
- **Contract evolution:** name every shared contract that changes under *Module
  interactions*, and every copy of it that must stay in sync.
- **Error behaviour:** what the caller sees for a missing entity, an operation in
  progress, or a conflict.
- **Volume:** the largest realistic input 
  and the behaviour at that limit.

## LLM feature (prompts, model output) → read `llm-features.md` too

- Which prompt section changes, and where does its content come from (provenance)?
- What is fixed (deterministic) and what is the model's judgement?
- Grounding, nondeterminism, cost and latency budget, fallback, injection posture.

## Dev tooling (CLI, agents, CI, integrations)

- **Tool contract:** inputs, outputs, and errors at the boundary.
- **Auth and secrets:** where tokens come from. Never echo them.
- **Idempotency and retries:** what does a second call do?
- **Operability:** exit codes, logs, and what a human sees when it fails.
