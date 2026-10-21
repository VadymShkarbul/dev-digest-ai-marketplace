# Changelog — research-tools

## 1.0.0 — 2026-10-21
- Initial release: `researcher` extracted from DevDigest and generalized — no product paths,
  project exclusions read from the project's own instructions, learnings from
  `.sdd/learnings/researcher.md`, read-only guard moved from agent frontmatter (ignored for
  plugin agents) to `hooks/hooks.json` keyed on `agent_type`.
