# engineering-insights — examples

What each section holds, and what a good entry looks like. The module names (`api`,
`web`, `worker`) are placeholders for the project's own directories.

## The seven sections, with a model entry each

**What Works** — approaches that proved effective here.
> `api: resolve repositories through the DI container (src/container.ts:31) — constructing one directly bypasses the test doubles.`

**What Doesn't Work** — dead ends and why. The most valuable section and the most skipped.
> `worker: Promise.all over the batch fails the whole job on one bad item — use Promise.allSettled (src/jobs/import.ts:58).`

**Codebase Patterns** — module conventions and the "why".
> `api: routes are schema-first — declare params/body schemas on the route (src/routes/items.ts:12); hand-parsing in the handler skips response serialization.`

**Tool & Library Notes** — dependency quirks.
> `api: migrations do NOT run on boot — run the migrate script first, or every query fails with "relation does not exist" (package.json:14).`

**Recurring Errors** — an error seen more than once, plus the fix.
> `web: "Hydration failed" on the list page = new Date() during render; format on the server (src/app/list/page.tsx:22).`

**Session Notes** — one dated line per substantial session (the script adds the date).
> `Added favourites; per-user state persisted in the favourites table.`

**Open Questions** — unresolved, needs investigation.
> `Does the startup cleanup job double-run when two instances share one DB? (src/main.ts:40 assumes a single instance.)`

## Vague vs useful

| ❌ Vague | ✅ Useful |
|---|---|
| "Promises can be tricky." | "`Promise.all` on the import pipeline times out past ~30 files; use `Promise.allSettled` batched by 10 (src/import.ts:40)." |
| "watch out with state." | "web: server data flows through the query hooks in src/hooks/*, never fetch in a component — 3 screens share the cache." |
| "be careful with the copied types." | "Changing the shared contract in one package without its copy in the other fails at runtime, not at typecheck (packages/a/contract.ts:1)." |

One line, cold-actionable, names the file.

## Extend vs duplicate

Same insight, sharper wording → `Edit` the existing line in place. Existing entry is now
**wrong** → leave it and append a dated correction beneath it.

## Don't record

One-time edits · decisions that applied to a single task · anything obvious from the code ·
anything already in `README.md` or `CLAUDE.md` · an unconfirmed guess · a rule that is always
true (promote it to the module's `CLAUDE.md` instead).
