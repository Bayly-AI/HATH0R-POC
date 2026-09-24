import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  collectProducts,
  extractStructuredProducts,
  productsExitClass,
} from "../../src/server/hathor/products";
import { HathorSpawnError, type RunnerResult } from "../../src/server/hathor/runner";
import type { OperationRunner } from "../../src/server/hathor/status";

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

describe("extractStructuredProducts", () => {
  it("accepts golden products payload", () => {
    const parsed = JSON.parse(fixture("kb-products-ok.json")) as { data: unknown };
    const out = extractStructuredProducts(parsed.data);
    expect(out?.mediaType).toBe("application/json");
    expect(out?.products).toHaveLength(3);
    expect(out?.control_tower_product_id).toBe("hath0r-cli");
  });

  it("rejects missing products array (does not invent [])", () => {
    expect(extractStructuredProducts({ group_id: "x" })).toBeNull();
    expect(extractStructuredProducts({ products: "nope" })).toBeNull();
  });
});

describe("collectProducts", () => {
  it("returns structured products on success", async () => {
    const runOperation: OperationRunner = async (op) => {
      expect(op).toBe("kb.products");
      return result(fixture("kb-products-ok.json"));
    };
    const out = await collectProducts({ runOperation });
    expect(out.state).toBe("ok");
    expect(out.data?.mediaType).toBe("application/json");
    if (out.data?.mediaType === "application/json") {
      expect(out.data.products.length).toBe(3);
    }
    expect(productsExitClass(out)).toBe("success");
  });

  it("maps missing catalog to unavailable", async () => {
    const runOperation: OperationRunner = async () =>
      result(fixture("kb-products-missing.json"), 3);
    const out = await collectProducts({ runOperation });
    expect(out.state).toBe("unavailable");
    expect(out.data).toBeNull();
    expect(out.diagnostics.length).toBeGreaterThan(0);
  });

  it("maps invalid catalog to error, not empty list", async () => {
    const runOperation: OperationRunner = async () =>
      result(fixture("kb-products-invalid.json"), 2);
    const out = await collectProducts({ runOperation });
    expect(out.state).toBe("error");
    expect(out.data).toBeNull();
  });

  it("maps malformed ok JSON products data to error not []", async () => {
    const body = {
      schema: "hath0r.cli.response/1",
      command: "kb.products",
      generated_at: "2026-09-16T00:00:00Z",
      state: "ok",
      data: { products: [{ no_id: true }] },
      diagnostics: [],
      meta: { cli_version: "0.2.0", duration_ms: 1 },
    };
    const runOperation: OperationRunner = async () => result(JSON.stringify(body));
    const out = await collectProducts({ runOperation });
    expect(out.state).toBe("error");
    expect(out.data).toBeNull();
  });

  it("maps timeout to error", async () => {
    const runOperation: OperationRunner = async () => ({
      exitCode: null,
      stdout: "",
      stderr: "",
      signal: "SIGKILL",
      timedOut: true,
      truncated: false,
      durationMs: 10_000,
    });
    const out = await collectProducts({ runOperation });
    expect(out.state).toBe("error");
    expect(productsExitClass(out)).toBe("timeout");
  });

  it("maps spawn failure to unavailable", async () => {
    const runOperation: OperationRunner = async () => {
      throw new HathorSpawnError("missing");
    };
    const out = await collectProducts({ runOperation });
    expect(out.state).toBe("unavailable");
    expect(productsExitClass(out)).toBe("spawn_error");
  });

  it("returns bounded text payload for plain stdout success", async () => {
    const runOperation: OperationRunner = async () =>
      result("product_id: hath0r-cli\nproduct_name: CLI\n", 0);
    const out = await collectProducts({ runOperation });
    expect(out.state).toBe("ok");
    expect(out.data?.mediaType).toBe("text/plain");
    if (out.data?.mediaType === "text/plain") {
      expect(out.data.text).toContain("hath0r-cli");
    }
  });
});
