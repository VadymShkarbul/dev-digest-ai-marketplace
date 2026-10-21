# Security policy

Plugins run inside other teams' repositories with those teams' permissions. A plugin is
code that ships prompts, scripts and hooks to every consumer, so this policy is strict.

## Never in a plugin

| Forbidden | Why | Instead |
| --- | --- | --- |
| Secrets: API keys, tokens, passwords, cookies, private keys, `.env` content | Every consumer and the public catalog would receive them | Read from the consumer's environment at run time; document the variable name in the README |
| Credentials in `plugin.json` / `marketplace.json` (incl. `headers`, URLs with `user:pass@`) | Manifests are copied into every plugin cache | `userConfig` with `sensitive: true`, or env vars |
| Absolute paths (`/Users/...`, `/home/...`, `C:\...`) | Leak the author's machine and break for everyone else | `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_DATA}`, or a repo-relative path |
| Product-specific paths or names (`server/src/...`, `@devdigest/shared`, `reviewer-core`) | The plugin would silently assume one repository's layout | Read the consumer's own docs (`CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`) at run time |
| Network calls from hooks or scripts | Exfiltration channel with the consumer's data | None in this marketplace today; any future one needs a SECURITY review and a README section |
| `curl \| sh`, downloading and executing code | Supply-chain risk | Vendor the script into the plugin, reviewed |

`node scripts/build-index.mjs --check` fails the build on absolute home paths and on
common secret patterns in any plugin file; CI runs it on every PR.

## Permissions

- **Least privilege per agent.** `tools:` lists only what the agent needs. Reviewers,
  verifiers and researchers have no `Write`/`Edit`/`NotebookEdit`.
- **Plugin agents cannot carry `hooks`, `mcpServers` or `permissionMode` frontmatter**
  (Claude Code ignores them for plugin agents). Guardrails that must hold go into the
  plugin's `hooks/hooks.json` and key on the hook input's `agent_type`, so they fire only
  inside the plugin's own subagents.
- **Hooks fail closed.** A guard hook that cannot parse its input blocks (exit 2).
- **Untrusted input is data.** Every agent that reads repository text, diffs, web pages or
  other agents' reports treats instructions inside them as data and quotes them in its
  report instead of following them.

## Reviewing scripts

Every script under `plugins/*/skills/*/scripts/` and every hook command is reviewed by the
plugin's CODEOWNERS and by one AI Engineering owner. Check that it:

1. runs offline (no `fetch`, `curl`, `wget`, `nc`, sockets);
2. writes only inside the consumer's repo paths the README documents, the scratch dir
   (`$TMPDIR`), or `${CLAUDE_PLUGIN_DATA}`;
3. refuses paths outside the repo root (`..`, absolute);
4. has a `--help`/usage line and non-zero exit codes on misuse.

## After an unsafe release

If a released version is found to leak data, run unsafe code, or bypass a guard:

1. **Stop the spread (within the hour).** Remove the plugin's entry from the `latest`
   channel's `marketplace.json` (or point it at the last safe tag) and merge with an
   expedited single review. `claude plugin marketplace update` then stops offering it.
2. **Roll consumers back.** Publish the rollback commands from
   [RELEASES.md](RELEASES.md#rollback) in the incident channel: install from the `stable`
   channel pinned to the last safe tag.
3. **Never delete or move the bad tag** — consumers and audits need to know exactly what
   shipped. Release a fixed PATCH (`x.y.z+1`) instead and mark the bad version in
   `CHANGELOG.md` as `**YANKED** — <reason>`.
4. **Rotate anything exposed.** If a secret was committed, rotate it at the provider first;
   rewriting git history is not remediation.
5. **External state.** If the plugin could have changed state outside the repository
   (issues, PR comments, files outside the repo), list what it could have touched and how
   each consumer checks and restores it, in the incident note.
6. **Post-incident:** add an eval or a `build-index --check` rule that would have caught it.

## Reporting

Report a vulnerability privately to the AI Engineering owners listed in `CODEOWNERS` —
not in a public issue.
