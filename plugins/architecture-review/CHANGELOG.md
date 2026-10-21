# Changelog — architecture-review

## 1.0.0 — 2026-10-21
- Initial release: `architecture-reviewer` generalized from DevDigest — removed hard-coded
  `server/`, `client/`, `reviewer-core`, `@devdigest/shared` and onion-gate checks; rules now
  come from the repository's own documents and declared gate. Skills referenced as
  `engineering-paved-path:<skill>`. Read-only guard moved to `hooks/hooks.json`.
