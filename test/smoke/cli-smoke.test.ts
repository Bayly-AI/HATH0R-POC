/**
 * Opt-in smoke suite against a real installed `hath0r` binary.
 * Not part of default `npm test` / CI — run via `npm run test:smoke`.
 *
 * Requires:
 *   - `hath0r` on PATH (or HATH0R_EXECUTABLE)
 *   - OpenSource group layout discoverable (or HATH0R_GROUP_ROOT)
 */

import { describe, expect, it } from "vitest";
import { resolveHathorExecutable, runHathorOperation } from "../../src/server/hathor/runner";
import { normalizeRunnerResult } from "../../src/server/hathor/normalize";
import { collectStatus } from "../../src/server/hathor/status";
import { collectProducts } from "../../src/server/hathor/products";

function cliAvailable(): boolean {
  try {
    resolveHathorExecutable(process.env.HATH0R_EXECUTABLE);
    return true;
  } catch {
    return false;
  }
}

const describeSmoke = cliAvailable() ? describe : describe.skip;

describeSmoke("smoke: real hath0r", () => {
  it("resolves executable", () => {
    const exe = resolveHathorExecutable(process.env.HATH0R_EXECUTABLE);
    expect(exe.length).toBeGreaterThan(0);
  });

  it("version probe returns ok or structured version", async () => {
    const raw = await runHathorOperation("version", {
      executable: process.env.HATH0R_EXECUTABLE,
      timeoutMs: 15_000,
    });
    const norm = normalizeRunnerResult("version", raw);
    expect(["ok", "degraded", "unavailable", "error"]).toContain(norm.state);
    if (norm.state === "ok") {
      expect(norm.meta.cliVersion || (norm.data as { version?: string })?.version).toBeTruthy();
    }
  }, 20_000);

  it("status composite completes without throw", async () => {
    const status = await collectStatus({
      runnerOptions: {
        executable: process.env.HATH0R_EXECUTABLE,
        timeoutMs: 20_000,
      },
    });
    expect(status.probes.version).toBeTruthy();
    expect(status.probes.doctor).toBeTruthy();
    expect(status.probes["kb.path"]).toBeTruthy();
    expect(["ok", "degraded", "unavailable", "error"]).toContain(status.overall);
  }, 60_000);

  it("products probe completes without inventing empty list on error", async () => {
    const products = await collectProducts({
      runnerOptions: {
        executable: process.env.HATH0R_EXECUTABLE,
        timeoutMs: 20_000,
      },
    });
    if (products.state !== "ok") {
      expect(products.data).toBeNull();
    } else {
      expect(products.data).not.toEqual([]);
      expect(products.data?.mediaType).toBeTruthy();
    }
  }, 30_000);
});

describe("smoke: skip marker when CLI absent", () => {
  it("documents skip path", () => {
    if (!cliAvailable()) {
      expect(cliAvailable()).toBe(false);
      return;
    }
    expect(() => resolveHathorExecutable(process.env.HATH0R_EXECUTABLE)).not.toThrow();
  });
});
