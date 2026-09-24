---
id: HATHOR-GUIDE-041
title: "HATHOR React/TypeScript POC Troubleshooting"
summary: "Diagnostic steps for OpenSource CLI, control-tower pointers, knowledgebase, frontend scaffold, and framework capability failures."
doc_type: GUIDE
diataxis: how-to
audience: [developer, operator, agent]
tags: [troubleshooting, cli, knowledgebase, react, diagnostics]
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
  - "../../HATH0R-CLI/src/hath0r_cli/cli.py"
---
# HATHOR React/TypeScript POC Troubleshooting

## 1. Start here

Run the implemented probes in order:

```sh
hath0r --version
hath0r doctor
hath0r kb path
hath0r kb products
```

Stop at the first failure and use the matching section below. Do not try
design-stage Framework commands as a workaround.

## 2. `hath0r` command not found

### Cause

The sibling CLI is not installed in the active Python environment, or the
environment's scripts directory is not on `PATH`.

### Remediation

From the POC repository:

```sh
python3 -m pip install -e ../HATH0R-CLI
hath0r --version
```

If installation succeeds but lookup fails, inspect the active Python
environment and executable path without printing secrets.

## 3. `hath0r doctor` fails

### Meaning

At least one group, tower, member, or KB check failed. The table names the
failed check and path/detail.

### Remediation

1. Confirm the three sibling repositories exist.
2. Confirm the OpenSource group root contains `AGENTS.md` and `WARP.md`.
3. Confirm `HATH0R-CLI/cfg/` contains its four tower configs.
4. Confirm this repo's `cfg/suite.yaml` and `cfg/knowledge-tower.yaml` point
   at `HATH0R-CLI`.
5. Confirm the group KB catalog exists.
6. Re-run `hath0r doctor`.

Do not edit generated/runtime state merely to make the display green.

## 4. Wrong group root

### Symptom

Doctor reports missing group files or sibling repositories even though they
exist elsewhere.

### Remediation

Set the trusted local clone root for the process:

```sh
export HATH0R_GROUP_ROOT="/path/to/OpenSource"
hath0r doctor
```

Do not commit a user-specific absolute path to application code.

## 5. KB path missing

### Symptom

`hath0r kb path` prints a missing-knowledgebase error.

### Remediation

1. Confirm the group hub exists under the OpenSource root.
2. Confirm `HATH0R_KB_PATH` is unset or points at the intended group hub.
3. Confirm this repository's KB directory remains a pointer only.
4. Run `hath0r doctor`, then `hath0r kb path`.

Do not create a second full KB inside the POC.

## 6. Product catalog missing

### Symptom

`hath0r kb products` reports that the catalog is absent.

### Remediation

Confirm the canonical group KB contains:

```text
catalogs/suite-products.yaml
```

Repair the group hub through an authorized control-tower/KB change. Do not
copy a catalog into the POC as a fallback.

## 7. Wrong control-tower pointer

### Symptom

Doctor reports `member tower pointer:poc` mismatch.

### Expected values

Both `cfg/suite.yaml` and `cfg/knowledge-tower.yaml` must resolve the
control-tower path to the sibling `HATH0R-CLI` repository and the remote to
`Bayly-AI/HATH0R-CLI`.

Fix both files in one issue-backed change and re-run doctor.

## 8. Legacy hidden directory found

Only `.hath0r/` is valid Framework metadata. `.ai/`, `.aegis/`, and
`.infraOS/` are forbidden in this OpenSource product.

Do not preserve a compatibility writer. Inventory the content, decide whether
it is source, generated state, or obsolete data, and migrate/remove it under
an authorized issue without losing evidence.

## 9. `npm install` or `npm run dev` fails today

### Likely cause

The application has not been scaffolded. The current repository has no
`package.json`.

### Remediation

Do not create an ad hoc scaffold merely to satisfy a documentation example.
Use the application-scaffolding issue and implement the contract in:

- [Product requirements](hathor-req-001-integration-console-requirements-20260916.md);
- [Architecture](hathor-arch-003-integration-console-architecture-20260916.md); and
- [Development and testing](hathor-guide-039-development-testing-20260916.md).

## 10. Application cannot find the CLI after scaffolding

Check:

1. the server process, not the browser, is performing the probe;
2. `hath0r --version` works in the server's runtime environment;
3. the server's minimal environment includes the correct trusted `PATH`;
4. the configured executable is not accepted from an HTTP request; and
5. spawn errors map to `unavailable`, not an unhandled exception.

Add no shell fallback.

## 11. Doctor works in a terminal but fails in the app

Likely causes:

- server process has a different `PATH`;
- group-root or KB overrides differ;
- working directory is unexpected;
- output/timeout limits are too low; or
- the app sanitizes required environment keys.

Compare only the approved environment keys and command operation. Never log
the complete environment.

## 12. Product catalog parser breaks

The current CLI emits YAML/text, not a versioned JSON contract.

1. Preserve the bounded raw output for diagnosis.
2. Mark the operation invalid/degraded.
3. Update parser fixtures from verified CLI output.
4. Validate normalized output against the shared schema.
5. Do not convert a parse error into an empty catalog.

Prefer a future CLI structured-output contract over increasingly complex
screen scraping.

## 13. Framework command is unavailable

Canonical papers describe a larger future command surface than the current
OpenSource CLI implements.

If a command is absent from the CLI source and README:

- mark the capability `planned` or `unavailable`;
- do not invoke or emulate it;
- create an issue in the owning CLI/Framework repository if implementation is
  required; and
- update the POC only after the contract ships.

## 14. UI shows fixture data as live

This is a product defect.

Every fixture response must carry `source: fixture`, and the UI must display a
persistent fixture indicator. Disable the affected demonstration until the
source is unambiguous.

## 15. Timeout or output-limit failure

Confirm:

- the process is terminated;
- the request returns a bounded diagnostic;
- no partial output is parsed as success;
- audit metadata records the termination class; and
- retry does not create unbounded concurrent processes.

Raise limits only with evidence and review; do not disable them.

## 16. Promotion PR rejected

Check the branch pair:

```text
feature/chore/fix branch -> development
development -> testing
testing -> staging
staging -> master
```

Feature work must not target testing, staging, or master. Each stage must have
deployment and URL-validation evidence before the next promotion.

## 17. Escalation bundle

When opening an issue, include:

- repository and branch;
- affected operation key;
- CLI version;
- redacted exit/termination class;
- expected versus actual state;
- smallest reproduction;
- relevant request ID;
- test result; and
- whether data source was live or fixture.

Do not include tokens, credentials, full environment dumps, unredacted home
paths, or canonical KB contents.
