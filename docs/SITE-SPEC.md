# Catalog site — spec

The site is for **discovery**: find a plugin or one of its skills/agents, read its docs,
see its dependencies and copy the install command. Installing stays in the CLI. The visual
design is the "Каталог" design (dark/light, IBM Plex, kind colours); copy is Ukrainian.

## Non-goals (v1)

No backend, accounts, ratings, download counters, comments or analytics. Everything is
static files built in CI from this repository.

## Build

```
node scripts/build-index.mjs            # writes site/public/{index,releases,stats}.json + bodies/
node scripts/build-index.mjs --check    # same checks, writes nothing; non-zero on any problem
cd site && npm ci && npm run build      # Vite → site/dist (GitHub Pages artifact)
```

Generated JSON and `site/dist/` are not committed. `validate.yml` builds both on every PR;
`pages.yml` rebuilds and publishes `site/dist` after a merge to `main`.

## Index (`site/public/index.json`)

```jsonc
{
  "schema": 1,
  "generatedAt": "<ISO>", "commit": "<sha12>",
  "marketplace": { "name", "description", "owner", "repoUrl" },
  "plugins": [{
    "id": "plugin:<name>", "kind": "plugin", "name", "displayName", "version", "description",
    "author", "keywords": [], "license", "category", "compatibility": "<first line of COMPATIBILITY.md>",
    "updated": "<date of newest CHANGELOG entry>", "dependencies": [{ "name", "version" }],
    "dependents": ["<plugin>"], "installCommand": "/plugin install <name>@<marketplace>",
    "sourcePath": "plugins/<name>", "counts": { "skill", "agent", "command", "hook" },
    "body": "bodies/plugin__<name>.md"            // README
  }],
  "artifacts": [{
    "id": "<kind>:<plugin>/<name>", "kind": "skill|agent|command|hook", "plugin", "name",
    "qualifiedName": "<plugin>:<name>", "description", "keywords": [] /* plugin's */,
    "invocation": "/<plugin>:<skill> | @agent-<plugin>:<agent> | ''", "tools": [], "model",
    "userInvocable": bool, "modelInvocable": bool, "version", "author", "updated",
    "installCommand", "sourcePath", "body": "bodies/<kind>__<plugin>__<name>.md"
  }]
}
```

`releases.json` — every CHANGELOG entry: `{ plugin, version, date, summary }`, newest first.
`stats.json` — counts by kind, total skills/agents, plugins per keyword.
`bodies/*.md` — README / SKILL.md / agent body **without frontmatter**, fetched on demand.

**Checks (`--check` and normal builds both fail on them):** every marketplace entry has a
`plugin.json` whose `name` matches; versions are SemVer; every dependency names a catalog
plugin and has a range; no dependency cycles; every plugin has README, CHANGELOG and
COMPATIBILITY; the CHANGELOG's newest entry equals `plugin.json` `version`; no absolute home
paths (`/Users/<x>/`, `/home/<x>/`) and no secret-looking strings in any plugin file.

## Routes (hash routing — GitHub Pages has no server rewrites)

| Route | Screen |
| --- | --- |
| `#/` | Home: hero search, keyword chips, stats tiles, "Що нового" (4 latest releases), browse by kind |
| `#/search?q=&kind=&kw=&author=&sort=` | Search: facets (kind, keywords, author), sort (relevance, name, updated), result cards with **Copy install** |
| `#/plugin/<name>` | Plugin: version, owner, compatibility, install command + copy, composition by kind, dependencies (links) and dependents, README, changelog |
| `#/artifact/<kind>:<plugin>/<name>` | Skill/agent: kind, qualified name, invocation, tools, model, install command of its plugin, rendered body |
| `#/whats-new` | Every release, newest first |
| `#/getting-started` | Add marketplace → install → update, plus "marketplace update vs plugin update" and the stable channel |

Unknown routes render the home screen. Query state lives in the hash so a search is shareable.

## Search

MiniSearch, in the browser, over plugins and artifacts. Fields and boosts: `name`
(×5), `displayName` (×4), `keywords` (×3), `description` (×2), `body` (×1, README / SKILL.md
text loaded into the index at build time, capped at 4 000 chars per document). Prefix and
fuzzy (0.2) matching; every query term must match (`combineWith: AND`). Facets filter the
result set after search. The ⌘K / Ctrl-K palette uses the same index, top 8 results.

## Detail pages

- Plugin version, dependencies and composition come from the **index only** (which comes
  from `plugin.json` and the component files) — never hand-written in the site.
- Markdown (`README`, `SKILL.md`, agent bodies) is rendered with `marked` and **always**
  sanitized with DOMPurify before insertion: repository content is not trusted HTML. Links
  open in a new tab with `rel="noopener noreferrer"`.
- Copy install writes exactly `/plugin install <name>@dev-digest-ai-marketplace` and shows a
  toast "Скопійовано в буфер".

## Acceptance

- Searching `react` finds the `engineering-paved-path` plugin and its `react-best-practices`
  skill; searching `planner` finds `sdd-engineering:implementation-planner`.
- The `sdd-engineering` page shows the version from `plugin.json` and three dependency links.
- Copy install on any card copies the command above.
- Works at 390 px width; dark and light themes; keyboard reachable (Tab, Enter, Esc closes
  the palette).
