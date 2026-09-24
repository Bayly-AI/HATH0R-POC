---
id: HATHOR-GUIDE-039
title: "React/TypeScript POC Development and Testing Guide"
summary: "Proposed application baseline, source layout, scripts, tests, and definition of done for the HATHOR POC."
doc_type: GUIDE
diataxis: how-to
audience: [developer, agent]
tags: [react, typescript, development, testing, quality]
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
  - HATHOR-RP-007
  - HATHOR-ADR-004
  - HATHOR-GUIDE-030
  - HATHOR-REQ-001
  - HATHOR-ARCH-003
---
# React/TypeScript POC Development and Testing Guide

## 1. Current-state warning

The following is the target development contract. No Node project exists in
the repository yet. The scaffold ticket must create and pin the actual
`package.json`, lockfile, runtime versions, scripts, and CI.

## 2. Proposed baseline

| Concern | Proposed choice |
|---------|-----------------|
| UI | React with functional components |
| Language | TypeScript in strict mode |
| Client build | Vite |
| Server | Node.js TypeScript adapter; HTTP library selected by scaffold ADR/ticket |
| Wire validation | Runtime schema validation shared by client and server |
| Unit/component tests | Vitest + React Testing Library |
| Browser tests | Playwright |
| Static quality | ESLint, formatting check, TypeScript compiler |
| Package source | One lockfile committed; exact tools pinned by scaffold |

Prefer current supported releases at scaffold time. The lockfile and
`package.json` are authoritative; this guide intentionally avoids speculative
version numbers.

## 3. Target layout

```text
src/
├── app/
│   ├── components/
│   ├── features/
│   │   ├── status/
│   │   ├── products/
│   │   └── diagnostics/
│   ├── routes/
│   ├── services/
│   └── main.tsx
├── server/
│   ├── api/
│   ├── hathor/
│   │   ├── operations.ts
│   │   ├── runner.ts
│   │   ├── normalize.ts
│   │   └── redact.ts
│   ├── observability/
│   └── main.ts
└── shared/
    ├── contracts/
    └── schemas/

test/
├── unit/
├── integration/
├── e2e/
└── fixtures/
    └── hathor-cli/
```

Rules:

- UI features do not import `node:*` modules.
- Only `src/server/hathor/runner.ts` spawns the CLI.
- Shared code remains runtime-neutral.
- External data is `unknown` until schema-validated.
- Tests mirror the owned behavior, not implementation internals.

## 4. Target scripts

The scaffold should provide:

| Script | Contract |
|--------|----------|
| `npm run dev` | Start client and local-only server |
| `npm run build` | Typecheck and build client/server into `dist/` |
| `npm run typecheck` | TypeScript checks without output |
| `npm run lint` | Blocking lint |
| `npm run format:check` | Verify formatting without rewriting |
| `npm test` | Unit and component tests |
| `npm run test:integration` | API/adapter tests with fake CLI |
| `npm run test:smoke` | Opt-in tests against installed `hath0r` |
| `npm run test:e2e` | Browser acceptance tests |
| `npm run check` | Local/CI aggregate quality gate |

`test:smoke` must not be part of the hermetic default test run unless CI
provides a controlled OpenSource suite fixture.

## 5. Development sequence

For every change:

1. confirm an authorizing GitHub issue;
2. branch from `development` using the required issue-numbered name;
3. identify whether the change affects client, adapter, shared contract, or
   docs;
4. add the smallest failing test;
5. implement without widening the CLI allowlist implicitly;
6. run the narrow test, then `npm run check`;
7. run e2e tests for user-visible behavior;
8. run real-CLI smoke only when local orientation is healthy;
9. update capability status and docs; and
10. attach evidence to the issue/PR.

## 6. Client development rules

- Render state from validated API envelopes.
- Provide loading, empty, degraded, unavailable, and error states.
- Never infer healthy from HTTP `200` alone.
- Use semantic HTML and keyboard-accessible controls.
- Do not expose raw local paths in normal views.
- Display source and timestamp for diagnostic data.
- Keep fixture mode visibly labeled across every route.
- Do not place secrets or server configuration behind `VITE_*`; those values
  are compiled into the browser bundle.

## 7. Server development rules

- Bind loopback by default.
- Do not accept executable, argv, flags, path, environment, or working
  directory from the browser.
- Spawn without a shell.
- Terminate on timeout and output limit.
- Cap concurrent probes.
- Use a minimal child environment.
- Redact before logs and responses.
- Keep raw CLI formatting out of shared domain models.
- Return versioned schemas and explicit capability state.

## 8. Test strategy

### 8.1 Unit

Test pure behavior:

- CLI result normalization;
- version parsing;
- state aggregation;
- redaction;
- output bounding;
- capability-state derivation;
- schema success/failure; and
- UI status rendering.

### 8.2 Component

Test:

- accessible labels and landmarks;
- keyboard navigation;
- loading/degraded/unavailable views;
- remediation actions;
- fixture banners; and
- product-catalog rendering with invalid/empty data.

### 8.3 Integration

Run the API with an injected fake CLI runner. Cover:

- all four allowlisted operations;
- missing binary;
- nonzero doctor;
- KB absence;
- malformed catalog;
- timeout and process cancellation;
- output cap;
- concurrent request cap;
- request ID/audit metadata; and
- command-injection attempts.

Tests must prove that request input cannot alter the operation map.

### 8.4 End-to-end

Run the built application with controlled fixtures and verify:

1. overview reports live/fixture source correctly;
2. products render from the API;
3. diagnostics provide remediation;
4. navigation works without a healthy CLI;
5. no critical accessibility failures; and
6. no secret or raw environment data appears in rendered content.

### 8.5 Real-CLI smoke

The opt-in smoke suite verifies:

```text
hath0r --version
hath0r doctor
hath0r kb path
hath0r kb products
```

It may read local orientation but must not mutate the CLI repo, Framework,
POC, KB, Git state, or external systems.

## 9. Quality gate

`npm run check` should fail on:

- formatting or lint errors;
- TypeScript errors;
- unit/component/integration failures;
- invalid wire schemas;
- build failure;
- forbidden client imports of Node APIs;
- an allowlist operation without tests and docs; or
- a secret-scanning finding.

Browser and real-CLI smoke evidence may run as separate jobs where runtime
setup requires it.

## 10. Definition of done

A code change is done when:

- requirements and threat boundaries remain satisfied;
- tests cover success and negative paths;
- `npm run check` and relevant e2e tests pass;
- CLI integration changes include fixture and real-smoke consideration;
- user-visible states remain accessible;
- docs and capability status match implementation;
- no generated build output is treated as source; and
- the issue/PR records validation evidence.

Passing tests do not authorize environment promotion. Promotion remains a
separate human-governed action.
