/**
 * Runtime validation for hathor-poc.capabilities/1.
 */

import { z } from "zod";
import {
  POC_CAPABILITIES_SCHEMA,
  type CapabilityDocument,
  type CapabilityState,
} from "../contracts/capability.js";

export const capabilityStateSchema = z.enum([
  "implemented",
  "planned",
  "unavailable",
  "out-of-scope",
]);

export const capabilityEntrySchema = z
  .object({
    id: z.string().min(1),
    state: capabilityStateSchema,
    summary: z.string().min(1),
    evidence: z.string().min(1),
  })
  .passthrough();

export const capabilityDocumentSchema = z
  .object({
    schema: z.literal(POC_CAPABILITIES_SCHEMA),
    generatedAt: z.string().min(1),
    capabilities: z.array(capabilityEntrySchema).min(1),
  })
  .passthrough();

export class CapabilityValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "CapabilityValidationError";
    this.issues = issues;
  }
}

export function parseCapabilityDocument(input: unknown): CapabilityDocument {
  const result = capabilityDocumentSchema.safeParse(input);
  if (!result.success) {
    throw new CapabilityValidationError(
      `Invalid ${POC_CAPABILITIES_SCHEMA}: ${result.error.issues.map((i) => i.message).join("; ")}`,
      result.error.issues,
    );
  }
  const v = result.data;
  return {
    schema: v.schema,
    generatedAt: v.generatedAt,
    capabilities: v.capabilities.map((c) => ({
      id: c.id,
      state: c.state as CapabilityState,
      summary: c.summary,
      evidence: c.evidence,
    })),
  };
}

export function safeParseCapabilityDocument(
  input: unknown,
):
  | { success: true; data: CapabilityDocument }
  | { success: false; error: CapabilityValidationError } {
  try {
    return { success: true, data: parseCapabilityDocument(input) };
  } catch (err) {
    if (err instanceof CapabilityValidationError) {
      return { success: false, error: err };
    }
    throw err;
  }
}
