---
name: frontend-ui-architecture
version: 1.0.0
description: "Architecture and code-organization guide for React/Next.js frontends. Decides WHERE code goes and HOW it is structured: where components, constants, utils/helpers, hooks, business logic, state, and types live; how to break a component down; folder structure; module boundaries; and Server vs Client component placement — grounded in SOLID, DRY, KISS, and YAGNI. Use this whenever creating, moving, splitting, or naming frontend files; setting up or refactoring folder structure; deciding where a piece of code belongs; reviewing a PR for structure/organization; or asking 'where should this go?'. This is the structural layer and complements react-best-practices (per-rule anti-patterns, hooks rules, performance) and next-best-practices (Next.js specifics) — cross-link to those rather than duplicating them here."
---

# Frontend UI Architecture

The decision guide for **where frontend code goes and how it is structured**. It answers
"where should this live?", "should I split this component?", "helper or hook?",
"which folder?", and "server or client component?".

**Scope — read this first.** This skill covers *architecture and organization only*:
placement, decomposition, folder structure, module boundaries, and the principles behind
them. It deliberately does **not** repeat per-rule guidance that lives elsewhere:

- Anti-patterns, hooks rules (`useEffect`/`useMemo`), keys, conditional rendering,
  accessibility, error boundaries, and **performance** → [react-best-practices](../react-best-practices/SKILL.md).
- Next.js data-fetching/caching/rendering specifics → [next-best-practices](../next-best-practices/SKILL.md).
- Component/hook testing → [react-testing-library](../react-testing-library/SKILL.md).

Code examples for every section: [examples.md](examples.md). Full source list and rationale:
[README.md](README.md).

---

## Core principles (the "why" behind every placement)

Every rule below is a consequence of these. When a specific rule does not fit your case,
reason from these instead.

- **SRP (Single Responsibility) — one reason to change.** A file, component, or hook
  should do one job. "Does this have more than one reason to change?" is the root test for
  *splitting* anything — a component, a hook, or a folder. Mixing data fetching, business
  rules, and rendering in one component gives it three reasons to change.
- **DIP / ISP (depend on abstractions, keep interfaces narrow).** Components depend on
  *props and context*, not on where data comes from. Keep prop lists small and intent-named
  (a component taking 10 props usually does too much). Prefer **composition over
  inheritance** — build big things from small things via `children`/slots.
- **DRY vs WET → AHA (Avoid Hasty Abstractions).** Do not abstract on the first
  repetition. A wrong abstraction is more expensive than duplication, because every future
  requirement must bend around it. Wait for the pattern to prove itself (rule of three),
  then extract. "Prefer duplication over the wrong abstraction."
- **KISS / YAGNI.** Build for today's known requirements, not an imagined future. The
  simplest structure that expresses intent wins. A speculative `utils/` layer, a generic
  hook with one caller, or a five-level folder tree "for scale" is a cost you pay now for a
  benefit you may never need.
- **Colocation.** Keep code as physically close as possible to where it is used. Things
  used together should live together; move code *up* or *out* only when a second consumer
  appears. Colocation makes features easy to understand, change, and **delete**.

---

## Quick map: where does it go?

| Kind of code | Default home | Promote to… when |
|---|---|---|
| Component used by one route/feature | colocated `_components/<Name>/` next to the route | 2+ route trees use it → shared `components/<Name>/` |
| Component used across the app | shared `components/<Name>/` | — |
| Constant used in one file | module-level `const` at top of that file | shared in a feature → feature `constants.ts`; truly cross-cutting → `lib/`/config |
| Pure helper used in one folder | folder-local `helpers.ts` | a 2nd surface needs it → global `lib/<name>.ts` |
| Business logic / orchestration | a custom hook (`useX`) | — (hooks are the unit of logic reuse) |
| Data fetching / mutations | the data layer (query hooks over an API client) | never inline in a component |
| State | the lowest component that needs it | shared by siblings → lift to nearest common parent; cross-cutting → context |
| Types / contracts | colocated with their owner or a shared types module | shared across packages → the shared contract source |
| Styles | per the project's styling convention (colocated) | — |

