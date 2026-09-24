/**
 * Pure normalizer: RunnerResult → typed POC domain result.
 * Per HATHOR-GUIDE-043 §5–6 and HATHOR-TS-005 envelope adoption.
 */

import { z } from "zod";
import type { HathorOperation } from "./operations.js";
import { HathorSpawnError, type RunnerResult } from "./runner.js";
import { redactText, redactValue } from "./redact.js";

export type PocState = "ok" | "degraded" | "unavailable" | "error";

export type NormalizeSource = "cli-json" | "cli-text" | "runner";

export interface NormalizedDiagnostic {
  code?: string;
  message: string;
  severity?: string;
  remediation?: string;
}

export interface NormalizedResult {
  operation: HathorOperation;
  state: PocState;
  data: unknown;
  diagnostics: NormalizedDiagnostic[];
  source: NormalizeSource;
  meta: {
    exitCode: number | null;
    durationMs: number;
    timedOut: boolean;
    truncated: boolean;
    signal: NodeJS.Signals | null;
    cliVersion?: string;
  };
}

const CLI_SCHEMA_ID = "hath0r.cli.response/1";

const CliDiagnosticSchema = z
  .object({
    code: z.string().optional(),
    message: z.string(),
    severity: z.string().optional(),
    remediation: z.string().optional(),
  })
  .passthrough();

const CliResponseSchema = z.object({
  schema: z.literal(CLI_SCHEMA_ID),
  command: z.string().min(1),
  generated_at: z.string().min(1),
  state: z.enum(["ok", "degraded", "unavailable", "error"]),
  data: z.union([z.record(z.unknown()), z.null()]),
  diagnostics: z.array(CliDiagnosticSchema),
  meta: z
    .object({
      cli_version: z.string().min(1),
      duration_ms: z.number().int().nonnegative(),
    })
    .passthrough(),
});

export type CliResponse = z.infer<typeof CliResponseSchema>;

function baseMeta(result: RunnerResult): NormalizedResult["meta"] {
  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    timedOut: result.timedOut,
    truncated: result.truncated,
    signal: result.signal,
  };
}

function diag(message: string, code?: string, remediation?: string): NormalizedDiagnostic {
  return {
    code,
    message: redactText(message),
    ...(remediation ? { remediation: redactText(remediation) } : {}),
  };
}

function mapDiagnostics(list: CliResponse["diagnostics"]): NormalizedDiagnostic[] {
  return list.map((d) =>
    redactValue({
      code: d.code,
      message: d.message,
      severity: d.severity,
      remediation: d.remediation,
    }),
  );
}

/**
 * Try to parse and validate hath0r.cli.response/1 from stdout.
 * Returns null when stdout is not JSON envelope-shaped.
 * Throws a structured failure object when JSON is claimed/parseable but invalid.
 */
export function tryParseCliResponse(
  stdout: string,
):
  | { ok: true; value: CliResponse }
  | { ok: false; reason: "not-json" }
  | { ok: false; reason: "invalid-envelope"; detail: string } {
  const trimmed = stdout.trim();
  if (!trimmed.startsWith("{")) {
    return { ok: false, reason: "not-json" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, reason: "not-json" };
  }
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    "schema" in parsed &&
    (parsed as { schema?: unknown }).schema !== undefined &&
    (parsed as { schema?: unknown }).schema !== CLI_SCHEMA_ID
  ) {
    return {
      ok: false,
      reason: "invalid-envelope",
      detail: `Unsupported response schema: ${String((parsed as { schema: unknown }).schema)}`,
    };
  }
  const result = CliResponseSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      reason: "invalid-envelope",
      detail: result.error.issues.map((i) => i.message).join("; ") || "envelope validation failed",
    };
  }
  return { ok: true, value: result.data };
}

function fromCliJson(
  operation: HathorOperation,
  result: RunnerResult,
  envelope: CliResponse,
): NormalizedResult {
  // Prefer envelope state; doctor nonzero still degraded even if envelope says ok (defensive).
  let state: PocState = envelope.state;
  if (
    operation === "doctor" &&
    result.exitCode !== 0 &&
    result.exitCode !== null &&
    state === "ok"
  ) {
    state = "degraded";
  }
  if (
    (operation === "kb.path" || operation === "kb.products") &&
    result.exitCode !== 0 &&
    result.exitCode !== null &&
    state === "ok"
  ) {
    state = "unavailable";
  }

  return {
    operation,
    state,
    data: redactValue(envelope.data),
    diagnostics: mapDiagnostics(envelope.diagnostics),
    source: "cli-json",
    meta: {
      ...baseMeta(result),
      cliVersion: envelope.meta.cli_version,
    },
  };
}

const VERSION_RE = /(?:version[:\s]+|v)?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/i;

function normalizeVersionText(operation: HathorOperation, result: RunnerResult): NormalizedResult {
  const text = redactText(result.stdout || result.stderr || "");
  if (result.exitCode !== 0) {
    return {
      operation,
      state: "error",
      data: null,
      diagnostics: [diag(text || "version command failed", "VERSION_FAILED")],
      source: "cli-text",
      meta: baseMeta(result),
    };
  }
  if (!text.trim()) {
    return {
      operation,
      state: "error",
      data: null,
      diagnostics: [diag("Empty version output", "MALFORMED_OUTPUT")],
      source: "cli-text",
      meta: baseMeta(result),
    };
  }
  const match = text.match(VERSION_RE);
  const version = match?.[1] ?? text.trim().slice(0, 64);
  return {
    operation,
    state: "ok",
    data: {
      binary: "hath0r",
      package: "hath0r-cli",
      version,
      raw: text.trim().slice(0, 256),
    },
    diagnostics: [],
    source: "cli-text",
    meta: { ...baseMeta(result), cliVersion: version },
  };
}

