---
name: engineering-insights
description: "Records durable, cold-actionable engineering insights into the touched module's INSIGHTS.md (any package directory, or the repo root). Use when a non-obvious discovery, decision, or recurring error+fix happens mid-work, at the end of a substantial session, at the end of /sdd-engineering:run-plan, or when the user asks to save an insight, learning, lesson or retrospective note."
allowed-tools: Read Grep Edit Bash(bash ${CLAUDE_SKILL_DIR}/scripts/append-insight.sh:*)
---

# Engineering Insights

Each module (package directory) keeps an append-only `INSIGHTS.md`. This skill
**records** into it. *Reading* it before work is the project's job: add a line to the
project's `CLAUDE.md` such as "Before working in a package, read its INSIGHTS.md".

## 1. Gate — is there anything worth recording?

A substantial session: a problem solved, a decision made, or something non-obvious
discovered. Trivial or config-only session, or nothing beyond what is already documented
→ **stop, write nothing.** Filler is the main failure mode.

## 2. Route to the file

Map each insight to the **directory that owns the code it is about**: the nearest package
root (the directory with its own `package.json`, `pyproject.toml`, `go.mod`, … or the one
the project instructions call a package). Spans modules? Record in each it materially
affects. Root docs/tooling only → `.` (the repository root).

No `INSIGHTS.md` there yet → create it (`append-insight.sh <module> --init`) only if the
project instructions mention INSIGHTS files or the human agrees; otherwise report the
candidates instead.

**Re-read the target file now** — you cannot de-duplicate against what you haven't read.

## 3. Sweep all seven sections, in order

```
- [ ] What Works            — 2-5 concrete things that worked
- [ ] What Doesn't Work     — approaches that failed or were abandoned, AND WHY
- [ ] Codebase Patterns     — new conventions / architectural decisions
- [ ] Tool & Library Notes  — dependency quirks discovered
- [ ] Recurring Errors      — an error seen more than once + its fix
- [ ] Session Notes         — ALWAYS. One line.
- [ ] Open Questions        — ALWAYS ask. Unresolved things go here.
```

Per section: **2-5 entries max**, only **verified** findings. Over budget? Rank by user
corrections › approaches ruled out › patterns that recurred › one-off gotchas.
**Already covered?** Don't add a near-duplicate — `Edit` the sharper wording into the
existing line; a now-wrong entry gets a dated correction beneath it.

## 4. Write the entry

The line test: **if it would be obvious to anyone reading the code, don't write it.**
Lead with the problem, then the fix · one point per entry · every entry cites a concrete
`path:line` (verify the number) · affirmative phrasing · no hand-typed date (the script
adds it). Worked entries and good/bad pairs: [examples.md](examples.md).

## 5. Append — via the script, never by hand

Run it from inside the project's repository:

```bash
# one entry
bash ${CLAUDE_SKILL_DIR}/scripts/append-insight.sh <module> "What Works" "<module>: …"

# a whole wrap-up — TSV, one "Section<TAB>entry" per line (write the file under $TMPDIR)
bash ${CLAUDE_SKILL_DIR}/scripts/append-insight.sh <module> --batch "$TMPDIR/wrapup.tsv"
```

It validates every row before writing anything, refuses any change that would drop or
alter an existing line, and date-stamps entries. If it exits non-zero, **fix the input and
re-run** — never fall back to editing the file by hand.