Everything below explains the *why* and the edge cases.

---

## 1. Where a component lives

Start colocated, promote on reuse.

- **One consumer (a route/feature owns it):** put it in a `_components/<Name>/` folder next
  to the route or feature that uses it. In Next.js, an `_`-prefixed folder is *private* —
  it is never turned into a route, so feature files sit safely beside `page.tsx`.
- **Two or more route trees use it:** promote to a shared `components/<Name>/` folder. Do
  this only when the second consumer actually exists — promoting speculatively spreads code
  out for no benefit (KISS/colocation).
- **Why:** colocated code is discovered, changed, and deleted as a unit. A component that
  lives next to its only user tells the next reader exactly what it is for; a component in a
  global `components/` bucket claims to be reusable whether or not it is.

## 2. How to break a component down

Decompose by **responsibility**, not by line count alone.

- **Split when there is more than one reason to change** — e.g. it fetches data *and*
  formats it *and* renders three unrelated sections. Give each concern its own unit.
- **Build the tree from the UI (Thinking in React):** identify the boxes in the design;
  each conceptual box is a candidate component. Compose the page from those.
- **Signals to split:** the file is hard to scan (~150–200+ lines), you are scrolling to
  understand one section, JSX is repeated, or a chunk has its own state/logic.
- **Compose, don't build prop-conduits:** prefer `children` and slot props over passing
  data through layers of wrappers. *Lift content up* (pass JSX as `children` when the
  wrapper does not need it) and *push state down* (keep state in the subtree that uses it).
- **Know when NOT to split (AHA):** a single-use sub-component that only exists to shorten a
  file adds indirection without reuse. Inline it until reuse or genuine clarity demands
  extraction. Group trivial, logic-free presentational bits (a `Stat`, a `Row`) in one
  `atoms.tsx` file rather than a folder each.

## 3. Where constants go

Constants are **data**, not UI. Never inline magic numbers/strings.

- **Placement tiers (nearest first):**
  1. Module-level `const` at the top of the file that uses it (default).
  2. A feature-level `constants.ts` when several files in one feature share it.
  3. Global config (`lib/`/`config`) only when the value is genuinely cross-cutting
     (API base URL, feature flags, app-wide thresholds).
- **Why named constants:** a single source of truth, a readable name at the use site, and
  one place to change. `SIZE_MEDIUM_MAX` explains itself; `250` does not.
- **Keep JSX out of constants.** Constants hold lookup tables and thresholds — colors mapped
  to CSS variables, labels mapped to i18n keys, status metadata, enum-like maps. JSX belongs
  in components.

## 4. Where utils / helpers go

Helpers are **pure functions with no React**. They are the easiest thing to test and the
easiest thing to over-share.

- **Two tiers:** a folder-local `helpers.ts` for logic used by exactly one folder; a global
  `lib/<name>.ts` (e.g. formatters, URL builders) for logic used across surfaces.
- **Promote on the second consumer, not before (AHA + colocation).** A formatter that must
  render identically on four screens belongs in `lib/`; a one-off transform belongs next to
  its caller. Moving it global too early creates a dumping-ground `utils` no one can prune.
- **Keep them pure and intent-named.** Pure functions are trivially testable and reusable;
  name by what they produce (`sizeOf`, `formatCost`), not how.

## 5. Where business logic, data, and state live

Keep components about *rendering*. Everything else has a home.

- **Business logic → custom hooks.** A hook is React's unit of reusable logic. Move
  orchestration, derived workflows, and stateful behavior into `useX` hooks so the component
  body stays declarative. (For *what not to put in an effect*, see react-best-practices.)
- **Data fetching → the data layer.** All server calls go through an API client and query
  hooks; never `fetch` inside a component. This centralizes error handling, caching, and
  types, and keeps components synchronous and testable.