function normalizeDoctorText(operation: HathorOperation, result: RunnerResult): NormalizedResult {
  const message = redactText((result.stdout || result.stderr || "").trim() || "doctor completed");
  if (result.exitCode === 0) {
    return {
      operation,
      state: "ok",
      data: { summary: message.slice(0, 512) },
      diagnostics: [],
      source: "cli-text",
      meta: baseMeta(result),
    };
  }
  return {
    operation,
    state: "degraded",
    data: { summary: message.slice(0, 512) },
    diagnostics: [
      diag(
        message.slice(0, 512) || "doctor reported failures",
        "DOCTOR_FAILED",
        "Run hath0r doctor and fix failing checks.",
      ),
    ],
    source: "cli-text",
    meta: baseMeta(result),
  };
}

function normalizeKbPathText(operation: HathorOperation, result: RunnerResult): NormalizedResult {
  const text = redactText((result.stdout || "").trim());
  if (result.exitCode === 0) {
    return {
      operation,
      state: "ok",
      data: {
        configured: true,
        available: true,
        // Absolute path kept only in redacted form for text mode.
        path: text ? redactText(text) : null,
      },
      diagnostics: [],
      source: "cli-text",
      meta: baseMeta(result),
    };
  }
  return {
    operation,
    state: "unavailable",
    data: {
      configured: true,
      available: false,
      path: null,
    },
    diagnostics: [
      diag(
        redactText(result.stderr || result.stdout || "Knowledgebase path unavailable"),
        "KNOWLEDGEBASE_NOT_FOUND",
        "Verify the group root and run hath0r doctor.",
      ),
    ],
    source: "cli-text",
    meta: baseMeta(result),
  };
}

function normalizeProductsText(operation: HathorOperation, result: RunnerResult): NormalizedResult {
  const text = (result.stdout || "").trim();
  if (result.exitCode !== 0) {
    return {
      operation,
      state: "unavailable",
      data: null,
      diagnostics: [
        diag(
          redactText(result.stderr || text || "Product catalog unavailable"),
          "PRODUCT_CATALOG_NOT_FOUND",
          "Verify the knowledgebase path and run hath0r doctor.",
        ),
      ],
      source: "cli-text",
      meta: baseMeta(result),
    };
  }
  if (!text) {
    return {
      operation,
      state: "error",
      data: null,
      diagnostics: [diag("Empty products output", "MALFORMED_OUTPUT")],
      source: "cli-text",
      meta: baseMeta(result),
    };
  }
  // v0.1: bounded text payload; never invent an empty product list on ambiguity.
  return {
    operation,
    state: "ok",
    data: {
      mediaType: "text/plain",
      text: redactText(text, 8_192),
    },
    diagnostics: [],
    source: "cli-text",
    meta: baseMeta(result),
  };
}

function normalizeText(operation: HathorOperation, result: RunnerResult): NormalizedResult {
  switch (operation) {
    case "version":
      return normalizeVersionText(operation, result);
    case "doctor":
      return normalizeDoctorText(operation, result);
    case "kb.path":
      return normalizeKbPathText(operation, result);
    case "kb.products":
      return normalizeProductsText(operation, result);
    default: {
      const _exhaustive: never = operation;
      return _exhaustive;
    }
  }
}

/**
 * Normalize a successful spawn RunnerResult (including nonzero exits).
 */
export function normalizeRunnerResult(
  operation: HathorOperation,
  result: RunnerResult,
): NormalizedResult {
  if (result.timedOut) {
    return {
      operation,
      state: "error",
      data: null,
      diagnostics: [
        diag(
          "hath0r operation timed out; process was terminated",
          "TIMEOUT",
          "Retry or increase timeout only in controlled environments.",
        ),
      ],
      source: "runner",
      meta: baseMeta(result),
    };
  }

  if (result.truncated) {
    return {
      operation,
      state: "error",
      data: null,
      diagnostics: [
        diag("hath0r output exceeded the byte cap; output was not parsed", "OUTPUT_TRUNCATED"),
      ],
      source: "runner",
      meta: baseMeta(result),
    };
  }

  const parsed = tryParseCliResponse(result.stdout);
  if (parsed.ok) {
    return fromCliJson(operation, result, parsed.value);
  }
  if (parsed.reason === "invalid-envelope") {
    return {
      operation,
      state: "error",
      data: null,
      diagnostics: [
        diag(parsed.detail, "MALFORMED_OUTPUT", "Update CLI or fixtures to hath0r.cli.response/1."),
      ],
      source: "runner",
      meta: baseMeta(result),
    };
  }

  // Text / non-envelope path (compatibility window).
  return normalizeText(operation, result);
}

/**
 * Map spawn / missing-binary failures (GUIDE-043 §6).
 */
export function normalizeSpawnFailure(
  operation: HathorOperation,
  err: unknown,
  durationMs = 0,
): NormalizedResult {
  const message =
    err instanceof HathorSpawnError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
  return {
    operation,
    state: "unavailable",
    data: null,
    diagnostics: [
      diag(
        message || "hath0r executable unavailable",
        "CLI_UNAVAILABLE",
        "Install HATH0R-CLI and ensure `hath0r` is on PATH.",
      ),
    ],
    source: "runner",
    meta: {
      exitCode: null,
      durationMs,
      timedOut: false,
      truncated: false,
      signal: null,
    },
  };
}
