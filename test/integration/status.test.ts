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
    durationMs: 4,
    ...extra,
  };
}

describe("GET /api/hathor/status", () => {
  it("all-ok composite status", async () => {
    const runOperation: OperationRunner = async (op) => {
      if (op === "version") return result(fixture("version-ok.json"));
      if (op === "doctor") return result(fixture("doctor-ok.json"));
      if (op === "kb.path") return result(fixture("kb-path-ok.json"));
      throw new Error(String(op));
    };

    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/status").expect(200);
    expect(res.headers["x-request-id"]).toBeTruthy();

    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.schema).toBe(POC_RESPONSE_SCHEMA);
    expect(envelope.source).toBe("live-cli");
    expect(envelope.state).toBe("ok");
    expect(envelope.requestId).toBe(res.headers["x-request-id"]);

    const data = envelope.data as {
      overall: string;
      probes: {
        version: { state: string; meta: { durationMs: number } };
        doctor: { state: string };
        "kb.path": { state: string };
      };
    };
    expect(data.overall).toBe("ok");
    expect(data.probes.version.state).toBe("ok");
    expect(data.probes.doctor.state).toBe("ok");
    expect(data.probes["kb.path"].state).toBe("ok");

    const audit = (res.body as { audit?: Record<string, unknown> }).audit;
    expect(audit).toMatchObject({
      commandKey: "status",
      exitClass: "success",
      requestId: envelope.requestId,
    });
    expect(typeof audit?.durationMs).toBe("number");
    expect(Number(audit?.resultSizeBytes)).toBeGreaterThan(0);
  });

  it("doctor-failed yields degraded overall while other probes remain", async () => {
    const runOperation: OperationRunner = async (op) => {
      if (op === "version") return result(fixture("version-ok.json"));
      if (op === "doctor") return result(fixture("doctor-degraded.json"), 6);
      if (op === "kb.path") return result(fixture("kb-path-ok.json"));
      throw new Error(String(op));
    };
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/status").expect(200);
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.state).toBe("degraded");
    const data = envelope.data as {
      probes: { doctor: { state: string }; version: { state: string } };
    };
    expect(data.probes.doctor.state).toBe("degraded");
    expect(data.probes.version.state).toBe("ok");
    expect((res.body as { audit: { exitClass: string } }).audit.exitClass).toBe("nonzero");
  });

  it("CLI-missing maps all probes to unavailable", async () => {
    const runOperation: OperationRunner = async () => {
      throw new HathorSpawnError("hath0r executable not found");
    };
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/status").expect(200);
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.state).toBe("unavailable");
    expect(envelope.diagnostics.length).toBeGreaterThan(0);
    expect((res.body as { audit: { exitClass: string } }).audit.exitClass).toBe("spawn_error");
  });

  it("timeout on a probe yields error overall", async () => {
    const runOperation: OperationRunner = async (op) => {
      if (op === "doctor") {
        return {
          exitCode: null,
          stdout: "",
          stderr: "",
          signal: "SIGKILL" as const,
          timedOut: true,
          truncated: false,
          durationMs: 10_000,
        };
      }
      if (op === "version") return result(fixture("version-ok.json"));
      return result(fixture("kb-path-ok.json"));
    };
    const app = createApp({ runOperation });
    const res = await request(app).get("/api/hathor/status").expect(200);
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.state).toBe("error");
    const data = envelope.data as {
      probes: { doctor: { state: string; meta: { timedOut: boolean } } };
    };
    expect(data.probes.doctor.state).toBe("error");
    expect(data.probes.doctor.meta.timedOut).toBe(true);
    expect((res.body as { audit: { exitClass: string } }).audit.exitClass).toBe("timeout");
  });
});
