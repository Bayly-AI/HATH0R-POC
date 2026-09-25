import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TelemetryErrorBoundary } from "../../src/app/components/TelemetryErrorBoundary";
import { telemetryCollector } from "../../src/app/services/telemetry";

function ProblematicChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Simulated component explosion");
  }
  return <div>Healthy Child</div>;
}

describe("TelemetryErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <TelemetryErrorBoundary>
        <ProblematicChild shouldThrow={false} />
      </TelemetryErrorBoundary>,
    );

    expect(screen.getByText("Healthy Child")).toBeInTheDocument();
  });

  it("catches render error, renders fallback UI, and records telemetry", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const recordSpy = vi.spyOn(telemetryCollector, "recordError");

    const { rerender } = render(
      <TelemetryErrorBoundary fallbackTitle="View Failed" source="TestView">
        <ProblematicChild shouldThrow={true} />
      </TelemetryErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("View Failed")).toBeInTheDocument();
    expect(screen.getByText(/Simulated component explosion/i)).toBeInTheDocument();

    expect(recordSpy).toHaveBeenCalledWith(
      expect.stringContaining("Simulated component explosion"),
      "TestView",
    );

    // Test retry recovery
    rerender(
      <TelemetryErrorBoundary fallbackTitle="View Failed" source="TestView">
        <ProblematicChild shouldThrow={false} />
      </TelemetryErrorBoundary>,
    );

    const user = userEvent.setup();
    const retryBtn = screen.getByRole("button", { name: /Retry View/i });
    await user.click(retryBtn);

    expect(screen.getByText("Healthy Child")).toBeInTheDocument();

    spy.mockRestore();
  });
});
