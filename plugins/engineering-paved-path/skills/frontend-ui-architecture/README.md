# Frontend UI Architecture — skill README

**Version:** 1.0.0

## What this skill is

A decision guide for **where React/Next.js frontend code goes and how it is structured** —
component placement, decomposition, constants/utils/helpers/hooks/state placement, folder
structure, module boundaries, and Server vs Client component placement, grounded in SOLID,
DRY, KISS, and YAGNI. The guidance lives in [SKILL.md](SKILL.md); worked good/bad pairs are
in [examples.md](examples.md).

**How it relates to `react-best-practices`.** That skill is the *rules/anti-pattern catalog*
(hooks rules, derive-don't-store, keys, memoization, accessibility, error boundaries, and
performance). This skill is the *structural layer* — it decides where things live and how
they are split, and links to `react-best-practices` (and `next-best-practices`,
`react-testing-library`) instead of restating their rules. The two are designed to be used
together with no overlap.

## Sources

Curated during research for this skill. `[fetched]` = the page was read directly while
building the skill; the rest are canonical/stable references confirmed via search. Tiers
reflect authority: official docs and well-established architecture references first.

### Official documentation

- [React — Thinking in React](https://react.dev/learn/thinking-in-react) — top-down
  component decomposition; build the tree from the UI.
- [React — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
  — hooks as the unit of reusable, non-visual logic.
- [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
  — where logic belongs; derive during render instead of storing/syncing.
- [React — Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
  — how to shape state; avoid redundant/duplicated state.
- [React — Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
  — lifting state to the nearest common owner.
- [React — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
  — context as dependency injection; the prop-drilling escape hatch.
- [Next.js — Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure)
  — official folder/file conventions for the App Router: colocation, private `_folders`,
  and route groups `(group)`.
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
  — server-by-default; where code runs.
- [Next.js — Server and Client Boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary)
  — composition across the boundary; pushing `"use client"` down.

### Architecture references

- [Bulletproof React — project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
  `[fetched]` — features-first layout; unidirectional imports `shared → features → app`; no
  cross-feature imports.
- [Bulletproof React — repository](https://github.com/alan2207/bulletproof-react) — the full
  reference application and rationale.
- [Feature-Sliced Design — overview](https://feature-sliced.design/docs/get-started/overview)
  `[fetched]` — layers/slices/segments and the "import only from layers below" rule.
- [Feature-Sliced Design — Next.js App Router guide](https://feature-sliced.design/blog/nextjs-app-router-guide)
  — applying FSD within the App Router.

### Practitioners

- [Kent C. Dodds — Colocation](https://kentcdodds.com/blog/colocation) — keep code close to
  where it is used.
- [Kent C. Dodds — State Colocation makes your app faster](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)
  — placing state low is both a maintenance and performance win.
- [Kent C. Dodds — AHA Programming](https://kentcdodds.com/blog/aha-programming) — Avoid
  Hasty Abstractions; prefer duplication over the wrong abstraction (the DRY-vs-WET nuance).
- [Kent C. Dodds — Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react)
  — colocation, context, and server vs client state.
- [Robin Wieruch — React Folder Structure Best Practices](https://www.robinwieruch.de/react-folder-structure/)
  — a progressive path from flat to feature folders.
- [TkDodo — React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager)
  — server state vs client state, and why not to mirror one into the other.
- [Developer Way — Components composition: how to get it right](https://www.developerway.com/posts/components-composition-how-to-get-it-right)
  — composition, `children`, and avoiding prop-conduit components.
- [patterns.dev](https://www.patterns.dev/) — React patterns (container/presentational,
  compound components, HOC, render props) and when each applies.
- [Alex Kondov — Tao of React](https://alexkondov.com/tao-of-react/) — practical rules for
  architecture, components, and structure.
- [Alex Kondov — Clean Architecture in React](https://alexkondov.com/full-stack-tao-clean-architecture-react/)
  — layering and separation of concerns in a React app.

### Foundational principles (SOLID / DRY / KISS / YAGNI in React)

- [Konstantin Lebedev — Applying SOLID principles in React](https://konstantinlebedev.com/solid-in-react/)
  — SOLID translated to components and hooks.
- [cekrem — Single Responsibility Principle in React](https://cekrem.github.io/posts/single-responsibility-principle-in-react/)
  — SRP as the test for splitting components.

### Supporting / practical

- [profy.dev — React Folder Structure & Screaming Architecture](https://profy.dev/article/react-folder-structure)
  — comparison of common structures.
- [Sandro Roth — How to structure your React projects](https://sandroroth.com/blog/project-structure)
  — a worked feature-based structure.
- [React Handbook — Project Standards](https://reacthandbook.dev/project-standards) —
  consolidated conventions.
- [David Tang — Techniques for decomposing React components](https://medium.com/dailyjs/techniques-for-decomposing-react-components-e8a1081ef5da)
  — concrete decomposition techniques.
- [Netguru — Professional React Project Structure](https://www.netguru.com/blog/react-project-structure)
  — feature-based structure for scaling teams.

## Changelog

- **1.0.0** — Initial release. Covers principles (SOLID/DRY/KISS/YAGNI), component
  placement & decomposition, constants/utils/helpers, business-logic/data/state placement,
  Next.js Server/Client architecture, module boundaries, naming, and a
  repository-mapping step. Scope is architecture/organization only; performance and per-rule anti-patterns
  are deferred to `react-best-practices`.