- **Distinguish server state from client state.** Server/cache state (data owned by the
  backend) belongs in a query/cache library (e.g. TanStack Query) — it is async, shared, and
  can go stale. Client/UI state (open/closed, form drafts, selection) belongs in local
  `useState`/`useReducer`. **Do not copy server data into `useState`** — you create two
  sources of truth that drift.
- **State placement:** put state in the lowest component that needs it; lift to the nearest
  common parent only when siblings must share it. Deriving beats storing (see
  react-best-practices → *Derive, Don't Store*).
- **Context is dependency injection, not a global store.** Use it for cross-cutting values
  (auth, theme, current-repo). Split contexts by concern so a change re-renders only what
  cares. Reach for it to solve *prop drilling* only when a whole subtree needs the value —
  try composition (`children`) first.

## 6. Next.js architecture (App Router)

Server vs Client is a **placement decision**, not a styling one.

- **Server by default; `"use client"` at the leaves.** Everything is a Server Component
  until it needs interactivity. Add the client boundary as *low* in the tree as possible so
  the least code ships to the browser and the most stays server-rendered.
- **Put it on the server when** it fetches data, touches secrets/DB/SDKs, or renders large
  non-interactive trees. **Put it on the client when** it needs event handlers, browser APIs
  (`window`, `localStorage`), local state, or effects.
- **Compose across the boundary with `children`.** A Server Component passed as `children`
  into a Client Component stays server-rendered — so a client `Modal`/`Tabs` can wrap
  server-fetched content without pulling it into the bundle.
- **Structural tools:** keep `page.tsx` thin (compose a feature view); use route groups
  `(group)` to organize without changing URLs, private `_folders` for colocated non-route
  files, and `layout.tsx` for shared shells. For data/caching/rendering specifics, see
  next-best-practices.

## 7. Module boundaries & imports

Structure should make dependencies obvious and features deletable.

- **Unidirectional flow: `shared → features → app`.** Shared/generic code knows nothing
  about features; features build on shared; the app/route layer composes features. This
  prevents cycles and keeps each layer replaceable.
- **Features do not import other features.** If two features need the same thing, it is
  shared — lift it to the shared layer. If one feature needs to render another, compose them
  at the app/route level (pass data down). Cross-feature imports create a tangle that cannot
  be split later.
- **A folder's `index.ts` barrel is its public API.** Import from the barrel, not from a
  folder's internal files, so internals can move without breaking callers.
- **Reference model:** Feature-Sliced Design formalizes this as layers/slices/segments with
  a strict "import only from layers below" rule — a useful mental model even if you do not
  adopt the full methodology (see README).

## 8. Naming & file conventions

- **One component per file**; the file/folder is named for the component (PascalCase).
  Small, private sub-components may share a file (`atoms.tsx`).
- **Barrel `index.ts`** re-exports the folder's public surface (default + named + prop
  types), so callers write `import { AgentCard } from ".../AgentCard"`.
- **Colocate tests** as `<Name>.test.tsx` beside the component.
- **A consistent per-feature file set** makes any folder predictable. Include only what a
  feature needs — do not create empty `constants.ts`/`helpers.ts` files "for symmetry".

## 9. Map this onto the repository you are in

Before placing a file, read the repository's own frontend instructions (`CLAUDE.md`,
`AGENTS.md`, the client package's README or `docs/`) and an existing feature folder. Where
the repository already encodes a convention (folder set, where hooks and API clients live,
how shared contracts are vendored), **match it** — the repository wins over this guide.

## Related skills

- [react-best-practices](../react-best-practices/SKILL.md) — anti-patterns, hooks rules,
  state hygiene, performance (the *rules* layer).
- [next-best-practices](../next-best-practices/SKILL.md) — Next.js App Router, RSC data
  fetching, optimization.
- [react-testing-library](../react-testing-library/SKILL.md) — testing the components you
  organize here.
