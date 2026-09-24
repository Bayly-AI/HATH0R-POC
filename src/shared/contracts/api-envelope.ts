/** Shared POC API envelope (hathor-poc.response/1). Per HATHOR-ARCH-003 §6. */

export const POC_RESPONSE_SCHEMA = "hathor-poc.response/1" as const;

export type ApiState = "ok" | "degraded" | "unavailable" | "error";

export type ApiSource = "live-cli" | "fixture" | "application";

export interface ApiDiagnostic {
  code: string;
  message: string;
  remediation?: string;
}

export interface ApiEnvelope<T> {
  schema: typeof POC_RESPONSE_SCHEMA;
  requestId: string;
  generatedAt: string;
  source: ApiSource;
  state: ApiState;
  data: T | null;
  diagnostics: ApiDiagnostic[];
}

export function makeEnvelope<T>(
  partial: Omit<ApiEnvelope<T>, "schema" | "generatedAt"> & { generatedAt?: string },
): ApiEnvelope<T> {
  return {
    schema: POC_RESPONSE_SCHEMA,
    generatedAt: partial.generatedAt ?? new Date().toISOString(),
    requestId: partial.requestId,
    source: partial.source,
    state: partial.state,
    data: partial.data,
    diagnostics: partial.diagnostics,
  };
}
