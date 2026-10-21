# Handoff templates — /sdd-engineering:run-plan

One template per spawn. Every agent starts with an **isolated** context: it sees its own
definition, the project's `CLAUDE.md`, git status, and *only* the prompt below — never this
conversation. So each prompt is self-contained, names artifacts **by path**, and never
pastes a plan, a diff, or another agent's full report.

Placeholders: `{ART}` the run's artifact dir · `{PLAN}` the plan path · `{ROOT}` the
absolute repo root · `{N}` fix round · `{branch}` the current branch.

## sdd-engineering:implementer — execute

```
Implement {PLAN}. The human approved it as written.
Repo root: {ROOT}. Branch: {branch}.
Do not commit. Return your Implementation Report.
```

## sdd-engineering:implementer — fix round {N}

```
Fix round {N} for {PLAN}.
Items to fix are listed in {ART}/round-{N}-findings.md — fix exactly those, nothing
else; each item names its source agent, file:line, and what "fixed" means.
Items the human declined are listed there as "won't fix" — leave them alone.
Re-run the gates for the packages you touch. Do not commit.
Return your Implementation Report with a per-item ledger (fixed / could not fix + why).
```

## architecture-review:architecture-reviewer (scoped hand-off)

```
Review the pending change for {PLAN} ({one-line objective}).
Scoped hand-off — review exactly this scope, don't re-glob the tree:
- Changed files: {ART}/manifest.tsv
- Unified diff: {ART}/diff.patch (untracked files appear as `=== untracked <path> ===` blocks)
- Neutral gate results: {ART}/gates.md
Re-run only your own verdict-critical gate (if the repo declares one) and say which
results you re-ran vs cited. Repo root: {ROOT}.
```

## sdd-engineering:plan-verifier (after the architecture review)

```
Verify the working tree against {PLAN}.
Scoped hand-off: diff {ART}/diff.patch · manifest {ART}/manifest.tsv ·
gate results {ART}/gates.md.
Re-run one spot gate yourself and label re-run vs cited. Repo root: {ROOT}.
```

## `round-{N}-findings.md` format

Written by the orchestrator into `{ART}` — outside the repo — before a fix round.

```markdown
# Fix round {N} — {PLAN}

| # | From | Severity / status | file:line | Problem | Fixed when |
| --- | --- | --- | --- | --- | --- |
| F1 | plan-verifier | MISSING | plan l.88 (Step 5 DoD) | empty state not rendered | "No favourites yet" shows with 0 items |

## Won't fix (human decision)
- {agent · finding · reason} <"None.">
```
