import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  normalizeRunnerResult,
  normalizeSpawnFailure,
  tryParseCliResponse,
} from "../../src/server/hathor/normalize";
import { HathorSpawnError, type RunnerResult } from "../../src/server/hathor/runner";
import type { HathorOperation } from "../../src/server/hathor/operations";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(here, "../fixtures/cli");

function loadFixture(name: string): string {
  return readFileSync(path.join(fixtureDir, name), "utf8");
}

function runner(
  partial: Partial<RunnerResult> & Pick<RunnerResult, "stdout" | "exitCode">,
): RunnerResult {
  return {
    stderr: "",
    signal: null,
    timedOut: false,
    truncated: false,
    durationMs: 5,
    ...partial,
  };
}

describe("tryParseCliResponse", () => {
  it("accepts golden version-ok fixture", () => {
    const parsed = tryParseCliResponse(loadFixture("version-ok.json"));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.schema).toBe("hath0r.cli.response/1");
      expect(parsed.value.data).toMatchObject({ version: "0.2.0" });
    }
  });

  it("rejects unsupported schema major", () => {
    const body = JSON.stringify({
      schema: "hath0r.cli.response/2",
      command: "version",
      generated_at: "2026-09-16T00:00:00Z",
      state: "ok",
      data: {},
      diagnostics: [],
      meta: { cli_version: "0.2.0", duration_ms: 1 },
    });
    const parsed = tryParseCliResponse(body);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toBe("invalid-envelope");
  });

  it("returns not-json for plain text", () => {
    expect(tryParseCliResponse("hath0r 0.2.0").ok).toBe(false);
  });
});

describe("normalizeRunnerResult — JSON fixtures", () => {
  const cases: Array<{ file: string; op: HathorOperation; exit: number; state: string }> = [
    { file: "version-ok.json", op: "version", exit: 0, state: "ok" },
    { file: "doctor-ok.json", op: "doctor", exit: 0, state: "ok" },
    { file: "doctor-degraded.json", op: "doctor", exit: 6, state: "degraded" },
    { file: "kb-path-ok.json", op: "kb.path", exit: 0, state: "ok" },
    { file: "kb-path-missing.json", op: "kb.path", exit: 3, state: "unavailable" },
    { file: "kb-products-ok.json", op: "kb.products", exit: 0, state: "ok" },
    { file: "kb-products-missing.json", op: "kb.products", exit: 3, state: "unavailable" },
    { file: "kb-products-invalid.json", op: "kb.products", exit: 2, state: "error" },
  ];

  for (const c of cases) {
    it(`${c.file} → ${c.state}`, () => {
      const out = normalizeRunnerResult(
        c.op,
        runner({ stdout: loadFixture(c.file), exitCode: c.exit }),
      );
      expect(out.source).toBe("cli-json");
      expect(out.state).toBe(c.state);
      expect(out.operation).toBe(c.op);
      expect(out.meta.cliVersion).toBe("0.2.0");
    });
  }

  it("redacts absolute paths inside kb.path JSON data", () => {
    const fixture = JSON.parse(loadFixture("kb-path-ok.json")) as {
      data: { path: string };
    };
    // Inject a real home-style path into the fixture body.
    fixture.data.path = "/Users/raybayly/Development/OpenSource/.hath0r/knowledgebase";
    const out = normalizeRunnerResult(
      "kb.path",
      runner({ stdout: JSON.stringify(fixture), exitCode: 0 }),
    );
    expect(out.state).toBe("ok");
    expect(out.data).toMatchObject({ configured: true, available: true });
    expect(String((out.data as { path: string }).path)).toBe("[REDACTED_PATH]");
  });
});

describe("normalizeRunnerResult — text compatibility", () => {
  it("parses version text", () => {
    const out = normalizeRunnerResult(
      "version",
      runner({ stdout: "hath0r-cli version 0.2.0\n", exitCode: 0 }),
    );
    expect(out.source).toBe("cli-text");
    expect(out.state).toBe("ok");
    expect(out.data).toMatchObject({ version: "0.2.0" });
  });

  it("maps doctor nonzero to degraded", () => {
    const out = normalizeRunnerResult(
      "doctor",
      runner({ stdout: "\u001B[31mcheck failed\u001B[0m", exitCode: 6 }),
    );
    expect(out.state).toBe("degraded");
    expect(out.diagnostics[0]?.message.includes("\u001B")).toBe(false);
  });

  it("maps kb.path missing to unavailable", () => {
    const out = normalizeRunnerResult(
      "kb.path",
      runner({ stdout: "", stderr: "missing", exitCode: 3 }),
    );
    expect(out.state).toBe("unavailable");
    expect(out.data).toMatchObject({ available: false });
  });

  it("returns bounded products text and never empty list on success text", () => {
    const out = normalizeRunnerResult(
      "kb.products",
      runner({ stdout: "product: hath0r-cli\n", exitCode: 0 }),
    );
    expect(out.state).toBe("ok");
    expect(out.data).toMatchObject({ mediaType: "text/plain" });
    expect(out.data).not.toEqual([]);
  });

  it("maps empty products stdout to error (not [])", () => {
    const out = normalizeRunnerResult("kb.products", runner({ stdout: "  ", exitCode: 0 }));
    expect(out.state).toBe("error");
    expect(out.data).toBeNull();
  });
});

describe("normalizeRunnerResult — runner failures", () => {
  it("timeout → error", () => {
    const out = normalizeRunnerResult(
      "doctor",
      runner({ stdout: "", exitCode: null, timedOut: true }),
    );
    expect(out.state).toBe("error");
    expect(out.diagnostics[0]?.code).toBe("TIMEOUT");
  });

  it("truncated → error and does not parse body", () => {
    const out = normalizeRunnerResult(
      "version",
      runner({
        stdout: loadFixture("version-ok.json"),
        exitCode: 0,
        truncated: true,
      }),
    );
    expect(out.state).toBe("error");
    expect(out.source).toBe("runner");
    expect(out.data).toBeNull();
  });

  it("malformed JSON object → error", () => {
    const out = normalizeRunnerResult(
      "version",
      runner({
        stdout: JSON.stringify({ schema: "hath0r.cli.response/1", state: "ok" }),
        exitCode: 0,
      }),
    );
    expect(out.state).toBe("error");
    expect(out.diagnostics[0]?.code).toBe("MALFORMED_OUTPUT");
  });

  it("empty stdout version → error", () => {
    const out = normalizeRunnerResult("version", runner({ stdout: "", exitCode: 0 }));
    expect(out.state).toBe("error");
  });
});

describe("normalizeSpawnFailure", () => {
  it("maps missing binary to unavailable", () => {
    const out = normalizeSpawnFailure(
      "version",
      new HathorSpawnError("hath0r executable not found"),
    );
    expect(out.state).toBe("unavailable");
    expect(out.source).toBe("runner");
    expect(out.diagnostics[0]?.code).toBe("CLI_UNAVAILABLE");
  });
});
