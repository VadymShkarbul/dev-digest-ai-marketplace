---
name: spec-writing
description: "Reference for writing sdd-engineering feature specs: the spec template, EARS patterns with good/bad pairs, weak-word list, ID and status rules, the spec linter and the human-only approval script, plus on-demand references (sweep profiles, LLM features, a11y, UX copy, requirement-quality checklist). Preloaded into sdd-engineering:spec-creator; read it when writing, reviewing or approving a spec."
user-invocable: false
---

# Writing an sdd-engineering spec

The format authority is [references/template.md](references/template.md);
`scripts/spec-lint.mjs` checks it mechanically. This skill covers what lint can't: how to
write a requirement that is unambiguous, testable, and about behaviour rather than
implementation.

## Where specs live

`<specsDir>/<slug>.md`, where `specsDir` is `.sdd/config.json` → `specsDir`, or `specs/`
when there is no config. The project may keep an index at `<specsDir>/README.md`.

## EARS: one trigger, one response, one SHALL

| Pattern | Shape | Use for |
| --- | --- | --- |
| Ubiquitous | `The system SHALL <response>.` | Invariants that always hold |
| Event | `WHEN <trigger>, the system SHALL <response>.` | User actions, arrivals, completions |
| State | `WHILE <state>, the system SHALL <response>.` | Behaviour during a run, load or sync |
| Unwanted | `IF <condition>, THEN the system SHALL <response>.` | Errors, limits, abuse, dependency failures |
| Optional | `WHERE <feature/config present>, the system SHALL <response>.` | Toggles, flags, per-user options |

| ✗ Vague or compound | ✓ EARS |
| --- | --- |
| The list should load fast. | WHEN the list opens, the system SHALL show the first 25 items within 1 s on the seeded dataset. |
| Handle errors properly. | IF the export service returns an error, THEN the system SHALL show "Export failed — try again" next to the button. |
| Show and filter tags. | Two criteria: one renders the tags, one filters. |
| Uses `useItems()` to fetch. | (How, not what. Delete it; the plan decides.) |

**Weak words** to replace with a number, a named state, or exact copy: properly,
correctly, appropriate, intuitive, user-friendly, seamless, robust, fast, quickly,
easily, efficient, graceful, as needed, if possible, etc., and/or, normal, reasonable,
some, many, few, large, small, soon. The only obligation word is **SHALL**. Quoted UI
copy (`"Export"`) is exempt.

## IDs and lifecycle

- **ID series:** `US-n`, `AC-n`, `EC-n`, `NF-n`, `SC-n`, `A-n`, `G-n`, `P-n`, `Q-n`. Never
  renumber or reuse an ID.
- **Questions move, they are never deleted.** Open `Q-n` live under *Needs
  clarification*; answered ones go to *Clarifications* (`- Q-n: <q> → <answer> (→ ids)`).
- **Defaults become `A-n [default]`**; repo facts `[repo]`; human statements `[human]`.
- **Status:** the agent writes `draft`; the human approves; `/sdd-engineering:run-plan`
  sets `implemented`.

## Requirement quality: every item must be

**Necessary** (traces to a story) · **Singular** (one SHALL) · **Unambiguous** ·
**Verifiable** (someone could write the test from the sentence alone) · **Feasible** ·
**Consistent** · **Implementation-free**.

## Scripts

```bash
# lint (read-only; any agent or human). --strict = the approval gate.
node "${CLAUDE_SKILL_DIR}/scripts/spec-lint.mjs" <specsDir>/<slug>.md [--strict]

# status changes — the HUMAN's, run from the main session only (agents are blocked)
node "${CLAUDE_SKILL_DIR}/scripts/spec-admin.mjs" approve <specsDir>/<slug>.md
node "${CLAUDE_SKILL_DIR}/scripts/spec-admin.mjs" status <specsDir>/<slug>.md implemented
```

`approve` runs the strict lint first and refuses on any error or open question.

## References (read on demand, not up front)

| File | Read when |
| --- | --- |
| [references/template.md](references/template.md) | Always — the format authority |
| [references/probes.md](references/probes.md) | At the start: choose the sweep profile(s) |
| [references/llm-features.md](references/llm-features.md) | The feature adds or changes a model call |
| [references/a11y.md](references/a11y.md) | The feature adds or changes UI |
| [references/ux-copy.md](references/ux-copy.md) | A criterion needs exact strings |
| [references/quality-checklist.md](references/quality-checklist.md) | Before every report, to score the spec |
