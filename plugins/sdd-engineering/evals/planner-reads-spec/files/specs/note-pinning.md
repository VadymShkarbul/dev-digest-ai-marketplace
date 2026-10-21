# Spec: Note pinning | Status: approved

Supersedes: —
Packages: notes library

## Problem & why
Users with many notes lose track of the few they consult daily. Pinning keeps those notes at
the top of the list without deleting or renaming anything.

## Goals / Non-goals

### Goals
- A pinned note is always listed before unpinned notes.

### Non-goals
- Manual ordering among pinned notes.
- Persisting notes beyond the process lifetime.

## Success criteria
- **SC-1** After pinning any note, the first item of the note list is a pinned note.

## User stories
- **US-1** (P1) As a notes user, I want to pin and unpin a note, so that important notes stay on top.
  Independent test: pin the oldest of three notes; it is listed first; unpin it; it returns to its date position.

## Acceptance criteria (EARS)
- **AC-1** (US-1) WHEN a user pins an existing note, the system SHALL mark that note as pinned.
- **AC-2** (US-1) WHEN a user unpins a pinned note, the system SHALL mark that note as not pinned.
- **AC-3** (US-1) WHEN notes are listed, the system SHALL list pinned notes before unpinned notes, newest first within each group.
  Examples:
  - Given notes "a" (oldest, pinned), "b", "c" (newest), when notes are listed, then the order is "a", "c", "b".
- **AC-4** (US-1) The system SHALL report every newly added note as not pinned.

## Edge cases
- **EC-1** (AC-1) IF a user pins a note id that does not exist, THEN the system SHALL raise the error "note not found".

## Non-functional
- None relevant.

## Key entities & states
- **Note** — gains a pinned flag. States: not pinned → pinned → not pinned.

## Glossary
- **pinned** — kept at the top of the list; not "favourite".

## Untrusted inputs
- None.

## Module interactions
- The note list order changes for every caller of the list operation.

## Assumptions
- **A-1** Pinning an already pinned note is a no-op. [default]

## Needs clarification
- None.

## Clarifications
- None.

## Changelog
- 2026-10-21 — created (draft).
- 2026-10-21 — status draft → approved (spec-admin, by the human).
