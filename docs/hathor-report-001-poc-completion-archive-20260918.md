---
id: HATHOR-REPORT-001
title: OpenSource HATHOR POC — Completion & Archive Report
date: 2026-09-18
product: hath0r-poc
github: Bayly-AI/HATH0R-Agentic-POC
status: complete
milestone: Phase 3 P1–P11
branch: development
tip: 53b26db
---

# OpenSource HATHOR POC — Completion & Archive Report

## 1. Executive summary

The **HATHOR Integration Console POC** (`Bayly-AI/HATH0R-Agentic-POC`) is complete as an OpenSource **integration test bed**. It proves that a browser application can consume the HATH0R CLI through a narrow, read-only TypeScript adapter without becoming a second control plane, shell, or policy engine.

Work followed the trio build order **Framework → CLI → POC**. Framework contracts (F1–F4) and CLI structured output (C1–C9) were completed earlier. This report closes **POC Phase 3 (P1–P11)**.

| Field | Value |
| --- | --- |
| Group | `hath0r-opensource` |
| Product | HATHOR-POC / Integration Console |
| Control tower | HATH0R-CLI (`Bayly-AI/HATH0R-CLI`) |
| Framework | `Bayly-AI/HATH0R-Agentic-Framework` |
| Default branch | `development` @ `53b26db` (test pyramid + CI merge) |
| License | Apache-2.0 |
| Archive intent | Milestone archive (read-only GitHub repo); not deletion |

## 2. What shipped

### 2.1 Application surface

| Route | Purpose |
| --- | --- |
| `/` | Status overview — app/CLI/doctor/KB/capabilities |
| `/products` | Suite product catalog (CLI-mediated) |
| `/diagnostics` | Sanitized probe diagnostics with source + timestamps |
| `/about` | Identity, CLI version, source-of-truth boundaries |

### 2.2 Adapter API (loopback Express)

| Endpoint | Role |
| --- | --- |
| `GET /api/health` | App liveness (`source: application`) |
| `GET /api/hathor/capabilities` | Capability document from adapter support |
| `GET /api/hathor/status` | Parallel `version` + `doctor` + `kb.path` |
| `GET /api/hathor/products` | `kb.products` only (never direct catalog I/O) |

All responses use `hathor-poc.response/1` envelopes with request IDs and audit metadata (`commandKey`, `durationMs`, `exitClass`, `resultSizeBytes`).

### 2.3 Trust boundary (server)

- Frozen 4-op map: `version | doctor | kb.path | kb.products`
- `child_process.spawn` with **no shell**
- Timeout (default 10s), 64KB stdout/stderr caps, concurrency semaphore
- Minimal env allowlist: `PATH`, `HOME`, `HATH0R_GROUP_ROOT`, `HATH0R_KB_PATH`
- Normalize `hath0r.cli.response/1` (Zod) + text compatibility
- Redact ANSI, absolute home paths, secret-like patterns before browser/logs

### 2.4 Shared contracts

- `hathor-poc.response/1` — `ApiEnvelope<T>`
- `hathor-poc.capabilities/1` — capability rows derived from **adapter support**, not UI optimism
- Runtime validation treats external JSON as `unknown` until parse succeeds

### 2.5 Quality & delivery

| Gate | Command / artifact |
| --- | --- |
| Unit + integration | `npm test` / `npm run test:integration` (~99 unit + 17 integration) |
| Aggregate local gate | `npm run check` (format, lint, typecheck, tests, build) |
| E2E | `npm run test:e2e` (Playwright; Vite + Express webServers) |
| Smoke (opt-in) | `npm run test:smoke` (real `hath0r`; not in CI) |
| CI | `.github/workflows/ci.yml` — Node 18/20 check + Playwright e2e |
| Governance | `.github/workflows/enforce-promotion-path.yml` |

Fixtures: `test/fixtures/cli/` and `test/fixtures/hathor-cli/` (CLI golden JSON).

## 3. Issue / PR map (POC Phase 3)

| ID | Scope | PR (merged → `development`) |
| --- | --- | --- |
| #9 P1 Scaffold | Vite/React/TS + Express health | #20 |
| #10 P2 CLI runner | Operation map + secure spawn | #21 |
| #11 P3 Normalizer/redaction | GUIDE-043 failure map | #22 |
| #12 P4 Shared schemas | Envelope + capabilities Zod | #23 |
| #13 P5 Health/capabilities API | Request IDs + audit | #24 |
| #14 P6 Status API | Composite probes | #25 |
| #15 P7 Products API | Catalog via CLI only | #26 |
| #16 P8 Status UI | Overview page + badges | #27 |
| #17 P9 Products/diagnostics/about UI | Remaining routes | #28 |
| #18 P10 Test pyramid | Integration matrix, e2e, smoke | #29 |
| #19 P11 CI | check + e2e + promote path | #29 |

Upstream trio dependencies (already complete before/with this phase):

- Framework F1–F4: cfg, schemas, exit codes, CI
- CLI C1–C9: portable paths, `--output json`, doctor/kb JSON, pytest, fixtures, CI

## 4. Architecture (as built)

```text
Browser (untrusted)
  → fixed /api/* routes (Vite proxy → loopback :3001)
    → Express adapter (DMZ)
      → named operations only
        → hath0r CLI (authority)
          → group root / KB hub / tower cfg
Framework docs + JSON Schemas = design/contracts source of truth
```

Capability philosophy:

- **Implemented** = adapter operation map + released CLI contract
- Runtime probe failure changes envelope `state`, not capability marketing
- Framework-only surfaces remain **unavailable**; mutations **out-of-scope**

## 5. How to run (archived snapshot)

```sh
# From OpenSource group root with HATH0R-CLI installed
npm install
npm run dev          # client :5173 + adapter :3001
npm run check
npm run test:e2e
# optional:
npm run test:smoke   # requires hath0r on PATH
```

Control tower verification:

```sh
python3 -m pip install -e ../HATH0R-CLI
hath0r --version
hath0r doctor
hath0r kb path
hath0r kb products
```

## 6. Explicit non-goals (still true at archive)

- Not a general shell, agent orchestrator UI, or credential vault
- Not a second product catalog or KB store
- Not a public multi-tenant deployment (loopback-first)
- Does not claim Framework design-stage features as implemented code
- Does not accept browser-supplied argv, paths, or env

## 7. Recommendations after archive

1. **Promote** only along `development → testing → staging → master` if a tagged release is required before freeze.
2. **Release packaging** remains tracked on the control tower: HATH0R-CLI#30 (fileset, compiled engine, npm/PyPI).
3. Keep this repo as **historical evidence** of the consumer contract; prefer Framework + CLI for ongoing contract evolution.
4. If un-archiving later, re-open issues for any net-new capability only after CLI ships a versioned command.

## 8. Archive record

| Action | Detail |
| --- | --- |
| Report | this document (`HATHOR-REPORT-001`) |
| Issue | #30 — completion report and repository archive |
| GitHub archive | `Bayly-AI/HATH0R-Agentic-POC` set to **archived** (read-only) |
| Date | 2026-09-18 |

---

*End of report.*
