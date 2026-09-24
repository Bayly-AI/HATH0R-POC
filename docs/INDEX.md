---
id: HATHOR-CANON-013
title: "HATHOR React/TypeScript POC Documentation Index"
summary: "Reading order and source-of-truth map for the HATHOR Integration Console POC."
doc_type: CANON
diataxis: reference
audience: [developer, operator, architect, agent]
tags: [poc, react, typescript, index]
version: 0.1.0
status: draft
created: 2026-09-16
updated: 2026-09-16
owner: "Raymond Bayly (BaylyAI)"
review:
  trust: unverified
  reviewed_by: null
  reviewed_at: null
  interval: 365d
  next_review: null
stale: false
supersedes: []
superseded_by: null
amended_by: []
parent: null
sources: [HATHOR-CANON-001]
---
# HATHOR React/TypeScript POC Documentation

Product-local documentation for the planned React/TypeScript **HATHOR
Integration Console**.

## Status legend

Every page distinguishes these states:

| State | Meaning |
|-------|---------|
| **Implemented** | Verified in the current POC, CLI source, or checked-in configuration |
| **Proposed** | Product decision for the React/TypeScript scaffold; implementation is still required |
| **Framework design** | Described by the canonical HATHOR corpus but not necessarily shipped in the current OpenSource CLI |
| **Out of scope** | Deliberately excluded from this POC |

Examples and target scripts must not be read as evidence that code exists.
The repository root and `package.json`, when added, are the authority for
available application commands.

## Reading order

1. [Product requirements](hathor-req-001-integration-console-requirements-20260916.md) — what the POC must prove.
2. [Getting started](hathor-guide-037-getting-started-20260916.md) — what works now and how to orient.
3. [Architecture](hathor-arch-003-integration-console-architecture-20260916.md) — component and trust boundaries.
4. [CLI and framework integration](hathor-guide-038-cli-framework-integration-20260916.md) — the
   implemented command surface and adapter contract.
5. [Development and testing](hathor-guide-039-development-testing-20260916.md) — target scaffold,
   scripts, tests, and quality gates.
6. [Security, governance, and delivery](hathor-guide-040-security-governance-delivery-20260916.md) —
   safe execution and promotion rules.
7. [Troubleshooting](hathor-guide-041-troubleshooting-20260916.md) — failure diagnosis.
8. [Completion & archive report](hathor-report-001-poc-completion-archive-20260918.md) — Phase 3 delivery record.

## Documents

| ID | Mode | Status | Document |
|----|------|--------|----------|
| HATHOR-CANON-013 | reference | draft | This index |
| HATHOR-REQ-001 | reference | draft | [Product requirements](hathor-req-001-integration-console-requirements-20260916.md) |
| HATHOR-GUIDE-037 | tutorial | draft | [Getting started](hathor-guide-037-getting-started-20260916.md) |
| HATHOR-ARCH-003 | explanation | draft | [Architecture](hathor-arch-003-integration-console-architecture-20260916.md) |
| HATHOR-GUIDE-038 | reference | draft | [CLI and framework integration](hathor-guide-038-cli-framework-integration-20260916.md) |
| HATHOR-GUIDE-039 | how-to | draft | [Development and testing](hathor-guide-039-development-testing-20260916.md) |
| HATHOR-GUIDE-040 | how-to | draft | [Security, governance, and delivery](hathor-guide-040-security-governance-delivery-20260916.md) |
| HATHOR-GUIDE-041 | how-to | draft | [Troubleshooting](hathor-guide-041-troubleshooting-20260916.md) |
| HATHOR-REPORT-001 | reference | complete | [Completion & archive report](hathor-report-001-poc-completion-archive-20260918.md) |

## Source-of-truth boundaries

| Concern | Authority |
|---------|-----------|
| POC product behavior and target design | This `docs/` tree, then implemented POC code |
| OpenSource group policy | `../../AGENTS.md` and `../../WARP.md` |
| POC rules and suite pointers | `../AGENTS.md`, `../cfg/suite.yaml`, `../cfg/knowledge-tower.yaml` |
| Implemented CLI commands | `../../HATH0R-CLI/src/hath0r_cli/cli.py` |
| CLI installation and operator usage | `../../HATH0R-CLI/README.md` |
| HATHOR architectural and governance design | `../../hath0r/docs/` |
| Canonical local knowledge | OpenSource group `.hath0r/knowledgebase` hub |

When this product documentation conflicts with OpenSource group policy, group
policy wins. When a framework design paper conflicts with implemented CLI
source, the source determines what can be executed today and the paper remains
design intent.

## Documentation maintenance

- Follow `hathor-doc@1` from HATHOR-CANON-001.
- Keep IDs stable and unique across the OpenSource documentation namespace.
- Bump `version` and `updated` for content changes.
- Leave `review.trust: unverified` until a named human reviews a page
  end-to-end.
- Update this index when adding or retiring authored pages.
- Keep `index.json` and `llms.txt` derived from document front matter.

## Scope note

The canonical HATHOR corpus remains in the Framework repository. These pages
apply that corpus to one product and do not redefine framework-wide gates,
registries, contracts, or principles.
