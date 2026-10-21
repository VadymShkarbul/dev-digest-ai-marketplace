# Plan: Note pinning — 001-note-pinning

**Status:** ready · **Packages:** notes-app · **Risk:** low
**Run mode:** review: full
**Spec:** specs/note-pinning.md
**Approved:** 2026-10-21 — by the human (plan-admin)

## Objective
Notes gain a `pinned` flag with `pinNote(id)` / `unpinNote(id)`, and `listNotes()` returns
pinned notes first (newest first within each group). Done when the new tests and the
existing suite pass with `npm test`.

## Requirements review
| Item | Answer / decision | Reflected in |
| --- | --- | --- |
| RUN-1 | full review | header |

## Context read
| Source | What it constrained |
| --- | --- |
| `CLAUDE.md:5-7` | plain exported functions, no classes, no new dependencies |
| `src/notes.js:16-18` | `listNotes` sorts by id descending today |

## Constraint register
| # | Constraint | Source | How this plan complies |
| --- | --- | --- | --- |
| C1 | No new dependencies | `CLAUDE.md:7` | only `src/notes.js` and its test change |

## Spec traceability
| Spec item | Step(s) | How it is verified |
| --- | --- | --- |
| AC-1 | 1, 2 | test "pinNote marks a note pinned" |
| AC-2 | 1, 2 | test "unpinNote clears the flag" |
| AC-3 | 1, 2 | test "listNotes puts pinned first" |
| AC-4 | 1, 2 | test "new notes are not pinned" |
| EC-1 | 1, 2 | test "pinNote on a missing id throws" |
| SC-1 | 2 | covered by the AC-3 test |

## Skill routing
| Step | Skill(s) the implementer must load | Why |
| --- | --- | --- |
| — | none | plain JavaScript, no framework |

## Work breakdown

### Step 1 — pinned flag and functions
- **Package:** notes-app · **Files:** `src/notes.js` (modify) — `addNote` sets `pinned: false`; add exported `pinNote(id)` and `unpinNote(id)` that throw `Error('note not found')` for an unknown id; `listNotes` sorts pinned first, then id descending.
- **Depends on:** —
- **Definition of done:** the four exports behave as AC-1..AC-4 and EC-1 describe.
- **Verify:** `npm test`

### Step 2 — tests
- **Package:** notes-app · **Files:** `test/pinning.test.js` (new) — one test per row of *Spec traceability*.
- **Depends on:** Step 1
- **Definition of done:** five new tests pass alongside the existing four.
- **Verify:** `npm test`

## Test plan
| Test | File (project naming rule) | Command |
| --- | --- | --- |
| unit | `test/pinning.test.js` | `npm test` |

## Verification gates (run in this order)
1. `npm test` — source: `CLAUDE.md:5`

## Out of scope
- Manual ordering among pinned notes (spec non-goal).

## Open questions
- **Blocking:** None.
- **Non-blocking:** None.
