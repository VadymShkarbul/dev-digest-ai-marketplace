# Contributing to dev-digest-ai-marketplace

This repository is a **Claude Code plugin marketplace**: a catalog
(`.claude-plugin/marketplace.json`) plus the plugin sources under `plugins/`. It is owned
by AI Engineering and released independently of any product (DevDigest included). A
change here never needs a product release, and a product change never needs a plugin
release.

You should be able to open a pull request from this file alone. If something here is
wrong or missing, fix this file in the same PR.

## Layout

```
.claude-plugin/marketplace.json   the catalog: one entry per plugin (name, source, metadata)
plugins/<name>/                   one directory per plugin (see "Plugin structure")
docs/                             policy: guidelines, security, releases, cost baseline, site spec
scripts/build-index.mjs           builds the static catalog index for the site
site/                             the GitHub Pages catalog (React + TypeScript + Vite)
.github/workflows/                validate.yml (PRs) and pages.yml (publish after merge)
CODEOWNERS                        who must review what
```

## Plugin structure

```
plugins/<name>/
├── .claude-plugin/plugin.json    REQUIRED — the source of truth for name, version, deps
├── skills/<skill>/SKILL.md       optional — one directory per skill (+ references/, scripts/)
├── agents/<agent>.md             optional — one file per subagent
├── hooks/hooks.json              optional — plugin hooks
├── evals/                        REQUIRED for skills/agents — behaviour cases (see below)
├── README.md                     REQUIRED — what it is for, how to use it, what it reads/writes
├── CHANGELOG.md                  REQUIRED — Keep-a-Changelog style, newest first
└── COMPATIBILITY.md              REQUIRED — minimum Claude Code version + required tools
```

Full rules (naming, frontmatter, tools, paths): [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md).

## Manifest fields (`.claude-plugin/plugin.json`)

| Field | Required | Rule |
| --- | --- | --- |
| `name` | yes | kebab-case, equals the directory name and the marketplace entry name |
| `version` | yes | SemVer `MAJOR.MINOR.PATCH`; bump it in every PR that changes the plugin |
| `description` | yes | one sentence: what it does and when to use it |
| `author` | yes | `{ "name": "<owning team>" }` — must match CODEOWNERS |
| `keywords` | yes | 3–8 lowercase search terms (the catalog facets on them) |
| `license` | yes | SPDX id; third-party content keeps its upstream license (see the plugin README) |
| `dependencies` | when used | `[{ "name": "<plugin>", "version": "^X.Y.Z" }]` — see "Dependency rules" |

The marketplace entry carries **only** `name`, `source` and catalog metadata
(`description`, `category`, `keywords`). Never repeat `version` or component lists there —
`plugin.json` is the single source of truth.

## Dependency rules

1. Depend on a plugin, never copy its files. A technical skill lives in exactly one plugin
   (`engineering-paved-path`) and everyone else references it by its namespaced name
   (`engineering-paved-path:react-best-practices`).
2. Use caret ranges on a released major (`^1.0.0`). No `*`, no `latest`, no exact pins
   unless a CHANGELOG entry explains why.
3. Dependencies must be released (tagged) **before** the consumer that needs them.
4. No cycles. The graph today:

   ```
   sdd-engineering ──► engineering-paved-path
                  ├──► research-tools
                  └──► architecture-review ──► engineering-paved-path
   ```

5. Reference another plugin's components by full name (`research-tools:researcher`), and
   your own components by full name wherever a field expects a plugin-scoped reference.

## Checks to run before a PR

```bash
claude plugin validate .                         # the catalog + every plugin
claude plugin validate ./plugins/<name>          # the plugin you changed
node scripts/build-index.mjs --check             # catalog index builds; names/versions agree
cd site && npm ci && npm run build               # the catalog site still builds
```

Behaviour evals (they call a model, so they cost tokens — run the plugin you changed):

```bash
claude plugin eval ./plugins/<name>
```

Then load the plugin from your working tree and try it by hand:

```bash
claude --plugin-dir ./plugins/engineering-paved-path --plugin-dir ./plugins/research-tools \
       --plugin-dir ./plugins/architecture-review --plugin-dir ./plugins/sdd-engineering
```

CI (`validate.yml`) runs validation, the index check and the site build on every PR.

## Evals

Every skill and agent ships behaviour cases in `plugins/<name>/evals/`. Each change that
alters behaviour adds or updates a case, including at least one **negative** case (a
request on which the component must *not* activate). Schema validation proves the files
have the right shape; evals prove the composition does the right work. Both are required.

## Pull request checklist

- [ ] One plugin per PR (a dependency bump in a consumer is part of the same PR only if
      the dependency is already released).
- [ ] `version` bumped in `plugin.json` per [docs/RELEASES.md](docs/RELEASES.md) and a
      `CHANGELOG.md` entry added.
- [ ] `claude plugin validate .` is clean.
- [ ] No secrets, tokens, absolute paths, user names or product-specific paths
      ([docs/SECURITY.md](docs/SECURITY.md)).
- [ ] Scripts are referenced through `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_SKILL_DIR}`, never
      `.claude/skills/...` or an absolute path.
- [ ] Every agent's `tools:` is the minimum it needs; read-only agents have no Write/Edit.
- [ ] Evals added/updated and run; results (pass rate, cost) pasted in the PR description.
- [ ] README updated if inputs, outputs, or written paths changed.
- [ ] CODEOWNERS for the plugin approved the PR.
