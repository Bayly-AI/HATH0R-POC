---
id: HATHOR-GUIDE-040
title: "POC Security, Governance, and Delivery Guide"
summary: "Secure CLI mediation, secret handling, issue-backed delivery, and environment promotion for the HATHOR React/TypeScript POC."
doc_type: GUIDE
diataxis: how-to
audience: [developer, operator, agent]
tags: [security, governance, delivery, secrets, promotion]
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
  - HATHOR-RP-013
  - HATHOR-ADR-004
  - HATHOR-GUIDE-032
  - HATHOR-GUIDE-033
  - "../AGENTS.md"
  - "../../WARP.md"
---
# POC Security, Governance, and Delivery Guide

## 1. Security posture

The POC is local-first and read-only at the HATHOR boundary. Its controls are
designed for cooperative-but-fallible users and agents. A fully adversarial
local process with the developer's filesystem privileges is outside the
preventive guarantee of this POC.

Do not market local process isolation as a security sandbox.

## 2. Non-negotiable boundaries

1. React cannot invoke processes or read the filesystem.
2. HTTP input cannot select a command, executable, argument, path,
   environment variable, or working directory.
3. The adapter invokes only named read-only operations.
4. The adapter never uses a shell.
5. HATHOR failures remain failures or degraded states.
6. The POC does not issue waivers, credentials, writes, or promotions.
7. Framework metadata lives only under `.hath0r/`.

Legacy hidden roots (`.ai/`, `.aegis/`, and `.infraOS/`) are forbidden. If
found, remove or migrate them under an authorized change; do not add
compatibility writes.

## 3. Subprocess controls

The CLI runner must:

- use an immutable operation-to-argv map;
- resolve a trusted executable;
- spawn directly without shell evaluation;
- set a short deadline;
- cap stdout and stderr independently;
- terminate the process tree on deadline/limit;
- cap concurrent processes;
- set an explicit working directory;
- pass only required environment keys; and
- record operation, duration, termination class, and byte counts.

Never log a full argv if a future command can carry sensitive values. Use the
operation key as the audit label.

## 4. Secrets and configuration

Credentials live outside the repository under the group credential policy:

```text
/Users/raybayly/Development/.credentials/<service>/.env
```

Rules:

- never commit or print credential contents;
- never expose server-only values with a frontend build prefix;
- never return environment dumps from diagnostics;
- never put real tokens in fixtures or snapshots;
- never copy secrets into `.hath0r/` knowledge;
- redact provider-token patterns and high-entropy candidates; and
- fail closed when a future operation requires credentials without a
  mediated contract.

The current read-only POC commands do not require product-managed secrets.

## 5. Data minimization

Default browser responses should expose:

- logical control-tower identity;
- CLI version;
- status and capability flags;
- sanitized remediation; and
- bounded product-catalog content.

Avoid exposing:

- home-directory paths;
- credential paths;
- complete process environment;
- arbitrary CLI stderr;
- raw stack traces;
- KB record contents; and
- GitHub or provider credentials.

Detailed local diagnostics may be developer-only but still require redaction.

## 6. Browser/API controls

For local development:

- bind the server to loopback;
- restrict allowed origins to the known development client;
- use explicit methods and content types;
- validate all input and output schemas;
- set response security headers;
- disable caching for sensitive diagnostics; and
- avoid rendering raw YAML/text as HTML.

Any non-loopback or shared deployment requires a separate issue covering
authentication, authorization, TLS, CORS/CSRF, rate limits, session handling,
and secrets.

## 7. Dependency and supply-chain controls

The scaffold must:

- commit exactly one lockfile;
- use supported package releases;
- keep install scripts and new native dependencies under review;
- scan dependencies and the built browser bundle;
- generate a software bill of materials when delivery automation is added;
- avoid runtime CDN script dependencies; and
- treat lockfile changes as reviewable source changes.

Do not auto-upgrade across breaking versions without an issue and validation.

## 8. Work authorization

Every substantive change follows:

1. create or select a GitHub issue;
2. branch from `development`;
3. use
   `feature|bugfix|enhancement|research|fix|chore/<issue-number>-short-slug`;
4. implement and validate locally;
5. open the feature PR against `development`; and
6. obtain the required owner/code-owner approval before merge.

Canonical branches are not work branches and must not be force-pushed or
deleted.

## 9. Environment promotion

Required order:

```text
local → development → testing → staging → master (Production)
```

Rules:

- feature work targets `development` only;
- promotion to `testing` comes only from `development`;
- promotion to `staging` comes only from `testing`;
- promotion to `master` comes only from `staging`;
- each stage requires deployment and URL validation before the next; and
- humans authorize promotion.

The React UI may display promotion status in a future read-only capability.
It may not initiate promotion without a separately implemented, governed CLI
contract and authorization model.

## 10. Evidence

Attach the following to the issue/PR as applicable:

- `npm run check` result;
- unit/integration/e2e summaries;
- real-CLI smoke result;
- accessibility result;
- dependency/secret scan result;
- build artifact digest;
- stage URL/health validation; and
- known degraded states with owner and remediation.

Evidence must be attributable and reproducible. Chat assertions and unlabeled
screenshots do not replace command/test records.

## 11. Refusal behavior

When a control fails:

1. stop the affected operation;
2. return a structured, secret-free diagnostic;
3. name a remediation;
4. leave unrelated read-only UI usable when safe;
5. do not silently retry mutating or authority-bearing behavior; and
6. do not add an undocumented bypass.

Examples:

| Failure | Correct response |
|---------|------------------|
| Unrecognized operation | Reject request; do not construct argv |
| CLI missing | Mark unavailable; show installation remediation |
| Doctor fails | Mark suite degraded; preserve exit evidence |
| Output cap reached | Terminate; return bounded error |
| Catalog parse fails | Report invalid output; do not return empty catalog |
| Secret scanner fires | Block change and rotate exposed material if real |

## 12. Security review triggers

Require explicit review before:

- adding any mutating CLI operation;
- accepting path/argument input;
- exposing raw KB records;
- binding beyond loopback;
- adding authentication or sessions;
- storing server state;
- handling credentials;
- deploying to a shared environment; or
- relaxing timeout, output, origin, or redaction controls.
