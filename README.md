<p align="center">
  <img src="lib/assets/images/hathor-logo-1.png" alt="HATHOR logo" width="280" />
</p>

# HATHOR Agentic POC

> **Archived milestone (2026-09-18).** Phase 3 (P1–P11) is complete on
> `development`. See the
> [completion & archive report](docs/hathor-report-001-poc-completion-archive-20260918.md)
> (`HATHOR-REPORT-001`). The GitHub repository is archived read-only; un-archive
> only to resume active product work under issue-first governance.

Integration **test bed** for the HATHOR OpenSource system and the
React/TypeScript **HATHOR Integration Console**.

| Field         | Value                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Group         | `hath0r-opensource`                                                           |
| GitHub        | [Bayly-AI/HATH0R-Agentic-POC](https://github.com/Bayly-AI/HATH0R-Agentic-POC) |
| Canonical KB  | `/Users/raybayly/Development/OpenSource/.hath0r/knowledgebase`                |
| Operator CLI  | `hath0r`                                                                      |
| Control tower | `../HATH0R-CLI`                                                               |
| Framework     | `../hath0r`                                                                   |

## Purpose

The POC will prove that a browser application can consume HATHOR
capabilities without becoming a second control plane:

1. a React/TypeScript UI presents health, product-catalog, and capability
   status;
2. a narrow TypeScript server adapter invokes an allowlist of read-only
   `hath0r` commands;
3. HATHOR CLI remains the boundary for control-tower and knowledge
   orientation; and
4. unavailable framework capabilities degrade visibly instead of being
   simulated as successful.

## Current status

| Capability                                                                  | Status                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------- |
| OpenSource group, control-tower, and KB pointers                            | Implemented                                             |
| `hath0r --version`, `hath0r doctor`, `hath0r kb path`, `hath0r kb products` | Implemented                                             |
| React/TypeScript application + Status/Products/Diagnostics/About UI         | Implemented                                             |
| TypeScript adapter APIs (health, capabilities, status, products)            | Implemented (loopback Express)                          |
| Unit + integration + Playwright e2e + CI                                    | Implemented                                             |
| Opt-in smoke against real `hath0r`                                          | Implemented (`npm run test:smoke`)                      |
| Framework validation, orchestration, and governed mutation surfaces         | Design-stage; not exposed by the current OpenSource CLI |

## Application quick start

```sh
npm install
npm run dev          # Vite client :5173 + Express adapter on localhost:3001
npm run check        # format, lint, typecheck, unit+integration tests, build
npm run test:e2e     # Playwright (starts local client+server)
npm run test:smoke   # optional: real hath0r on PATH (not in CI)
```

Scaffold decisions:

- Package manager: **npm** (lockfile committed)
- HTTP library: **Express** (local-only adapter)
- Node.js: **>=18**
- Vite proxies `/api/*` → `http://localhost:3001`
- CLI golden fixtures under `test/fixtures/cli/` (and `test/fixtures/hathor-cli/`)

## Verify the OpenSource control tower

Install the sibling CLI in editable mode, then run its implemented
diagnostics:

```sh
python3 -m pip install -e ../HATH0R-CLI
hath0r --version
hath0r doctor
hath0r kb path
hath0r kb products
```

## Documentation

Start with [`docs/INDEX.md`](docs/INDEX.md).

| Document                                                                                             | Purpose                                                             |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Product requirements](docs/hathor-req-001-integration-console-requirements-20260916.md)             | POC scope, requirements, acceptance criteria, and capability status |
| [Getting started](docs/hathor-guide-037-getting-started-20260916.md)                                 | Current CLI orientation and future application setup                |
| [Architecture](docs/hathor-arch-003-integration-console-architecture-20260916.md)                    | Browser, TypeScript adapter, CLI, framework, and trust boundaries   |
| [CLI and framework integration](docs/hathor-guide-038-cli-framework-integration-20260916.md)         | Implemented command contract and planned integration seams          |
| [Development and testing](docs/hathor-guide-039-development-testing-20260916.md)                     | Proposed frontend baseline, layout, scripts, and quality strategy   |
| [Security, governance, and delivery](docs/hathor-guide-040-security-governance-delivery-20260916.md) | Secrets, command safety, issue/branch rules, and promotion          |
| [Troubleshooting](docs/hathor-guide-041-troubleshooting-20260916.md)                                 | Diagnostics for CLI, pointers, KB, app, and framework availability  |
| [Completion & archive report](docs/hathor-report-001-poc-completion-archive-20260918.md)             | Phase 3 P1–P11 delivery summary and archive record                  |

## Siblings

- Framework: `../hath0r` — [HATH0R-Agentic-Framework](https://github.com/Bayly-AI/HATH0R-Agentic-Framework)
- CLI: `../HATH0R-CLI` — [HATH0R-CLI](https://github.com/Bayly-AI/HATH0R-CLI)

The Framework sibling owns the canonical OpenSource documentation corpus.
This repository owns product-specific POC documentation. The CLI sibling is
the OpenSource control tower and implements the current `hath0r` command
surface.

## Governance

- Use `.hath0r/` as the only framework metadata root.
- Create a GitHub issue before a work branch.
- Branch from `development`; feature work targets `development`.
- Promote only through
  `local → development → testing → staging → master (Production)`.
- Never put credentials in source, docs, browser bundles, logs, fixtures, or
  screenshots.

See `AGENTS.md` for the complete project rules.

## License

Apache License 2.0 — see `LICENSE`.
