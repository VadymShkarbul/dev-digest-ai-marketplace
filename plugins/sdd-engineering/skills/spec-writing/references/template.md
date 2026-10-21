# Spec: <Feature name> | Status: draft

Supersedes: —
Packages: <the packages/areas this touches, by the project's own names>

<!--
Format authority for sdd-engineering specs. Checked by
`${CLAUDE_PLUGIN_ROOT}/skills/spec-writing/scripts/spec-lint.mjs` — keep the headings and
ID shapes exactly. A spec says WHAT and WHY (behaviour, boundaries); the plan says HOW.
No file paths, code, endpoints, schemas, libraries or component names in stories/criteria.
Budget: 1–3 pages. Bigger → it is two features; split it.
Status: draft → approved (human only, via spec-admin.mjs) → implemented (/run-plan).
Delete this comment in a real spec.
-->

## Problem & why
_Who is affected, what gap they hit today, and why it is worth fixing now. 2–5 sentences._

## Goals / Non-goals

### Goals
- <observable outcome>

### Non-goals
- <what this feature deliberately does NOT do — at least one>

## Success criteria
- **SC-1** <outcome-level, measurable: a number, threshold or named state>

## User stories
- **US-1** (P1) As a <role>, I want <capability>, so that <outcome>.
  Independent test: <how this story alone is demonstrated>.

## Acceptance criteria (EARS)
<!-- One criterion = one trigger + one response = exactly one SHALL. Cite its story. -->
- **AC-1** (US-1) WHEN <trigger>, the system SHALL <response>.
  Examples:
  - Given <state with concrete data>, when <action>, then <observable result>.

## Edge cases
- **EC-1** (AC-1) IF <condition>, THEN the system SHALL <response>.

## Non-functional
<!-- perf / security / a11y / observability / cost / privacy — only if relevant, else "None relevant." -->
- **NF-1** [a11y] The system SHALL <measurable requirement>.

## Key entities & states
- **<Entity>** — <what users see>. States: <a> → <b> → <c>.

## Glossary
- **<term>** — <definition>; not "<avoided synonym>".

## Untrusted inputs
<!-- Text the feature reads but did not author, and how it is treated (as data). "None." only if nothing untrusted is read. -->
- None.

## Module interactions
<!-- Behaviour at the seams with existing features: what this reads/changes, numbers that must agree, tests that exercise the surface, what existing data shows. -->
- None.

## Assumptions
<!-- Source tag: [default] | [human] | [repo] | [dependency]. -->
- None.

## Needs clarification
<!-- Open questions, each also marked inline: [NEEDS CLARIFICATION: Q-n <question>]. An approved spec has "None." here. -->
- None.

## Clarifications
<!-- ### Session YYYY-MM-DD
- Q-n: <question> → <answer> (→ AC-4, EC-2) -->
- None.

## Changelog
- YYYY-MM-DD — created (draft).
