# Compatibility — research-tools

- **Claude Code:** `>=2.1.110`. The guard hook relies on `agent_type` in PreToolUse input
  (verified on 2.1.267).
- **Tools needed:** `node` (for the guard hook), `git`, `rg` recommended.
- **Network:** WebSearch / WebFetch for External mode only.
