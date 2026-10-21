# dev-digest-ai-marketplace

AI Engineering's **Claude Code plugin marketplace**: the reusable part of the DevDigest
harness, packaged so any repository can install it, update it and roll it back without
copying files. It lives apart from DevDigest on purpose: product and harness have
different owners and release cadences.

| Plugin | Version | What it gives you | Depends on |
| --- | --- | --- | --- |
| [`engineering-paved-path`](plugins/engineering-paved-path) | 1.0.0 | 11 technical skills (React, RTL, Next.js, Fastify, frontend architecture, Drizzle, PostgreSQL, Zod, TypeScript, security, Mermaid) | — |
| [`research-tools`](plugins/research-tools) | 1.0.0 | `researcher` — read-only repo / external-docs investigator | — |
| [`architecture-review`](plugins/architecture-review) | 1.0.0 | `architecture-reviewer` — reviews a diff against the repo's *own* documented boundaries | `engineering-paved-path@^1.0.0` |
| [`sdd-engineering`](plugins/sdd-engineering) | 1.0.0 | spec-driven development: spec → plan → implement → review → retro | all three above |

```
sdd-engineering
├── engineering-paved-path@^1.0.0
├── research-tools@^1.0.0
└── architecture-review@^1.0.0
    └── engineering-paved-path@^1.0.0
```

## Install

```bash
claude plugin marketplace add VadymShkarbul/dev-digest-ai-marketplace --scope project
claude plugin install sdd-engineering@dev-digest-ai-marketplace --scope project
claude plugin list --json          # no dependency-unsatisfied / dependency-version-unsatisfied
```

Then start a new session (or `/reload-plugins`) and ask for a spec and a plan for a
feature. Dependencies are installed automatically. Update and rollback:
[docs/RELEASES.md](docs/RELEASES.md).

## Catalog

A static catalog (search, plugin pages, dependencies, README, copy-install) is built from
this repository and published to GitHub Pages:

```bash
node scripts/build-index.mjs
cd site && npm ci && npm run build && npm run preview
```

## Repository

| Path | What |
| --- | --- |
| `.claude-plugin/marketplace.json` | the catalog (`latest` channel) |
| `channels/stable/` | the `stable` channel catalog, pinned to release tags |
| `plugins/<name>/` | plugin sources (manifest, skills, agents, hooks, evals, docs) |
| `scripts/build-index.mjs` | catalog index + repository checks (`--check` in CI) |
| `scripts/eval-runner.mjs` | behaviour evals + cost metrics via `claude -p` |
| `scripts/tests/` | unit tests for guard hooks and scripts (`node --test`) |
| `site/` | React + TypeScript + Vite catalog |
| `docs/` | [guidelines](docs/PLUGIN-GUIDELINES.md) · [security](docs/SECURITY.md) · [releases](docs/RELEASES.md) · [cost baseline](docs/COST-BASELINE.md) · [site spec](docs/SITE-SPEC.md) |

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md). Ownership: [CODEOWNERS](CODEOWNERS).
