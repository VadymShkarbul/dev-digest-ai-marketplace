# engineering-paved-path

The team's **single source of technical skills**. Other plugins never copy these files;
they reference them by namespaced name (`engineering-paved-path:react-best-practices`), so
a rule is fixed in one place and every consumer picks it up on the next update.

Skills are reference material: they load **on demand** when a task matches their
description, or when an agent preloads/loads them by name. Nothing here runs scripts on
its own, writes files, or touches the network.

## Skills

| Skill | Use when | Main consumers |
| --- | --- | --- |
| `react-best-practices` | writing/reviewing React components, hooks, state | sdd-engineering:implementer, architecture-review |
| `react-testing-library` | component and hook tests (RTL + Vitest) | sdd-engineering:implementer |
| `next-best-practices` | Next.js App Router, RSC boundaries, route handlers | implementer, architecture-review |
| `frontend-ui-architecture` | where frontend files, hooks and logic live | architecture-review (preloaded), implementation-planner |
| `fastify-best-practices` | Fastify routes, plugins, validation, errors | implementer, architecture-review |
| `drizzle-orm-patterns` | Drizzle schema, queries, transactions, migrations | implementer, architecture-review |
| `postgresql-table-design` | tables, indexes, constraints | implementer, architecture-review |
| `zod` | schema validation | implementer |
| `typescript-expert` | type-level work, tsconfig, module structure | implementer, architecture-review |
| `security` | auth, input handling, secrets, uploads (advisory) | implementer |
| `mermaid-diagram` | diagrams in plans and docs | implementation-planner, docs |

Deliberately **not** included: the DevDigest-specific `onion-architecture` (it encodes one
repository's layers and a frozen violation baseline — it stays in that repository) and
skills no workflow consumes yet. A new skill needs a named consumer.

## Install

```bash
claude plugin marketplace add VadymShkarbul/dev-digest-ai-marketplace
claude plugin install engineering-paved-path@dev-digest-ai-marketplace
```

Usually you don't install it directly: `architecture-review` and `sdd-engineering` pull it
in as a dependency.

## Provenance and licenses

| Skill | Upstream | License |
| --- | --- | --- |
| `fastify-best-practices` | github.com/mcollina/skills (`skills/fastify`) | MIT |
| `drizzle-orm-patterns` | github.com/giuseppe-trisciuoglio/developer-kit | MIT |
| `postgresql-table-design` | github.com/wshobson/agents (`plugins/database-design`) | MIT |
| `typescript-expert` | github.com/sickn33/antigravity-awesome-skills | MIT |
| `zod` | github.com/pproenca/dot-skills (`skills/.curated/zod`) | MIT |
| `next-best-practices` | github.com/vercel-labs/next-skills | **no license file detected — confirm before publishing publicly** |
| `react-best-practices`, `react-testing-library`, `frontend-ui-architecture`, `security`, `mermaid-diagram` | DevDigest course starter | **confirm with the course authors before publishing publicly** |

Local changes from upstream are listed in `CHANGELOG.md`. Each upstream license stays with
its files; this plugin adds no terms of its own.
