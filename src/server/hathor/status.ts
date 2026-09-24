/**
 * Composite status probes: version, doctor, kb.path (POC-FR-001 / P6).
 * Each probe runs independently; one failure does not block others.
 */

import type { ApiDiagnostic, ApiState } from "../../shared/contracts/api-envelope.js";
import {
  normalizeRunnerResult,
  normalizeSpawnFailure,
  type NormalizedDiagnostic,
  type NormalizedResult,
  type PocState,
} from "./normalize.js";
import type { HathorOperation } from "./operations.js";
import {
  HathorSpawnError,
  runHathorOperation,
  type RunnerOptions,
  type RunnerResult,
} from "./runner.js";

export const STATUS_OPERATIONS = ["version", "doctor", "kb.path"] as const;
export type StatusOperation = (typeof STATUS_OPERATIONS)[number];

export type OperationRunner = (
  operation: HathorOperation,
  options?: RunnerOptions,
) => Promise<RunnerResult>;

export interface ProbeReport {
  operation: StatusOperation;
  state: PocState;
  data: unknown;
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

export interface StatusData {
  probes: Record<StatusOperation, ProbeReport>;
  overall: ApiState;
}

export interface CollectStatusOptions {
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

function toProbeReport(result: NormalizedResult): ProbeReport {
  const operation = result.operation as StatusOperation;
  return {
    operation,
    state: result.state,
    data: result.data,
    diagnostics: toApiDiagnostics(result.diagnostics),
    meta: {
      durationMs: result.meta.durationMs,
      exitCode: result.meta.exitCode,
      timedOut: result.meta.timedOut,
      truncated: result.meta.truncated,
      source: result.source,
      ...(result.meta.cliVersion ? { cliVersion: result.meta.cliVersion } : {}),
    },
  };
}

/** Worst-wins aggregate for composite overview. */
export function aggregateOverallState(states: readonly PocState[]): ApiState {
  if (states.includes("error")) return "error";
  if (states.includes("unavailable")) return "unavailable";
  if (states.includes("degraded")) return "degraded";
  return "ok";
}

async function runOneProbe(
  operation: StatusOperation,
  runOperation: OperationRunner,
  runnerOptions?: RunnerOptions,
): Promise<ProbeReport> {
  try {
    const raw = await runOperation(operation, runnerOptions);
    return toProbeReport(normalizeRunnerResult(operation, raw));
  } catch (err) {
    return toProbeReport(normalizeSpawnFailure(operation, err));
  }
}

/**
 * Run version, doctor, and kb.path in parallel and build StatusData.
 */
export async function collectStatus(options: CollectStatusOptions = {}): Promise<StatusData> {
  const runOperation = options.runOperation ?? runHathorOperation;
  const reports = await Promise.all(
    STATUS_OPERATIONS.map((op) => runOneProbe(op, runOperation, options.runnerOptions)),
  );

  const probes = {
    version: reports[0]!,
    doctor: reports[1]!,
    "kb.path": reports[2]!,
  } satisfies Record<StatusOperation, ProbeReport>;

  return {
    probes,
    overall: aggregateOverallState(STATUS_OPERATIONS.map((op) => probes[op].state)),
  };
}

/** Map composite status to a coarse audit exit class. */
export function statusExitClass(
  data: StatusData,
): "success" | "nonzero" | "spawn_error" | "timeout" | "error" {
  const metas = STATUS_OPERATIONS.map((op) => data.probes[op].meta);
  if (metas.some((m) => m.timedOut)) return "timeout";
  if (metas.some((m) => m.truncated)) return "error";
  if (data.overall === "unavailable") {
    // Prefer spawn_error when all probes look like missing CLI.
    const allUnavailable = STATUS_OPERATIONS.every((op) => data.probes[op].state === "unavailable");
    return allUnavailable ? "spawn_error" : "nonzero";
  }
  if (data.overall === "error") return "error";
  if (data.overall === "ok") return "success";
  return "nonzero";
}

export function flattenStatusDiagnostics(data: StatusData): ApiDiagnostic[] {
  const out: ApiDiagnostic[] = [];
  for (const op of STATUS_OPERATIONS) {
    for (const d of data.probes[op].diagnostics) {
      out.push({
        ...d,
        code: d.code.startsWith(`${op}:`) ? d.code : `${op}:${d.code}`,
      });
    }
  }
  return out;
}

export { HathorSpawnError };
