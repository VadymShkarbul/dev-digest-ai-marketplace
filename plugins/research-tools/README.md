# research-tools

`research-tools:researcher` — a generic, **read-only** investigator for any repository.

| Mode | Answers |
| --- | --- |
| Repo | where / how / who calls / is it used / since when — with `file:line` evidence and git history |
| External | what the official docs, changelog, RFC or library source say — pinned to the installed version |

Every report ends with **Not found** (what was searched and came up empty) and **Run notes**.

## Use

```text
@agent-research-tools:researcher where is the session cookie validated, and who calls it?
```

or let another workflow delegate to it (`sdd-engineering` uses it for discovery before a
spec or plan).

## What it reads and writes

- **Reads:** the repository, project instructions (`CLAUDE.md`, `AGENTS.md`, `INSIGHTS.md`),
  web pages it fetches, and `.sdd/learnings/researcher.md` if present.
- **Writes:** nothing. Tools are `Read, Grep, Glob, Bash, WebSearch, WebFetch`; the plugin's
  `hooks/readonly-guard.mjs` blocks mutating shell commands (`rm`, `sed -i`, redirection
  into the repo, git writes, installs, `curl`) inside this agent only.
- **Network:** `WebSearch`/`WebFetch` in External mode. Fetched content is treated as data.
