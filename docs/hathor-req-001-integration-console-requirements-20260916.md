---
id: HATHOR-REQ-001
title: "HATHOR Integration Console POC Requirements"
summary: "Requirements and acceptance criteria for a read-only React/TypeScript POC over the OpenSource HATHOR CLI."
doc_type: REQ
diataxis: reference
audience: [developer, operator, architect, agent]
tags: [poc, react, typescript, requirements]
version: 0.1.0
status: draft
created: 2026-09-16
updated: 2026-09-16
owner: "Raymond Bayly (BaylyAI)"
review:
  trust: unverified
  reviewed_by: null
  reviewed_at: null
  interval: 180d
  next_review: null
stale: false
supersedes: []
superseded_by: null
amended_by: []
parent: HATHOR-CANON-013
sources:
  - HATHOR-CANON-011
  - HATHOR-ADR-003
  - HATHOR-ADR-004
  - "../cfg/suite.yaml"
  - "../cfg/knowledge-tower.yaml"
  - "../../HATH0R-CLI/src/hath0r_cli/cli.py"
---
# HATHOR Integration Console POC Requirements

## 1. Product definition

**Working name:** HATHOR Integration Console.

The product is a local-first React/TypeScript proof of concept that verifies
safe consumption of the OpenSource HATHOR control tower and Framework. It is
an integration client, not a replacement CLI, policy engine, knowledge store,
or deployment authority.

## 2. Problem

The OpenSource suite has:

- a working control-tower CLI for environment and knowledge orientation;
- member-repository pointers and group policy;
- a canonical framework design corpus; and
- no application demonstrating how a browser experience consumes those
  capabilities without bypassing the CLI boundary.

The POC must make the difference between **working integration**, **planned
integration**, and **unavailable capability** visible to users and tests.

## 3. Outcomes

The POC succeeds when it proves:

1. React code never spawns a process or reads credentials.
2. A narrow server adapter can execute the implemented read-only `hath0r`
   allowlist and normalize exit status safely.
3. Users can see CLI, control-tower, KB, and product-catalog status.
4. Missing CLI or framework capabilities produce an honest degraded or
   unavailable state.
5. Integration behavior can be tested deterministically without requiring
   live external services.

## 4. Users

| Persona | Need |
|---------|------|
| Developer | Verify local HATHOR setup before working on the POC |
| Operator | Confirm control-tower and KB orientation without reading config files manually |
| Framework engineer | Exercise a real consumer boundary as CLI features evolve |
| QA engineer | Assert success, refusal, degraded, timeout, and malformed-output paths |
| Agent | Discover the product contract and available commands without guessing |

## 5. Capability baseline

| Capability | Current evidence | Product treatment |
|------------|------------------|-------------------|
| CLI version | Implemented by `hath0r --version` | Display normalized version |
| Suite diagnostics | Implemented by `hath0r doctor` | Use exit status for health; keep diagnostic text bounded |
| Canonical KB path | Implemented by `hath0r kb path` | Show configured/available state; restrict raw path display |
| Suite product catalog | Implemented by `hath0r kb products` | Display bounded raw YAML first; normalize only behind a tested parser |
| React UI | No scaffold in this repository | Proposed |
| TypeScript server adapter | No scaffold in this repository | Proposed |
| Knowledge search/write | Framework design only | Mark unavailable; do not invent an endpoint |
| Validation/orchestration/gates | Framework design only | Mark unavailable; do not invoke undocumented commands |
| Mutating operator actions | No current POC contract | Out of scope |
| Deployment control | Human-governed promotion path | Out of scope for the UI |

## 6. Functional requirements

### POC-FR-001 — Status overview

The application must present one overview containing:

- application build/version;
- CLI installed/unavailable state and CLI version;
- doctor status derived from process exit;
- control-tower identity;
- canonical KB configured/available state; and
- current capability flags.

**Acceptance:** the page distinguishes `ok`, `degraded`, and `unavailable`;
no failure is rendered as healthy.

### POC-FR-002 — Product catalog

The application must expose the suite product catalog obtained through
`hath0r kb products`.

**Acceptance:** the adapter never opens the canonical KB catalog directly.
Until a versioned CLI JSON contract exists, the response identifies the
payload as YAML/text and bounds its size.

### POC-FR-003 — CLI-only HATHOR access

All HATHOR reads must pass through an allowlisted adapter command. Browser
code must not access the filesystem, child processes, or the group KB.

**Acceptance:** tests prove arbitrary command, argument, path, and shell
metacharacter input cannot reach process execution.

### POC-FR-004 — Honest capability discovery

