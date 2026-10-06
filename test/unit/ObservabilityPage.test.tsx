import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ObservabilityPage } from "../../src/app/features/observability/ObservabilityPage";
import { featureFlags } from "../../src/app/services/flags";
import { telemetryCollector } from "../../src/app/services/telemetry";

describe("ObservabilityPage", () => {
  afterEach(() => {
    cleanup();
    featureFlags.clearOverrides();
    telemetryCollector.clear();
  });

  it("renders golden signals metrics and SLI table", () => {
    telemetryCollector.recordApiCall({
      path: "/api/hathor/status",
      method: "GET",
      durationMs: 40,
      status: 200,
      success: true,
    });

    render(<ObservabilityPage />);

    expect(
      screen.getByRole("heading", { name: /Observability & Golden Signals/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Service Level Indicators/i)).toBeInTheDocument();
    expect(screen.getByTestId("sli-row-ui.health.success_rate")).toBeInTheDocument();
    expect(screen.getByTestId("sli-row-ui.api.error_rate")).toBeInTheDocument();
    expect(screen.getByTestId("sli-row-ui.render.latency_p95_ms")).toBeInTheDocument();
    expect(screen.getByTestId("flag-console-debug")).toBeInTheDocument();
  });

  it("allows toggling OpenFeature console debug flag", async () => {
    const user = userEvent.setup();
    render(<ObservabilityPage />);

    const checkbox = screen.getByTestId("flag-console-debug") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(featureFlags.getBoolean("poc.telemetry.console_debug")).toBe(true);
  });
});
