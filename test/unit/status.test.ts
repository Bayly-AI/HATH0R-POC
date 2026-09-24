import { describe, expect, it } from "vitest";
import { HathorSpawnError, type RunnerResult } from "../../src/server/hathor/runner";
import {
  aggregateOverallState,
  collectStatus,
  statusExitClass,
  type OperationRunner,
} from "../../src/server/hathor/status";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/cli");

function fixture(name: string): string {
  return readFileSync(path.join(fixtureDir, name), "utf8");
}

function okResult(stdout: string, exitCode = 0): RunnerResult {
  return {
    exitCode,
    stdout,
    stderr: "",
    signal: null,
    timedOut: false,
    truncated: false,
    durationMs: 3,
  };
}

describe("aggregateOverallState", () => {
  it("uses worst-wins ordering", () => {
    expect(aggregateOverallState(["ok", "ok", "ok"])).toBe("ok");
    expect(aggregateOverallState(["ok", "degraded", "ok"])).toBe("degraded");
    expect(aggregateOverallState(["ok", "unavailable", "degraded"])).toBe("unavailable");
    expect(aggregateOverallState(["error", "ok", "ok"])).toBe("error");
  });
});

describe("collectStatus", () => {
  it("runs three probes independently and returns overall ok", async () => {
    const calls: string[] = [];
    const runOperation: OperationRunner = async (op) => {
      calls.push(op);
      if (op === "version") return okResult(fixture("version-ok.json"));
      if (op === "doctor") return okResult(fixture("doctor-ok.json"));
      if (op === "kb.path") return okResult(fixture("kb-path-ok.json"));
      throw new Error(`unexpected ${op}`);
    };

    const status = await collectStatus({ runOperation });
    expect(calls.sort()).toEqual(["doctor", "kb.path", "version"].sort());
    expect(status.overall).toBe("ok");
    expect(status.probes.version.state).toBe("ok");
    expect(status.probes.doctor.state).toBe("ok");
    expect(status.probes["kb.path"].state).toBe("ok");
    expect(status.probes.version.meta.cliVersion).toBe("0.2.0");
  });

  it("keeps other probes when doctor is degraded", async () => {
    const runOperation: OperationRunner = async (op) => {
      if (op === "version") return okResult(fixture("version-ok.json"));
      if (op === "doctor") return okResult(fixture("doctor-degraded.json"), 6);
      if (op === "kb.path") return okResult(fixture("kb-path-ok.json"));
      throw new Error(`unexpected ${op}`);
    };
    const status = await collectStatus({ runOperation });
    expect(status.overall).toBe("degraded");
    expect(status.probes.doctor.state).toBe("degraded");
    expect(status.probes.version.state).toBe("ok");
    expect(statusExitClass(status)).toBe("nonzero");
  });

  it("maps missing CLI spawn errors to unavailable without blocking siblings", async () => {
    const runOperation: OperationRunner = async () => {
      throw new HathorSpawnError("hath0r executable not found");
    };
    const status = await collectStatus({ runOperation });
    expect(status.overall).toBe("unavailable");
    expect(status.probes.version.state).toBe("unavailable");
    expect(status.probes.doctor.state).toBe("unavailable");
    expect(status.probes["kb.path"].state).toBe("unavailable");
    expect(statusExitClass(status)).toBe("spawn_error");
  });

  it("maps timeout on one probe to overall error", async () => {
    const runOperation: OperationRunner = async (op) => {
      if (op === "version") return okResult(fixture("version-ok.json"));
      if (op === "doctor") {
        return {
          exitCode: null,
          stdout: "",
          stderr: "",
          signal: "SIGKILL",
          timedOut: true,
          truncated: false,
          durationMs: 10_000,
        };
      }
      return okResult(fixture("kb-path-ok.json"));
    };
    const status = await collectStatus({ runOperation });
    expect(status.probes.doctor.state).toBe("error");
    expect(status.overall).toBe("error");
    expect(statusExitClass(status)).toBe("timeout");
  });
});
