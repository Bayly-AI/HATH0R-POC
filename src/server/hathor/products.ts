/**
 * Suite product catalog via kb.products only (POC-FR-002 / P7).
 * Never opens catalog files directly — always through the CLI runner.
 */

import type { ApiDiagnostic, ApiState } from "../../shared/contracts/api-envelope.js";
import {
  normalizeRunnerResult,
  normalizeSpawnFailure,
  type NormalizedDiagnostic,
  type NormalizedResult,
} from "./normalize.js";
import { runHathorOperation, type RunnerOptions, type RunnerResult } from "./runner.js";
import type { OperationRunner } from "./status.js";

export interface ProductEntry {
  product_id: string;
  product_name?: string;
  role?: string;
  canonical?: boolean;
  is_control_tower?: boolean;
  [key: string]: unknown;
}

export interface ProductsStructuredData {
  mediaType: "application/json";
  group_id?: string;
  control_tower_product_id?: string;
  products: ProductEntry[];
}

export interface ProductsTextData {
  mediaType: "text/plain";
  text: string;
}

export type ProductsPayload = ProductsStructuredData | ProductsTextData;

export interface ProductsResult {
  state: ApiState;
  data: ProductsPayload | null;
  diagnostics: ApiDiagnostic[];
  meta: {
    durationMs: number;
    exitCode: number | null;
    timedOut: boolean;
    truncated: boolean;
    source: NormalizedResult["source"];
    cliVersion?: string;
  };
}

export interface CollectProductsOptions {
  runOperation?: OperationRunner;
  runnerOptions?: RunnerOptions;
}

function toApiDiagnostics(list: NormalizedDiagnostic[]): ApiDiagnostic[] {
  return list.map((d) => ({
    code: d.code ?? "DIAGNOSTIC",
    message: d.message,
    ...(d.remediation ? { remediation: d.remediation } : {}),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Extract structured products from normalized CLI JSON data.
 * Returns null when the payload is not a valid products object (caller maps to error).
 * Never invents an empty products list on ambiguity.
 */
export function extractStructuredProducts(data: unknown): ProductsStructuredData | null {
  if (!isRecord(data)) return null;
  if (!Array.isArray(data.products)) return null;

  const products: ProductEntry[] = [];
  for (const item of data.products) {
    if (!isRecord(item)) return null;
    const id = item.product_id;
    if (typeof id !== "string" || id.length === 0) return null;
    products.push({
      ...item,
      product_id: id,
      ...(typeof item.product_name === "string" ? { product_name: item.product_name } : {}),
      ...(typeof item.role === "string" ? { role: item.role } : {}),
      ...(typeof item.canonical === "boolean" ? { canonical: item.canonical } : {}),
      ...(typeof item.is_control_tower === "boolean"
        ? { is_control_tower: item.is_control_tower }
        : {}),
    });
  }

  return {
    mediaType: "application/json",
    ...(typeof data.group_id === "string" ? { group_id: data.group_id } : {}),
    ...(typeof data.control_tower_product_id === "string"
      ? { control_tower_product_id: data.control_tower_product_id }
      : {}),
    products,
  };
}

function fromNormalized(result: NormalizedResult): ProductsResult {
  const baseMeta = {
    durationMs: result.meta.durationMs,
    exitCode: result.meta.exitCode,
    timedOut: result.meta.timedOut,
    truncated: result.meta.truncated,
    source: result.source,
    ...(result.meta.cliVersion ? { cliVersion: result.meta.cliVersion } : {}),
  };

  const diagnostics = toApiDiagnostics(result.diagnostics);

  // Non-ok states: pass through; never coerce to empty product list.
  if (result.state !== "ok") {
    return {
      state: result.state,
      data: null,
      diagnostics,
      meta: baseMeta,
    };
  }

  // JSON structured path
  if (result.source === "cli-json") {
    const structured = extractStructuredProducts(result.data);
    if (!structured) {
      return {
        state: "error",
        data: null,
        diagnostics: [
          ...diagnostics,
          {
            code: "PRODUCTS_MALFORMED",
            message: "CLI JSON products payload failed shape validation.",
            remediation: "Update CLI fixtures/schemas or repair suite-products catalog.",
          },
        ],
        meta: baseMeta,
      };
    }
    return {
      state: "ok",
      data: structured,
      diagnostics,
      meta: baseMeta,
    };
  }

  // Text compatibility path from normalizer (mediaType text/plain).
  if (isRecord(result.data) && typeof result.data.text === "string") {
    const text = result.data.text;
    if (!text.trim()) {
      return {
        state: "error",
        data: null,
        diagnostics: [
          ...diagnostics,
          {
            code: "PRODUCTS_EMPTY",
            message: "Products text payload was empty.",
          },
        ],
        meta: baseMeta,
      };
    }
    return {
      state: "ok",
      data: {
        mediaType: "text/plain",
        text,
      },
      diagnostics,
      meta: baseMeta,
    };
  }

  return {
    state: "error",
    data: null,
    diagnostics: [
      ...diagnostics,
      {
        code: "PRODUCTS_MALFORMED",
        message: "Unrecognized products payload shape.",
      },
    ],
    meta: baseMeta,
  };
}

export async function collectProducts(
  options: CollectProductsOptions = {},
): Promise<ProductsResult> {
  const runOperation = options.runOperation ?? runHathorOperation;
  try {
    const raw: RunnerResult = await runOperation("kb.products", options.runnerOptions);
    return fromNormalized(normalizeRunnerResult("kb.products", raw));
  } catch (err) {
    return fromNormalized(normalizeSpawnFailure("kb.products", err));
  }
}

export function productsExitClass(
  result: ProductsResult,
): "success" | "nonzero" | "spawn_error" | "timeout" | "error" {
  if (result.meta.timedOut) return "timeout";
  if (result.meta.truncated) return "error";
  if (result.state === "ok") return "success";
  if (result.state === "unavailable") {
    const spawnish = result.diagnostics.some((d) => d.code === "CLI_UNAVAILABLE");
    return spawnish ? "spawn_error" : "nonzero";
  }
  if (result.state === "error") return "error";
  return "nonzero";
}
