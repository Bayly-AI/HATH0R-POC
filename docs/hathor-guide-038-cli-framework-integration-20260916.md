---
id: HATHOR-GUIDE-038
title: "OpenSource CLI and HATHOR Framework Integration"
summary: "Implemented HATHOR CLI commands, product boundaries, and the safe adapter contract for the React/TypeScript POC."
doc_type: GUIDE
diataxis: reference
audience: [developer, operator, architect, agent]
tags: [cli, framework, integration, knowledgebase]
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
  - HATHOR-ADR-003
  - HATHOR-RP-010
  - HATHOR-RP-012
  - HATHOR-TS-004
  - "../../HATH0R-CLI/README.md"
  - "../../HATH0R-CLI/src/hath0r_cli/cli.py"
  - "../cfg/suite.yaml"
  - "../cfg/knowledge-tower.yaml"
---
# OpenSource CLI and HATHOR Framework Integration

## 1. Three products, three responsibilities

| Product | Responsibility | POC relationship |
|---------|----------------|------------------|
| HATH0R-CLI | OpenSource control tower and implemented `hath0r` operator CLI | Runtime integration boundary |
| HATHOR Framework | Canonical architecture, requirements, principles, and evolving contracts | Design authority |
| HATHOR POC | React/TypeScript integration test bed | Consumer and evidence producer |

The POC must not move control-tower authority into its server or copy
Framework design into an independent implementation.

## 2. Implemented CLI surface

Verified against the sibling CLI source:

| Command | Success data | Failure |
|---------|--------------|---------|
| `hath0r --version` | Version text | Process/binary error |
| `hath0r doctor` | Rich diagnostic table and pass summary | Exit `1` when one or more checks fail |
| `hath0r kb path` | Canonical KB path | Nonzero when the directory is absent |
| `hath0r kb products` | Suite catalog YAML/text | Nonzero when catalog is absent |

The current CLI does not advertise JSON output for these commands. The POC
must not pretend the human-oriented doctor table is a stable machine schema.

## 3. CLI configuration

| Environment variable | CLI default behavior |
|----------------------|----------------------|
| `HATH0R_GROUP_ROOT` | Uses the configured/default OpenSource group root |
| `HATH0R_KB_PATH` | Uses the group root's `.hath0r/knowledgebase` unless overridden |

The server may inherit explicitly approved values. It must not accept these
paths from an HTTP request or expose their raw values to ordinary UI responses.

## 4. Adapter operations

The initial server allowlist contains exactly:

```text
version     -> ["hath0r", "--version"]
doctor      -> ["hath0r", "doctor"]
kb.path     -> ["hath0r", "kb", "path"]
kb.products -> ["hath0r", "kb", "products"]
```

Implementation requirements:

1. Resolve the executable from server configuration or a trusted `PATH`.
2. Spawn directly with an argv array; never use a shell.
3. Supply only a minimal environment.
4. Set a deadline and maximum stdout/stderr bytes.
5. Capture exit status and termination reason separately.
6. Redact output before logging or returning it.
7. Map results to the versioned POC envelope.
8. Emit request ID, operation key, duration, exit class, and byte counts.

## 5. Normalization rules

### Version

- Treat exit `0` plus non-empty bounded text as available.
- Store the normalized version separately from raw diagnostic output.
- Do not compare versions lexically.

### Doctor

- Use the process exit code as the health verdict.
- Raw formatted text is optional local diagnostic detail.
- Do not infer individual check states by scraping table decoration unless the
  CLI later publishes a versioned structured format.

### KB path

- Use exit status to determine availability.
- The server may compare the returned canonical path to trusted server config.
- Normal UI should return `configured` and `available`, not the full host path.

### Products

- Preserve the current media type as bounded YAML/text.
- If normalized into JSON, use a schema-validating parser and test fixtures
  from the CLI output.
- Parsing failure is an invalid-output state, not an empty product list.

## 6. Response mapping

| CLI result | API state | HTTP guidance |
|------------|-----------|---------------|
| Required probe succeeds | `ok` | `200` |
| Optional probe fails | `degraded` | `200` with diagnostic |
| CLI not installed | `unavailable` | `503` for direct operation; overview may remain `200` |
| CLI exits nonzero | `degraded` or `error` by operation | `200` overview or `502` direct dependency call |
| Timeout/output cap | `error` | `504`/`502` |
| Invalid server request | `error` | `400` |

HTTP status represents transport/API outcome. The envelope state represents
HATHOR capability state; clients must evaluate both.

## 7. Knowledgebase rules

The POC must:

- use `hath0r kb path` for orientation;
- use `hath0r kb products` for the catalog;
- keep the repository KB directory as a pointer only;
- avoid copying the canonical KB into product state; and
- avoid knowledge writes until a versioned OpenSource CLI write contract is
  implemented and separately authorized.

Framework design describes richer tiered retrieval, provenance, TTL, and
draft-to-verified workflows. Those remain design inputs, not available POC
commands.

## 8. Framework capability adoption

A Framework capability can enter the application only when all are true:

1. the OpenSource CLI implements and documents the command;
2. input, output, error, and exit contracts are versioned;
3. the POC adapter adds a named allowlisted operation;
4. success and negative integration fixtures exist;
5. security review confirms no new authority leaks into the browser; and
6. capability status changes from `planned` to `implemented` in docs and API.

Never invoke a command solely because a design paper includes it.

## 9. Graceful degradation

The adapter reports the narrowest truthful result:

- missing CLI → `unavailable`;
- broken suite configuration → `degraded`;
- unavailable KB → KB/product capability unavailable;
- unsupported future command → `unavailable`, not `404` data;
- fixture result → `source: fixture`.

The UI may continue rendering documentation and remediation. It may not
replace missing live data with unlabeled fixtures, cached copies of
authoritative records, or model-generated guesses.

## 10. Test doubles

Most tests should inject a `HathorRunner` interface with deterministic
fixtures:

```ts
interface HathorRunner {
  run(
    operation: "version" | "doctor" | "kb.path" | "kb.products",
    signal: AbortSignal,
  ): Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
    termination: "exit" | "timeout" | "output-limit" | "spawn-error";
  }>;
}
```

Required fixtures:

- each operation succeeds;
- binary missing;
- doctor fails;
- KB missing;
- timeout;
- stdout/stderr over limit;
- malformed catalog;
- redaction candidate; and
- fixture-source labeling.

An opt-in smoke test may use the installed real CLI. Unit/integration tests
must not require the user's group KB or mutate it.

## 11. Contract evolution

When the CLI adds structured output:

1. pin the requested schema/version;
2. keep the old adapter parser until compatibility policy permits removal;
3. add golden success and error envelopes;
4. update the capability document and this guide; and
5. treat unknown required schema versions as unavailable, never best-effort.

The POC should become simpler as the CLI gains machine-readable contracts,
not accrete a second CLI implementation.
