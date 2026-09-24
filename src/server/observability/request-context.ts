/**
 * Per-request identity and audit metadata (POC-FR-008).
 */

import { randomUUID } from "node:crypto";
import type { Request } from "express";

export type ExitClass =
  "none" | "success" | "nonzero" | "spawn_error" | "timeout" | "truncated" | "error";

export interface RequestContext {
  requestId: string;
  startedAt: number;
  route: string;
  method: string;
}

/** Wire-visible audit block attached to API responses (additive field). */
export interface RequestAudit {
  requestId: string;
  route: string;
  /** Named hath0r operation key when a CLI probe ran; null for pure app routes. */
  commandKey: string | null;
  durationMs: number;
  exitClass: ExitClass;
  resultSizeBytes: number;
}

export function createRequestContext(
  req: Pick<Request, "method" | "path" | "originalUrl">,
): RequestContext {
  return {
    requestId: randomUUID(),
    startedAt: performance.now(),
    route: req.path || req.originalUrl || "",
    method: req.method,
  };
}

export function elapsedMs(ctx: RequestContext): number {
  return Math.max(0, Math.round(performance.now() - ctx.startedAt));
}

export function buildAudit(
  ctx: RequestContext,
  opts: {
    commandKey?: string | null;
    exitClass?: ExitClass;
    body: unknown;
  },
): RequestAudit {
  const serialized = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body ?? null);
  return {
    requestId: ctx.requestId,
    route: ctx.route,
    commandKey: opts.commandKey ?? null,
    durationMs: elapsedMs(ctx),
    exitClass: opts.exitClass ?? "none",
    resultSizeBytes: Buffer.byteLength(serialized, "utf8"),
  };
}

export function exitClassFromCode(exitCode: number | null | undefined): ExitClass {
  if (exitCode === null || exitCode === undefined) return "error";
  return exitCode === 0 ? "success" : "nonzero";
}
