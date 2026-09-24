import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/main";
import { parseApiEnvelope } from "../../src/shared/schemas";
import { POC_CAPABILITIES_SCHEMA, POC_RESPONSE_SCHEMA } from "../../src/shared/contracts";

describe("GET /api/health", () => {
  it("returns 200 with valid hathor-poc.response/1 envelope", async () => {
    const app = createApp({ probeCliPresent: () => true });
    const res = await request(app).get("/api/health").expect(200);

    expect(res.headers["x-request-id"]).toBeTruthy();
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.schema).toBe(POC_RESPONSE_SCHEMA);
    expect(envelope.state).toBe("ok");
    expect(envelope.source).toBe("application");
    expect(envelope.data).toMatchObject({ status: "ok", service: "hathor-poc-adapter" });
    expect(envelope.requestId).toBe(res.headers["x-request-id"]);
    expect(envelope.diagnostics).toEqual([]);

    const audit = (res.body as { audit?: Record<string, unknown> }).audit;
    expect(audit).toMatchObject({
      requestId: envelope.requestId,
      route: "/health",
      commandKey: null,
      exitClass: "none",
    });
    expect(typeof audit?.durationMs).toBe("number");
    expect(typeof audit?.resultSizeBytes).toBe("number");
    expect(Number(audit?.resultSizeBytes)).toBeGreaterThan(0);
  });
});

describe("GET /api/hathor/capabilities", () => {
  it("returns capability states with CLI present (fake probe)", async () => {
    const app = createApp({ probeCliPresent: () => true });
    const res = await request(app).get("/api/hathor/capabilities").expect(200);

    expect(res.headers["x-request-id"]).toBeTruthy();
    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.schema).toBe(POC_RESPONSE_SCHEMA);
    expect(envelope.state).toBe("ok");
    expect(envelope.source).toBe("application");
    expect(envelope.diagnostics).toEqual([]);

    const data = envelope.data as {
      schema: string;
      cliPresent: boolean;
      capabilities: Array<{ id: string; state: string }>;
    };
    expect(data.schema).toBe(POC_CAPABILITIES_SCHEMA);
    expect(data.cliPresent).toBe(true);

    const byId = Object.fromEntries(data.capabilities.map((c) => [c.id, c.state]));
    expect(byId["cli.version"]).toBe("implemented");
    expect(byId["cli.doctor"]).toBe("implemented");
    expect(byId["kb.path"]).toBe("implemented");
    expect(byId["kb.products"]).toBe("implemented");
    expect(byId["cli.structured-output"]).toBe("implemented");
    expect(byId["framework.knowledge-search"]).toBe("unavailable");
    expect(byId["framework.validation"]).toBe("unavailable");
    expect(byId["framework.orchestration"]).toBe("unavailable");
    expect(byId["operator.mutations"]).toBe("out-of-scope");

    const audit = (res.body as { audit?: Record<string, unknown> }).audit;
    expect(audit).toMatchObject({
      commandKey: "capabilities",
      exitClass: "success",
      requestId: envelope.requestId,
    });
  });

  it("degrades envelope when CLI missing without inventing framework support", async () => {
    const app = createApp({ probeCliPresent: () => false });
    const res = await request(app).get("/api/hathor/capabilities").expect(200);

    const envelope = parseApiEnvelope(res.body as unknown);
    expect(envelope.state).toBe("degraded");
    expect(envelope.diagnostics[0]?.code).toBe("CLI_UNAVAILABLE");

    const data = envelope.data as {
      cliPresent: boolean;
      capabilities: Array<{ id: string; state: string }>;
    };
    expect(data.cliPresent).toBe(false);
    // Adapter still implements the four ops; runtime absence is envelope/diagnostics only.
    expect(data.capabilities.find((c) => c.id === "cli.version")?.state).toBe("implemented");
    expect(data.capabilities.find((c) => c.id === "framework.orchestration")?.state).toBe(
      "unavailable",
    );

    const audit = (res.body as { audit?: Record<string, unknown> }).audit;
    expect(audit?.exitClass).toBe("spawn_error");
  });

  it("honors injected adapter support for capability rows", async () => {
    const app = createApp({
      probeCliPresent: () => true,
      adapterSupport: {
        operations: ["version"],
        structuredOutput: false,
        frameworkKnowledgeSearch: false,
        frameworkValidation: false,
        frameworkOrchestration: false,
        operatorMutations: false,
      },
    });
    const res = await request(app).get("/api/hathor/capabilities").expect(200);
    const data = (res.body as { data: { capabilities: Array<{ id: string; state: string }> } })
      .data;
    const byId = Object.fromEntries(data.capabilities.map((c) => [c.id, c.state]));
    expect(byId["cli.version"]).toBe("implemented");
    expect(byId["cli.doctor"]).toBe("unavailable");
    expect(byId["cli.structured-output"]).toBe("planned");
  });
});
