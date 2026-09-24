import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/main";
import type { RunnerResult } from "../../src/server/hathor/runner";
import type { OperationRunner } from "../../src/server/hathor/status";
import { parseApiEnvelope } from "../../src/shared/schemas";

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
    durationMs: 2,
    ...extra,
  };
}

describe("API matrix — concurrency and redaction", () => {
  it("handles concurrent status requests without cross-talk", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const runOperation: OperationRunner = async (op) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 15));
      inFlight -= 1;
      if (op === "version") return result(fixture("version-ok.json"));
      if (op === "doctor") return result(fixture("doctor-ok.json"));
      if (op === "kb.path") return result(fixture("kb-path-ok.json"));
      throw new Error(String(op));
    };

    const app = createApp({ runOperation });
    const responses = await Promise.all([
      request(app).get("/api/hathor/status"),
      request(app).get("/api/hathor/status"),
      request(app).get("/api/hathor/status"),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(200);
      const env = parseApiEnvelope(res.body as unknown);
      expect(env.state).toBe("ok");
      expect(res.headers["x-request-id"]).toBeTruthy();
    }
    const ids = new Set(responses.map((r) => r.headers["x-request-id"]));
    expect(ids.size).toBe(3);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it("redacts absolute home paths in kb.path status data", async () => {
    const kb = JSON.parse(fixture("kb-path-ok.json")) as {
      data: { path: string; configured: boolean; available: boolean };
    };
    kb.data.path = "/Users/secret-user/.hath0r/knowledgebase";

    const runOperation: OperationRunner = async (op) => {
      if (op === "version") return result(fixture("version-ok.json"));
      if (op === "doctor") return result(fixture("doctor-ok.json"));
      if (op === "kb.path") return result(JSON.stringify(kb));
      throw new Error(String(op));
    };

    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/status").expect(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("secret-user");
    expect(body).toContain("[REDACTED_PATH]");
  });

  it("products truncated output maps to error not empty list", async () => {
    const runOperation: OperationRunner = async () =>
      result(fixture("kb-products-ok.json"), 0, { truncated: true });
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/products").expect(200);
    const env = parseApiEnvelope(res.body as unknown);
    expect(env.state).toBe("error");
    expect(env.data).toBeNull();
  });

  it("health remains ok while status is unavailable", async () => {
    const runOperation: OperationRunner = async () => {
      throw new Error("CLI missing");
    };
    const app = createApp({ runOperation, probeCliPresent: () => false });
    const health = await request(app).get("/api/health").expect(200);
    expect(health.body.state).toBe("ok");
    const status = await request(app).get("/api/hathor/status").expect(200);
    expect(status.body.state).toBe("unavailable");
  });
});
