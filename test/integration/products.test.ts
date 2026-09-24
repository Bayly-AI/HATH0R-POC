import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/main";
import { HathorSpawnError, type RunnerResult } from "../../src/server/hathor/runner";
import type { OperationRunner } from "../../src/server/hathor/status";
import { parseApiEnvelope } from "../../src/shared/schemas";
import { POC_RESPONSE_SCHEMA } from "../../src/shared/contracts";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/cli");

function fixture(name: string): string {
  return readFileSync(path.join(fixtureDir, name), "utf8");
}

function result(stdout: string, exitCode = 0, extra: Partial<RunnerResult> = {}): RunnerResult {
  return {
    exitCode,
    stdout,
    stderr: "",
    signal: null,
    timedOut: false,
    truncated: false,
    durationMs: 5,
    ...extra,
  };
}

describe("GET /api/hathor/products", () => {
  it("successful catalog returns structured products", async () => {
    const runOperation: OperationRunner = async (op) => {
      expect(op).toBe("kb.products");
      return result(fixture("kb-products-ok.json"));
    };
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/products").expect(200);
    expect(res.headers["x-request-id"]).toBeTruthy();

    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.schema).toBe(POC_RESPONSE_SCHEMA);
    expect(envelope.source).toBe("live-cli");
    expect(envelope.state).toBe("ok");

    const data = envelope.data as {
      mediaType: string;
      products: Array<{ product_id: string }>;
      group_id: string;
    };
    expect(data.mediaType).toBe("application/json");
    expect(data.products.length).toBe(3);
    expect(data.group_id).toBe("hath0r-opensource");

    const audit = (res.body as { audit?: Record<string, unknown> }).audit;
    expect(audit).toMatchObject({
      commandKey: "kb.products",
      exitClass: "success",
      requestId: envelope.requestId,
    });
  });

  it("missing catalog → unavailable with remediation", async () => {
    const runOperation: OperationRunner = async () =>
      result(fixture("kb-products-missing.json"), 3);
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/products").expect(200);
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.state).toBe("unavailable");
    expect(envelope.data).toBeNull();
    expect(envelope.diagnostics.length).toBeGreaterThan(0);
    expect(envelope.diagnostics[0]?.message.length).toBeGreaterThan(0);
  });

  it("malformed catalog → error, not empty list", async () => {
    const runOperation: OperationRunner = async () =>
      result(fixture("kb-products-invalid.json"), 2);
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/products").expect(200);
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.state).toBe("error");
    expect(envelope.data).toBeNull();
    expect(Array.isArray(envelope.data)).toBe(false);
  });

  it("timeout → error", async () => {
    const runOperation: OperationRunner = async () => ({
      exitCode: null,
      stdout: "",
      stderr: "",
      signal: "SIGKILL",
      timedOut: true,
      truncated: false,
      durationMs: 10_000,
    });
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/products").expect(200);
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.state).toBe("error");
    expect((res.body as { audit: { exitClass: string } }).audit.exitClass).toBe("timeout");
  });

  it("spawn failure → unavailable", async () => {
    const runOperation: OperationRunner = async () => {
      throw new HathorSpawnError("hath0r not found");
    };
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/products").expect(200);
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.state).toBe("unavailable");
    expect((res.body as { audit: { exitClass: string } }).audit.exitClass).toBe("spawn_error");
  });
});
