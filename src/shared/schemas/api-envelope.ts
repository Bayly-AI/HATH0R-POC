/**
 * Runtime validation for hathor-poc.response/1.
 * External payloads are `unknown` until parse succeeds (POC-NFR-001).
 */

import { z } from "zod";
import {
  POC_RESPONSE_SCHEMA,
  type ApiEnvelope,
  type ApiSource,
  type ApiState,
} from "../contracts/api-envelope.js";

export const apiStateSchema = z.enum(["ok", "degraded", "unavailable", "error"]);
export const apiSourceSchema = z.enum(["live-cli", "fixture", "application"]);

export const apiDiagnosticSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    remediation: z.string().min(1).optional(),
  })
  .passthrough();

/**
 * Envelope schema. Unknown additive keys are retained (forward compatible).
 * `data` stays untyped here; callers may refine with a data schema.
 */
export const apiEnvelopeSchema = z
  .object({
    schema: z.literal(POC_RESPONSE_SCHEMA),
    requestId: z.string().min(1),
    generatedAt: z.string().min(1),
    source: apiSourceSchema,
    state: apiStateSchema,
    data: z.unknown().nullable(),
    diagnostics: z.array(apiDiagnosticSchema),
  })
  .passthrough();

export type ParsedApiEnvelope = z.infer<typeof apiEnvelopeSchema>;

export class EnvelopeValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "EnvelopeValidationError";
    this.issues = issues;
  }
}

/** Treat input as unknown; return typed envelope or throw. */
export function parseApiEnvelope(input: unknown): ApiEnvelope<unknown> {
  const result = apiEnvelopeSchema.safeParse(input);
  if (!result.success) {
    throw new EnvelopeValidationError(
      `Invalid ${POC_RESPONSE_SCHEMA}: ${result.error.issues.map((i) => i.message).join("; ")}`,
      result.error.issues,
    );
  }
  const v = result.data;
  return {
    schema: v.schema,
    requestId: v.requestId,
    generatedAt: v.generatedAt,
    source: v.source as ApiSource,
    state: v.state as ApiState,
    data: v.data ?? null,
    diagnostics: v.diagnostics.map((d) => ({
      code: d.code,
      message: d.message,
      ...(d.remediation !== undefined ? { remediation: d.remediation } : {}),
    })),
  };
}

export function safeParseApiEnvelope(
  input: unknown,
):
  | { success: true; data: ApiEnvelope<unknown> }
  | { success: false; error: EnvelopeValidationError } {
  try {
    return { success: true, data: parseApiEnvelope(input) };
  } catch (err) {
    if (err instanceof EnvelopeValidationError) {
      return { success: false, error: err };
    }
    throw err;
  }
}

/**
 * Parse envelope and validate `data` with a caller-supplied Zod schema.
 */
export function parseApiEnvelopeWithData<T>(
  input: unknown,
  dataSchema: z.ZodType<T>,
): ApiEnvelope<T> {
  const envelope = parseApiEnvelope(input);
  if (envelope.data === null) {
    return { ...envelope, data: null };
  }
  const dataResult = dataSchema.safeParse(envelope.data);
  if (!dataResult.success) {
    throw new EnvelopeValidationError(
      `Invalid ${POC_RESPONSE_SCHEMA} data payload`,
      dataResult.error.issues,
    );
  }
  return { ...envelope, data: dataResult.data };
}
