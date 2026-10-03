import { describe, expect, it } from "vitest";
import { featureFlags } from "../../src/app/services/flags.js";
import { ClientTelemetryCollector, redactSensitiveText } from "../../src/app/services/telemetry.js";

describe("ClientTelemetryCollector", () => {
  it("records API calls and evaluates SLIs", () => {
    const collector = new ClientTelemetryCollector(50);

    collector.recordApiCall({
      path: "/api/hathor/status",
      method: "GET",
      durationMs: 45,
      status: 200,
      success: true,
    });
    collector.recordApiCall({
      path: "/api/health",
      method: "GET",
      durationMs: 15,
      status: 200,
      success: true,
    });

    const signals = collector.getGoldenSignals();
    expect(signals.traffic.totalApiCalls).toBe(2);
    expect(signals.errors.totalApiErrors).toBe(0);
    expect(signals.errors.apiErrorRate).toBe(0);
    expect(signals.latency.apiP50Ms).toBeGreaterThanOrEqual(15);
    expect(signals.latency.apiP95Ms).toBeGreaterThanOrEqual(45);

    const healthSli = signals.slis.find((s) => s.id === "ui.health.success_rate");
    expect(healthSli?.passed).toBe(true);

    const errorRateSli = signals.slis.find((s) => s.id === "ui.api.error_rate");
    expect(errorRateSli?.passed).toBe(true);
  });

  it("calculates degraded SLI when error rate exceeds threshold", () => {
    const collector = new ClientTelemetryCollector(50);

    for (let i = 0; i < 9; i++) {
      collector.recordApiCall({
        path: "/api/test",
        method: "GET",
        durationMs: 20,
        status: 200,
        success: true,
      });
    }
    // 1 failure out of 10 = 10% error rate (max target is 5%)
    collector.recordApiCall({
      path: "/api/test-failure",
      method: "GET",
      durationMs: 30,
      status: 500,
      success: false,
      error: "Internal Server Error",
    });

    const signals = collector.getGoldenSignals();
    expect(signals.errors.totalApiErrors).toBe(1);
    expect(signals.errors.apiErrorRate).toBe(0.1);

    const errorRateSli = signals.slis.find((s) => s.id === "ui.api.error_rate");
    expect(errorRateSli?.passed).toBe(false);
  });

  it("records render metrics and calculates render p95 latency", () => {
    const collector = new ClientTelemetryCollector(50);

    collector.recordRender("StatusPage", 50);
    collector.recordRender("ProductsPage", 80);
    collector.recordRender("ObservabilityPage", 120);

    const signals = collector.getGoldenSignals();
    expect(signals.traffic.totalRenderEvents).toBe(3);
    expect(signals.latency.renderP95Ms).toBe(120);

    const renderSli = signals.slis.find((s) => s.id === "ui.render.latency_p95_ms");
    expect(renderSli?.passed).toBe(true);
  });

  it("redacts sensitive paths and secret patterns", () => {
    const sensitive =
      "Error in /Users/raybayly/Development/OpenSource/file.ts with token=ghp_ABC12345678901234567890 and Bearer eyJhbGciOi";
    const redacted = redactSensitiveText(sensitive);

    expect(redacted).not.toContain("/Users/raybayly");
    expect(redacted).not.toContain("ghp_ABC");
    expect(redacted).toContain("[REDACTED_PATH]");
    expect(redacted).toContain("[REDACTED_SECRET]");
  });

  it("toggles debug mode via OpenFeature catalog flags", () => {
    expect(featureFlags.getBoolean("poc.telemetry.console_debug")).toBe(false);
    featureFlags.setOverride("poc.telemetry.console_debug", true);
    expect(featureFlags.getBoolean("poc.telemetry.console_debug")).toBe(true);
    featureFlags.clearOverrides();
    expect(featureFlags.getBoolean("poc.telemetry.console_debug")).toBe(false);
  });
});
