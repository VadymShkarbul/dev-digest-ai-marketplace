# Spec: Note colours | Status: draft

Supersedes: —
Packages: notes library

## Problem & why
Users want to tell notes apart at a glance. A colour per note is the cheapest way.

## Goals / Non-goals

### Goals
- A note can carry one colour from a fixed palette.

### Non-goals
- Custom colours outside the palette.

## Success criteria
- **SC-1** Every note reports exactly one colour from the palette.

## User stories
- **US-1** (P1) As a notes user, I want to set a note's colour, so that I can group notes visually.
  Independent test: set "blue" on a note; reading it back returns "blue".
- **US-2** (P1) As a notes user, I want to list only the notes of one colour, so that I can focus on a group.
  Independent test: with two blue notes and one red, listing blue returns the two blue notes.

## Acceptance criteria (EARS)
- **AC-1** (US-1) WHEN a user sets a palette colour on an existing note, the system SHALL store that colour on the note.
- **AC-2** (US-1) The system SHALL give every newly added note the colour "none".

## Edge cases
- **EC-1** (AC-1) IF a user sets a colour outside the palette, THEN the system SHALL raise the error "unknown colour".

## Non-functional
- None relevant.

## Key entities & states
- **Note** — gains a colour. States: none → <palette colour> → <another palette colour>.

## Glossary
- **palette** — the fixed colours "none", "red", "yellow", "green", "blue".

## Untrusted inputs
- None.

## Module interactions
- None.

## Assumptions
- None.

## Needs clarification
- None.

## Clarifications
- None.

## Changelog
- 2026-10-21 — created (draft).
