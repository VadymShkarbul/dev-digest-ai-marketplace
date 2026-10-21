# Spec: Favourite recipes | Status: approved

Supersedes: —
Packages: mobile app

## Problem & why
Home bakers who cook the same few recipes every week scroll the full catalogue each time.
Support tickets mention it weekly. A favourites list removes that search.

## Goals / Non-goals

### Goals
- A signed-in user reaches a saved recipe from the home screen in one tap.

### Non-goals
- Sharing favourites with other users.
- Sorting favourites manually.

## Success criteria
- **SC-1** A signed-in user opens a saved recipe in at most 2 taps from the home screen.

## User stories
- **US-1** (P1) As a signed-in baker, I want to mark a recipe as a favourite, so that I can find it again.
  Independent test: mark a recipe, reload the app, the recipe still shows as a favourite.
- **US-2** (P2) As a signed-in baker, I want a Favourites tab, so that my saved recipes are one tap away.
  Independent test: with 3 favourites, the tab lists exactly those 3.

## Acceptance criteria (EARS)
- **AC-1** (US-1) WHEN a signed-in user taps the heart on a recipe, the system SHALL mark that recipe as a favourite for that user.
  Examples:
  - Given "Lemon tart" is not a favourite, when the user taps its heart, then the heart is filled and "Lemon tart" appears in Favourites.
- **AC-2** (US-1) WHEN a user taps a filled heart, the system SHALL remove that recipe from the user's favourites.
- **AC-3** (US-2) WHEN the user opens the Favourites tab, the system SHALL list the user's favourites, most recently added first.
- **AC-4** (US-2) WHILE the user has no favourites, the system SHALL show "No favourites yet — tap the heart on any recipe."

## Edge cases
- **EC-1** (AC-1) IF the device is offline when the heart is tapped, THEN the system SHALL keep the change and sync it within 30 s of reconnecting.

## Non-functional
- **NF-1** [a11y] The system SHALL give the heart control the accessible name "Add to favourites" or "Remove from favourites" matching its state.

## Key entities & states
- **Favourite** — a recipe a user saved. States: not saved → saved → not saved.

## Glossary
- **favourite** — a recipe saved by one user; not "bookmark".

## Untrusted inputs
- None.

## Module interactions
- The recipe detail screen and the catalogue list both show the heart; its state SHALL agree on both.

## Assumptions
- **A-1** Favourites are per user, not per device. [default]

## Needs clarification
- None.

## Clarifications
### Session 2026-10-21
- Q-1: Should guests be able to favourite? → No, signed-in users only (→ AC-1).

## Changelog
- 2026-10-21 — created (draft).
- 2026-10-21 — Q-1 answered (round 2).
