# Frontend UI Architecture — Examples

Good/bad pairs for each section of [SKILL.md](SKILL.md). These show *organization*
decisions, not rule-level fixes (for those, see
[react-best-practices/examples.md](../react-best-practices/examples.md)).

---

## 1. Where a component lives — colocate, promote on reuse

```tsx
// ❌ Bad: a one-route component dumped in the global shared bucket
// src/components/AgentCardStatusBadge/AgentCardStatusBadge.tsx
// (only /agents uses it — now it looks reusable and is far from its caller)

// ✅ Good: colocated with the only route that owns it
// src/app/agents/_components/AgentCard/AgentCard.tsx
// Promote to src/components/ ONLY when a second route tree imports it.
```

Why: colocated code is found, changed, and deleted as a unit. The global folder should mean
"genuinely shared", or the signal is lost.

---

## 2. Decomposition — split by responsibility, not to shorten a file

```tsx
// ❌ Bad: one component with three reasons to change
function PullRequestPage({ id }: { id: string }) {
  const [data, setData] = useState<Pr | null>(null);
  useEffect(() => { fetch(`/api/pulls/${id}`).then(r => r.json()).then(setData); }, [id]);
  const size = data ? bucketSize(data.additions + data.deletions) : "S"; // business logic
  return (/* 250 lines mixing header, diff, findings, and footer JSX */);
}

// ✅ Good: each concern owns a unit
function PullRequestPage({ id }: { id: string }) {
  const { data, isLoading } = usePullRequest(id);   // data + fetching → hook (§5)
  if (isLoading) return <Loading />;
  if (!data) return <NotFound />;
  return (
    <PageShell>
      <PrHeader pr={data} />
      <PrDiff pr={data} />
      <PrFindings pr={data} />
    </PageShell>
  );
}
```

```tsx
// ❌ Bad: extracting a single-use component only to shorten the file (AHA violation)
const Title = () => <h1 className="title">{label}</h1>; // used once, adds indirection

// ✅ Good: inline until reuse or genuine clarity demands extraction
<h1 className="title">{label}</h1>
```

---

## 3. Constants — no magic values; place at the nearest tier

```tsx
// ❌ Bad: magic numbers/strings inline, repeated, unexplained
if (additions + deletions > 250) return "L";
<span style={{ color: "#e5a000" }}>Medium</span>

// ✅ Good: named constants at the right tier
// constants.ts (feature-level, shared by this feature's files)
export const SIZE_MEDIUM_MAX = 250;
export const SIZE_COLOR = { S: "var(--ok)", M: "var(--warn)", L: "var(--danger)" } as const;

// use site reads as intent
if (total > SIZE_MEDIUM_MAX) return "L";
<span style={{ color: SIZE_COLOR[size] }}>{label}</span>
```

Why: one source of truth, a self-describing name, and one place to change. Constants hold
data (maps, thresholds) — never JSX.

---

## 4. Helpers — folder-local by default, global on the second consumer

```ts
// ❌ Bad: a one-folder transform promoted to a global grab-bag too early
// src/lib/utils.ts
export function bucketPrSize(pr: Pr) { /* only /pulls uses this */ }

// ✅ Good: keep it next to its only caller…
// src/app/repos/[repoId]/pulls/helpers.ts
export const sizeOf = (pr: Pr) =>
  pr.additions + pr.deletions > SIZE_MEDIUM_MAX ? "L" : "M";

// …and promote to lib/ only when a second surface needs identical output
// src/lib/format.ts
export const formatCost = (cents: number) => `$${(cents / 100).toFixed(2)}`; // used on 4 screens
```

Why: a global `utils` bin that collects one-off functions becomes unprunable. Promote on
proven reuse (AHA), not on a hunch.

---

## 5. Business logic, data, and state — right home for each

```tsx
// ❌ Bad: fetch + server data mirrored into useState + logic, all in the component
function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  useEffect(() => { fetch("/api/agents").then(r => r.json()).then(setAgents); }, []);
  // agents is server state living in useState → two sources of truth, no caching
}

// ✅ Good: data in a query hook; component just renders
function AgentList() {
  const { data: agents = [], isLoading } = useAgents(); // src/lib/hooks/agents.ts
  if (isLoading) return <Loading />;
  return <>{agents.map(a => <AgentCard key={a.id} agent={a} />)}</>;
}
```

```tsx
// ❌ Bad: state lifted far above its only user, drilled through props
<App selectedId={id} setSelectedId={setId}>  // App doesn't use id
  <Sidebar selectedId={id} setSelectedId={setId} />

// ✅ Good: state colocated in the component that uses it; share via composition/context only when needed
function Sidebar() { const [selectedId, setSelectedId] = useState<string>(); /* ... */ }
```

Why: server state and client state have different lifecycles — keep server data in the
cache library and UI state local. Put state at the lowest owner; lift only to share.

---

## 6. Next.js — push the client boundary down; compose via children

```tsx
// ❌ Bad: whole page is a Client Component, so data fetching + everything ships to the browser
"use client";
export default function Page() {
  const { data } = useQuery(...);        // could have been server-fetched
  return <Dashboard data={data} />;
}

// ✅ Good: server page fetches; only the interactive island is a client component
// page.tsx (Server Component — no "use client")
export default async function Page() {
  const data = await getDashboard();     // runs on the server
  return (
    <ClientTabs>          {/* client: holds tab state */}
      <DashboardPanels data={data} />     {/* server content passed as children stays on server */}
    </ClientTabs>
  );
}
```

Why: server-by-default keeps bundles small and secrets server-side; a Server Component passed
as `children` into a Client Component is not pulled into the client bundle.

---

## 7. Module boundaries — no cross-feature imports

```ts
// ❌ Bad: one feature reaches into another feature's internals
// src/app/agents/_components/AgentCard/AgentCard.tsx
import { PrRow } from "../../../repos/[repoId]/pulls/_components/PrRow"; // feature → feature

// ✅ Good: shared code lives in the shared layer; features compose at the route/app level
import { PrRow } from "@/components/PrRow";     // promoted to shared because 2 features need it
// or: render one feature from the page and pass data down, instead of importing across features
```

Rule of thumb: dependencies flow `shared → features → app`. If a feature needs another
feature, either the shared piece belongs in the shared layer, or the composition belongs at
the app/route level.

---

## 8. Naming & barrels — a folder exposes a public API

```ts
// ❌ Bad: callers import deep internals; renaming the file breaks them
import AgentCard from "@/app/agents/_components/AgentCard/AgentCard";

// ✅ Good: import through the barrel; internals can move freely
// src/app/agents/_components/AgentCard/index.ts
export { default, default as AgentCard } from "./AgentCard";
export type { AgentCardProps } from "./AgentCard";

// caller
import { AgentCard } from "@/app/agents/_components/AgentCard";
```
