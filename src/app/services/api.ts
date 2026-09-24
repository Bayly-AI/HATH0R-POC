/**
 * Browser client for POC adapter APIs (relative /api paths).
 */

import type { ApiEnvelope, ApiState, ApiSource } from "../../shared/contracts/api-envelope.js";
import type { CapabilityDocument } from "../../shared/contracts/capability.js";
import { parseApiEnvelope } from "../../shared/schemas/api-envelope.js";

export type { ApiEnvelope, ApiState, ApiSource };

export interface StatusProbeView {
  operation: string;
  state: ApiState;
  data: unknown;
  diagnostics: Array<{ code: string; message: string; remediation?: string }>;
  meta: {
    durationMs: number;
    exitCode: number | null;
    timedOut: boolean;
    truncated: boolean;
    source: string;
    cliVersion?: string;
  };
}

export interface StatusPayload {
  overall: ApiState;
  probes: {
    version: StatusProbeView;
    doctor: StatusProbeView;
    "kb.path": StatusProbeView;
  };
}

export type CapabilitiesPayload = CapabilityDocument & { cliPresent?: boolean };

async function getJson(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${path}`);
  }
  return (await res.json()) as unknown;
}

export async function fetchStatus(signal?: AbortSignal): Promise<ApiEnvelope<StatusPayload>> {
  const raw = await getJson("/api/hathor/status", { signal });
  const envelope = parseApiEnvelope(raw);
  return envelope as ApiEnvelope<StatusPayload>;
}

export async function fetchCapabilities(
  signal?: AbortSignal,
): Promise<ApiEnvelope<CapabilitiesPayload>> {
  const raw = await getJson("/api/hathor/capabilities", { signal });
  const envelope = parseApiEnvelope(raw);
  return envelope as ApiEnvelope<CapabilitiesPayload>;
}

export async function fetchHealth(
  signal?: AbortSignal,
): Promise<ApiEnvelope<{ status: string; service?: string }>> {
  const raw = await getJson("/api/health", { signal });
  const envelope = parseApiEnvelope(raw);
  return envelope as ApiEnvelope<{ status: string; service?: string }>;
}

export interface ProductRow {
  product_id: string;
  product_name?: string;
  role?: string;
  canonical?: boolean;
  is_control_tower?: boolean;
  [key: string]: unknown;
}

export type ProductsPayload =
  | {
      mediaType: "application/json";
      group_id?: string;
      control_tower_product_id?: string;
      products: ProductRow[];
    }
  | {
      mediaType: "text/plain";
      text: string;
    };

export async function fetchProducts(
  signal?: AbortSignal,
): Promise<ApiEnvelope<ProductsPayload | null>> {
  const raw = await getJson("/api/hathor/products", { signal });
  const envelope = parseApiEnvelope(raw);
  return envelope as ApiEnvelope<ProductsPayload | null>;
}
