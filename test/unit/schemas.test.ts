import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildCapabilityDocument,
  defaultAdapterSupport,
  getCapability,
  makeEnvelope,
  POC_CAPABILITIES_SCHEMA,
  POC_RESPONSE_SCHEMA,
  type AdapterSupport,
} from "../../src/shared/contracts";
import {
  EnvelopeValidationError,
  parseApiEnvelope,
  parseApiEnvelopeWithData,
  parseCapabilityDocument,
  safeParseApiEnvelope,
  safeParseCapabilityDocument,
} from "../../src/shared/schemas";

function validEnvelope(overrides: Record<string, unknown> = {}): unknown {
  return {
    schema: POC_RESPONSE_SCHEMA,
    requestId: "req-1",
    generatedAt: "2026-09-18T00:00:00.000Z",
    source: "application",
    state: "ok",
    data: { status: "ok" },
    diagnostics: [],
    ...overrides,
  };
}

describe("makeEnvelope", () => {
  it("fills schema and generatedAt", () => {
    const env = makeEnvelope({
      requestId: "abc",
      source: "fixture",
      state: "degraded",
      data: { n: 1 },
      diagnostics: [{ code: "X", message: "m" }],
    });
    expect(env.schema).toBe(POC_RESPONSE_SCHEMA);
    expect(env.requestId).toBe("abc");
    expect(typeof env.generatedAt).toBe("string");
  });
});

describe("parseApiEnvelope", () => {
  it("accepts a valid envelope", () => {
    const parsed = parseApiEnvelope(validEnvelope());
    expect(parsed.state).toBe("ok");
    expect(parsed.data).toEqual({ status: "ok" });
  });

  it("accepts unknown additive fields (forward compatible)", () => {
    const result = apiEnvelopeKeepsExtras();
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const raw = validEnvelope();
    delete (raw as { requestId?: string }).requestId;
    const result = safeParseApiEnvelope(raw);
    expect(result.success).toBe(false);
  });

  it("rejects invalid state values", () => {
    const result = safeParseApiEnvelope(validEnvelope({ state: "healthy" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(EnvelopeValidationError);
    }
  });

  it("rejects wrong schema id", () => {
    const result = safeParseApiEnvelope(validEnvelope({ schema: "hathor-poc.response/2" }));
    expect(result.success).toBe(false);
  });

  it("treats external input as unknown until validated", () => {
    const external: unknown = validEnvelope({ diagnostics: [{ code: "A", message: "ok" }] });
    const parsed = parseApiEnvelope(external);
    expect(parsed.diagnostics).toHaveLength(1);
  });

  it("validates data with a caller schema", () => {
    const health = z.object({ status: z.literal("ok"), service: z.string().optional() });
    const env = parseApiEnvelopeWithData(
      validEnvelope({ data: { status: "ok", service: "hathor-poc-adapter" } }),
      health,
    );
    expect(env.data?.status).toBe("ok");
    expect(() =>
      parseApiEnvelopeWithData(validEnvelope({ data: { status: "nope" } }), health),
    ).toThrow(EnvelopeValidationError);
  });
});

function apiEnvelopeKeepsExtras() {
  return safeParseApiEnvelope(
    validEnvelope({
      audit: { durationMs: 12 },
      experimentalFlag: true,
    }),
  );
}

describe("capability document", () => {
  it("derives implemented ops from adapter support, not optimism", () => {
    const doc = buildCapabilityDocument(defaultAdapterSupport(), "2026-09-18T00:00:00.000Z");
    expect(doc.schema).toBe(POC_CAPABILITIES_SCHEMA);
    expect(getCapability(doc, "cli.version")?.state).toBe("implemented");
    expect(getCapability(doc, "cli.doctor")?.state).toBe("implemented");
    expect(getCapability(doc, "kb.path")?.state).toBe("implemented");
    expect(getCapability(doc, "kb.products")?.state).toBe("implemented");
    expect(getCapability(doc, "cli.structured-output")?.state).toBe("implemented");
    expect(getCapability(doc, "framework.knowledge-search")?.state).toBe("unavailable");
    expect(getCapability(doc, "operator.mutations")?.state).toBe("out-of-scope");
  });

  it("marks missing operations unavailable when support omits them", () => {
    const support: AdapterSupport = {
      ...defaultAdapterSupport(),
      operations: ["version"],
      structuredOutput: false,
    };
    const doc = buildCapabilityDocument(support);
    expect(getCapability(doc, "cli.version")?.state).toBe("implemented");
    expect(getCapability(doc, "cli.doctor")?.state).toBe("unavailable");
    expect(getCapability(doc, "cli.structured-output")?.state).toBe("planned");
  });

  it("validates a built document at runtime", () => {
    const doc = buildCapabilityDocument();
    const parsed = parseCapabilityDocument(doc as unknown);
    expect(parsed.capabilities.length).toBeGreaterThanOrEqual(8);
  });

  it("rejects invalid capability state", () => {
    const bad = {
      schema: POC_CAPABILITIES_SCHEMA,
      generatedAt: "2026-09-18T00:00:00.000Z",
      capabilities: [{ id: "x", state: "maybe", summary: "s", evidence: "e" }],
    };
    const result = safeParseCapabilityDocument(bad);
    expect(result.success).toBe(false);
  });

  it("accepts additive fields on capability entries", () => {
    const result = safeParseCapabilityDocument({
      schema: POC_CAPABILITIES_SCHEMA,
      generatedAt: "2026-09-18T00:00:00.000Z",
      capabilities: [
        {
          id: "cli.version",
          state: "implemented",
          summary: "s",
          evidence: "e",
          note: "future field",
        },
      ],
      extraDocField: 1,
    });
    expect(result.success).toBe(true);
  });
});
