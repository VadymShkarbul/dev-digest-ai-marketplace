# Releases, updates, channels and rollback

## Versioning (SemVer, per plugin)

| Change | Bump | Example |
| --- | --- | --- |
| Removes or renames a component, changes a written path or an output format consumers parse, raises the minimum Claude Code version | **MAJOR** | `spec-creator` writes specs to a new default dir |
| Adds behaviour that existing users don't have to react to | **MINOR** | `1.1.0`: spec-creator refuses to finish while a mandatory requirement has no acceptance criterion |
| Fixes wording, a bug, a doc | **PATCH** | typo in a skill, a guard false positive |

`version` lives only in `plugin.json`; the newest `CHANGELOG.md` entry must match it
(`build-index --check` enforces this). Dependents use caret ranges (`^1.0.0`), so a MINOR or
PATCH of a dependency reaches them without a release of their own; a MAJOR needs a
coordinated release of every dependent.

## Tags

Git-backed dependency ranges resolve against tags named `<plugin>--v<version>`, read from
**this** repository (our plugins use relative-path sources). Release order: dependencies
first, then consumers.

```bash
cd plugins/engineering-paved-path && claude plugin tag --dry-run && claude plugin tag --push
cd ../research-tools               && claude plugin tag --push
cd ../architecture-review          && claude plugin tag --push
cd ../sdd-engineering              && claude plugin tag --push
```

`claude plugin tag` validates the plugin, checks that `plugin.json` and the marketplace
entry agree, refuses a dirty tree or an existing tag, and creates an annotated tag. Before
each tag: CI green on that commit, `CHANGELOG.md` entry written, evals run (pass rate and
cost in [COST-BASELINE.md](COST-BASELINE.md)). **A tag is never moved or deleted** — a bad
release gets a new PATCH (see [SECURITY.md](SECURITY.md#after-an-unsafe-release)).

Release evidence (fill one row per release):

| Tag | Commit | CI | Evals | Notes |
| --- | --- | --- | --- | --- |
| see [COST-BASELINE.md § Releases](COST-BASELINE.md#releases) | | | | |

## Channels

Claude Code has no built-in plugin release channels, so a channel is a **second
marketplace with its own name**:

| Channel | Marketplace name | Catalog file | Resolves to |
| --- | --- | --- | --- |
| `latest` | `dev-digest-ai-marketplace` | `.claude-plugin/marketplace.json` (relative paths) | `main`; dependency ranges → highest matching tag |
| `stable` | `dev-digest-ai-marketplace-stable` | branch `stable` (copy of `channels/stable/.claude-plugin/marketplace.json`) | every plugin pinned to a release tag **and** its commit SHA (`git-subdir` sources) |

The stable catalog is generated, never hand-edited, then copied to the `stable` branch:

```bash
node scripts/make-channel.mjs --url https://github.com/VadymShkarbul/dev-digest-ai-marketplace.git \
  --pin sdd-engineering@1.0.0 --pin engineering-paved-path@1.0.0 --pin research-tools@1.0.0 --pin architecture-review@1.0.0
```

Add a channel (pick one per project):

```bash
# latest
claude plugin marketplace add VadymShkarbul/dev-digest-ai-marketplace --scope project
# stable — the `stable` branch carries the pinned catalog at its root
claude plugin marketplace add "VadymShkarbul/dev-digest-ai-marketplace#stable" --scope project
```

## Update

Two separate steps — **marketplace update** refreshes the catalog (which versions exist),
**plugin update** moves an installed plugin to the newest version that catalog offers:

```bash
claude plugin marketplace update dev-digest-ai-marketplace
claude plugin update sdd-engineering@dev-digest-ai-marketplace --scope project
claude plugin list --json        # version moved; no errorDetails
```

Then `/reload-plugins` or a new session. On Claude Code 2.1.267 `plugin update` defaults to
`--scope user` — always pass `--scope project` for a project install. Auto-update is **off**
for this marketplace; updates happen only when someone runs the commands above.

## Rollback

There is no `plugin rollback` command. Rolling back = switching the project to the `stable`
channel, which pins the last verified release.

```bash
# 1. leave latest (uninstall only the consumer; keep plugin data)
claude plugin uninstall sdd-engineering@dev-digest-ai-marketplace --scope project --keep-data
claude plugin prune --scope project -y         # drops the auto-installed latest dependencies
# 2. install from stable
claude plugin marketplace add "VadymShkarbul/dev-digest-ai-marketplace#stable" --scope project
claude plugin install sdd-engineering@dev-digest-ai-marketplace-stable --scope project
claude plugin list --json                       # sdd-engineering 1.0.0, deps 1.0.0, no errors
# 3. /reload-plugins (or a new session), then the smoke eval
```

**What survives a rollback:** everything the workflow wrote into the repository — specs,
plans, `.sdd/learnings/`, `.sdd/ledger.md`, `INSIGHTS.md` — is project data in git and is
untouched by plugin installs. `--keep-data` keeps `${CLAUDE_PLUGIN_DATA}` (these plugins
store nothing there today). **Do not** `marketplace remove` the latest channel as a first
step: removing a marketplace uninstalls all of its plugins and deletes their data.

**External state:** the SDD plugins change nothing outside the repository (no network
writes, no issues, no PRs — commits only when a human asks). A rollback therefore needs no
external clean-up; if a future version gains external side effects, its release notes must
say how to undo them.

**Back to latest**, once the fix is released and its evals are green:

```bash
claude plugin uninstall sdd-engineering@dev-digest-ai-marketplace-stable --scope project --keep-data
claude plugin prune --scope project -y
claude plugin install sdd-engineering@dev-digest-ai-marketplace --scope project
```

The rehearsed sequence and its outputs are recorded in
[COST-BASELINE.md § Releases](COST-BASELINE.md#releases).