The server must publish a capability document that identifies each integration
as `implemented`, `planned`, or `unavailable`.

**Acceptance:** capability status is derived from adapter support and probes,
not hard-coded optimism in the UI.

### POC-FR-005 — Bounded diagnostics

Operator-facing diagnostics may include sanitized stdout/stderr from approved
commands.

**Acceptance:** output is time-bounded, byte-bounded, secret-redacted, and
omits sensitive absolute paths from normal browser responses.

### POC-FR-006 — Graceful degradation

The UI shell and non-HATHOR content must remain usable when the CLI, tower, or
KB is unavailable.

**Acceptance:** failures include a remediation and retry action; fixture mode,
if enabled, is visibly labeled and cannot be mistaken for a live result.

### POC-FR-007 — No governed mutations

The initial POC must not expose write, promotion, waiver, deployment,
credential, or arbitrary command operations.

**Acceptance:** the server allowlist contains only the four commands in the
current baseline table.

### POC-FR-008 — Observable requests

Each adapter call must carry a request ID and record command key, duration,
exit class, and result size without recording secrets or full environment
values.

**Acceptance:** integration tests assert the audit event shape on success,
timeout, refusal, and missing-binary paths.

## 7. Non-functional requirements

| ID | Requirement |
|----|-------------|
| POC-NFR-001 | TypeScript strict mode; no unchecked `any` at external boundaries |
| POC-NFR-002 | Server validates every request and response crossing the browser boundary |
| POC-NFR-003 | CLI processes use argv arrays, never interpolated shell strings |
| POC-NFR-004 | Every child process has a timeout, output limit, and explicit environment allowlist |
| POC-NFR-005 | No secret, token, credential-file content, or unredacted environment dump enters the browser bundle or logs |
| POC-NFR-006 | Unit and integration tests run without a live Tower or network |
| POC-NFR-007 | One opt-in smoke suite verifies the locally installed `hath0r` binary |
| POC-NFR-008 | Application build artifacts go to `dist/`; source remains in `src/` |
| POC-NFR-009 | Supported developer hosts match HATHOR v1: macOS and Linux |
| POC-NFR-010 | Accessibility baseline: keyboard operation, semantic landmarks, labeled status, and non-color-only state |

## 8. Proposed application surface

| Route | Purpose |
|-------|---------|
| `/` | Overview and capability status |
| `/products` | OpenSource suite product catalog |
| `/diagnostics` | Sanitized local diagnostic results and remediation |
| `/about` | Product, CLI, Framework, source, and status boundaries |

Initial API:

| Endpoint | CLI dependency |
|----------|----------------|
| `GET /api/health` | None |
| `GET /api/hathor/capabilities` | Optional probes |
| `GET /api/hathor/status` | Version, doctor, KB path |
| `GET /api/hathor/products` | `hath0r kb products` |

These routes are proposed and do not exist until the application scaffold is
implemented.

## 9. Non-goals

- Browser-based shell or terminal.
- Direct filesystem browsing.
- Direct access to control-tower files or KB records from React.
- Reimplementation of framework gates, policy, ticketing, orchestration, or
  knowledge ranking.
- Credentials UI or secret retrieval.
- Production deployment automation.
- Claims that design-stage Framework behavior is already available.

## 10. POC acceptance

The implementation ticket is complete only when:

1. the four proposed pages and four API routes meet POC-FR-001 through
   POC-FR-008;
2. supported success and failure paths are covered by unit, integration, and
   browser tests;
3. `npm run check` performs formatting, lint, typecheck, unit/integration
   tests, and build;
4. the real-CLI smoke suite passes in a correctly configured local suite;
5. no forbidden metadata root or secret is introduced;
6. accessibility checks have no critical violations; and
7. evidence is attached to the authorizing issue before promotion.

## 11. Risks and controls

| Risk | Control |
|------|---------|
| Human-formatted CLI output changes | Use exit status as authority; isolate parsers; prefer future versioned JSON |
| Browser becomes a second control plane | Read-only API and fixed command allowlist |
| Local path disclosure | Return logical states by default; restrict diagnostic details to local development |
| Fixtures look like live data | Persistent fixture banner and response `source` field |
| Framework design presented as shipped | Capability-state matrix and source-level verification |
| Subprocess hangs or floods output | Timeout, kill, byte cap, concurrency cap |

## 12. Open product decisions

The scaffold ticket must decide and record:

1. Node HTTP library;
2. package manager and lockfile;
3. browser/server development-process orchestration;
4. local-only binding and authentication expectations; and
5. whether product-catalog YAML is displayed raw or normalized in POC v1.

None of these choices may weaken the boundaries in this requirements document.
