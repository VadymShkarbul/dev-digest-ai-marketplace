# Architecture

Two layers:

- `src/domain/` — pure business rules. It MUST NOT import from `src/infra/` (keeps the rules testable without I/O).
- `src/infra/` — database and HTTP adapters. It may import from `src/domain/`.

Architecture gate: none (review by hand).
