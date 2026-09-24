/**
 * HTTP routes for health, capabilities, status, and products (P5–P7).
 */

import { Router, type Request, type Response } from "express";
import {
  buildCapabilityDocument,
  defaultAdapterSupport,
  makeEnvelope,
  type AdapterSupport,
  type CapabilityDocument,
} from "../../shared/contracts/index.js";
import { resolveHathorExecutable, HathorSpawnError } from "../hathor/runner.js";
import { collectProducts, productsExitClass, type ProductsResult } from "../hathor/products.js";
import {
  collectStatus,
  flattenStatusDiagnostics,
  statusExitClass,
  type OperationRunner,
  type StatusData,
} from "../hathor/status.js";
import type { RunnerOptions } from "../hathor/runner.js";
import {
  buildAudit,
  createRequestContext,
  type RequestAudit,
  type RequestContext,
} from "../observability/request-context.js";

export interface ApiDeps {
  /** Override adapter support flags (tests). */
  adapterSupport?: AdapterSupport;
  /** Probe whether the hath0r binary is resolvable. */
  probeCliPresent?: () => boolean;
  /** Injected CLI runner for status/products probes (tests). */
  runOperation?: OperationRunner;
  /** Default runner options (timeout, env, spawnImpl, …). */
  runnerOptions?: RunnerOptions;
}

type Locals = {
  requestContext?: RequestContext;
};

function ctxOf(res: Response): RequestContext {
  const locals = res.locals as Locals;
  if (!locals.requestContext) {
    locals.requestContext = createRequestContext({ method: "GET", path: "", originalUrl: "" });
  }
  return locals.requestContext;
}

function sendEnvelope<T>(
  res: Response,
  envelope: ReturnType<typeof makeEnvelope<T>>,
  auditExtras: { commandKey?: string | null; exitClass?: RequestAudit["exitClass"] } = {},
): void {
  const ctx = ctxOf(res);
  const requestId = envelope.requestId || ctx.requestId;
  const base = { ...envelope, requestId };
  const body = {
    ...base,
    audit: buildAudit(ctx, {
      body: base,
      commandKey: auditExtras.commandKey ?? null,
      exitClass: auditExtras.exitClass ?? "none",
    }),
  };
  res.setHeader("X-Request-Id", requestId);
  res.status(200).json(body);
}

export function defaultProbeCliPresent(): boolean {
  try {
    resolveHathorExecutable();
    return true;
  } catch (err) {
    if (err instanceof HathorSpawnError) return false;
    return false;
  }
}

export function createApiRouter(deps: ApiDeps = {}): Router {
  const router = Router();
  const probeCli = deps.probeCliPresent ?? defaultProbeCliPresent;
  const supportBase = deps.adapterSupport ?? defaultAdapterSupport();

  router.use((req, res, next) => {
    const ctx = createRequestContext(req);
    (res.locals as Locals).requestContext = ctx;
    res.setHeader("X-Request-Id", ctx.requestId);
    next();
  });

  /**
   * GET /api/health — application liveness; no CLI dependency.
   */
  router.get("/health", (_req: Request, res: Response) => {
    const ctx = ctxOf(res);
    const envelope = makeEnvelope<{ status: "ok"; service: string }>({
      requestId: ctx.requestId,
      source: "application",
      state: "ok",
      data: { status: "ok", service: "hathor-poc-adapter" },
      diagnostics: [],
    });
    sendEnvelope(res, envelope, { commandKey: null, exitClass: "none" });
  });

  /**
   * GET /api/hathor/capabilities — adapter capability document.
   */
  router.get("/hathor/capabilities", (_req: Request, res: Response) => {
    const ctx = ctxOf(res);
    const cliPresent = probeCli();
    const generatedAt = new Date().toISOString();
    const document: CapabilityDocument = buildCapabilityDocument(supportBase, generatedAt);

    const diagnostics = cliPresent
      ? []
      : [
          {
            code: "CLI_UNAVAILABLE",
            message: "hath0r executable was not found on PATH.",
            remediation: "Install HATH0R-CLI and ensure `hath0r` is on PATH.",
          },
        ];

    const state = cliPresent ? "ok" : "degraded";

    const envelope = makeEnvelope<CapabilityDocument & { cliPresent: boolean }>({
      requestId: ctx.requestId,
      source: "application",
      state,
      data: { ...document, cliPresent },
      diagnostics,
    });

    sendEnvelope(res, envelope, {
      commandKey: "capabilities",
      exitClass: cliPresent ? "success" : "spawn_error",
    });
  });

  /**
   * GET /api/hathor/status — composite version + doctor + kb.path probes.
   * HTTP 200 even when CLI is degraded/unavailable (envelope state carries truth).
   */
  router.get("/hathor/status", async (_req: Request, res: Response) => {
    const ctx = ctxOf(res);
    try {
      const status: StatusData = await collectStatus({
        runOperation: deps.runOperation,
        runnerOptions: deps.runnerOptions,
      });

      const envelope = makeEnvelope<StatusData>({
        requestId: ctx.requestId,
        source: "live-cli",
        state: status.overall,
        data: status,
        diagnostics: flattenStatusDiagnostics(status),
      });

      sendEnvelope(res, envelope, {
        commandKey: "status",
        exitClass: statusExitClass(status),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const envelope = makeEnvelope<null>({
        requestId: ctx.requestId,
        source: "application",
        state: "error",
        data: null,
        diagnostics: [
          {
            code: "STATUS_INTERNAL_ERROR",
            message: message || "Failed to collect status",
          },
        ],
      });
      sendEnvelope(res, envelope, { commandKey: "status", exitClass: "error" });
    }
  });

  /**
   * GET /api/hathor/products — suite catalog via kb.products only (never direct file I/O).
   */
  router.get("/hathor/products", async (_req: Request, res: Response) => {
    const ctx = ctxOf(res);
    try {
      const products: ProductsResult = await collectProducts({
        runOperation: deps.runOperation,
        runnerOptions: deps.runnerOptions,
      });

      const envelope = makeEnvelope<ProductsResult["data"]>({
        requestId: ctx.requestId,
        source: "live-cli",
        state: products.state,
        data: products.data,
        diagnostics: products.diagnostics,
      });

      // Include probe meta as additive audit-adjacent field for clients.
      const bodyExtras = {
        ...envelope,
        probeMeta: products.meta,
      };

      const requestId = bodyExtras.requestId || ctx.requestId;
      const withAudit = {
        ...bodyExtras,
        requestId,
        audit: buildAudit(ctx, {
          body: bodyExtras,
          commandKey: "kb.products",
          exitClass: productsExitClass(products),
        }),
      };
      res.setHeader("X-Request-Id", requestId);
      res.status(200).json(withAudit);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const envelope = makeEnvelope<null>({
        requestId: ctx.requestId,
        source: "application",
        state: "error",
        data: null,
        diagnostics: [
          {
            code: "PRODUCTS_INTERNAL_ERROR",
            message: message || "Failed to collect products",
          },
        ],
      });
      sendEnvelope(res, envelope, { commandKey: "kb.products", exitClass: "error" });
    }
  });

  return router;
}
