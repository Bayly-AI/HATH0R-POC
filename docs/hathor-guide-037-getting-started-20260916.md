---
id: HATHOR-GUIDE-037
title: "Getting Started with the HATHOR React/TypeScript POC"
summary: "Orient the current POC repository and verify the implemented OpenSource HATHOR CLI before application scaffolding."
doc_type: GUIDE
diataxis: tutorial
audience: [developer, operator, agent]
tags: [getting-started, cli, react, typescript]
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
  - "../README.md"
  - "../AGENTS.md"
  - "../cfg/suite.yaml"
  - "../cfg/knowledge-tower.yaml"
  - "../../HATH0R-CLI/README.md"
---
# Getting Started with the HATHOR React/TypeScript POC

## 1. What works today

This repository currently contains product identity, governance, suite
pointers, a KB stub, and documentation. It does **not** yet contain a
React/TypeScript scaffold.

The sibling OpenSource CLI currently supports:

```text
hath0r --version
hath0r doctor
hath0r kb path
hath0r kb products
```

Do not infer additional executable commands from Framework design papers.

## 2. Prerequisites

Required now:

- macOS or Linux;
- Git;
- Python 3.10 or newer;
- the three sibling repositories under one OpenSource group directory; and
- local permission to install the CLI package.

Required when the application scaffold lands:

- a supported Node.js LTS release;
- the package manager and lockfile selected by that ticket; and
- a current browser supported by the frontend toolchain.

## 3. Expected sibling layout

```text
OpenSource/
├── AGENTS.md
├── WARP.md
├── .hath0r/
│   └── knowledgebase/        # canonical group KB
├── HATH0R-CLI/               # control tower + `hath0r` binary
├── hath0r/                   # Framework + canonical docs
└── hath0r-poc/               # this product
```

Member repositories keep only a KB pointer under their own
`.hath0r/knowledgebase/`.

## 4. Install the implemented CLI

From `hath0r-poc/`:

```sh
python3 -m pip install -e ../HATH0R-CLI
hath0r --version
```

Expected result: a `hath0r` version is printed. The current package version is
defined by the sibling CLI repository, not this guide.

If the binary is not found, see
[Troubleshooting](hathor-guide-041-troubleshooting-20260916.md#2-hath0r-command-not-found).

## 5. Verify suite orientation

Run:

```sh
hath0r doctor
```

The command checks:

- group root, `AGENTS.md`, and `WARP.md`;
- canonical group KB and suite product catalog;
- control-tower config files;
- Framework, CLI, and POC member roots; and
- member pointers to `HATH0R-CLI`.

A nonzero result is a failed diagnostic. Fix the named check before treating
the local suite as healthy.

## 6. Verify knowledge orientation

```sh
hath0r kb path
hath0r kb products
```

`kb path` prints the canonical group hub and fails if it is absent.
`kb products` prints the suite catalog in its current YAML/text form.

The POC must consume these through the server adapter when implemented. React
must never read the path or catalog file directly.

## 7. Optional portable group root

The CLI accepts:

| Variable | Purpose |
|----------|---------|
| `HATH0R_GROUP_ROOT` | Override the OpenSource group root |
| `HATH0R_KB_PATH` | Override the canonical KB path |

Set these in the developer shell or server process environment, not in
browser code and not in a committed `.env` file.

Example for a non-default clone layout:

```sh
export HATH0R_GROUP_ROOT="/path/to/OpenSource"
hath0r doctor
```

Do not print a full environment dump during diagnostics.

## 8. Read the product contract

Before scaffolding:

1. Read [Product requirements](hathor-req-001-integration-console-requirements-20260916.md).
2. Read [Architecture](hathor-arch-003-integration-console-architecture-20260916.md).
3. Review [CLI and framework integration](hathor-guide-038-cli-framework-integration-20260916.md).
4. Review [Security, governance, and delivery](hathor-guide-040-security-governance-delivery-20260916.md).

The POC is intentionally read-only at its HATHOR boundary.

## 9. Target application workflow

The following is the required script contract **after** a `package.json` is
added. These commands do not work in the current documentation-only checkout:

```sh
npm install
npm run dev
npm run check
npm run test:e2e
```

The scaffold ticket may choose a different package manager only if it updates
this guide, `README.md`, CI, and the lockfile together.

## 10. First implementation milestone

The first code milestone should:

1. create the React/Vite/TypeScript client;
2. create the TypeScript server adapter;
3. implement `/api/health`;
4. add a fake CLI runner for deterministic tests;
5. add the version probe; and
6. render explicit `implemented`, `planned`, and `unavailable` states.

Do not begin with knowledge writes, workflow execution, arbitrary command
input, or deployments.

## 11. Completion check

You are correctly oriented when:

- `hath0r --version` succeeds;
- `hath0r doctor` succeeds;
- `hath0r kb path` points at the group hub;
- `hath0r kb products` returns the expected suite catalog;
- the current branch is issue-backed and based on `development`; and
- no one expects frontend commands to work before the scaffold is merged.
