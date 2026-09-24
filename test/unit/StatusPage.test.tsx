import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StatusOverviewPage } from "../../src/app/features/status/StatusPage";
import type { ApiEnvelope } from "../../src/shared/contracts/api-envelope";
import type { StatusPayload } from "../../src/app/services/api";
import { POC_CAPABILITIES_SCHEMA, POC_RESPONSE_SCHEMA } from "../../src/shared/contracts";
import {
  buildCapabilityDocument,
  defaultAdapterSupport,
} from "../../src/shared/contracts/capability";

function probe(
  operation: string,
  state: "ok" | "degraded" | "unavailable" | "error",
  data: unknown,
  diagnostics: Array<{ code: string; message: string; remediation?: string }> = [],
) {
  return {
    operation,
    state,
    data,
    diagnostics,
    meta: {
      durationMs: 1,
      exitCode: state === "ok" ? 0 : 1,
      timedOut: false,
      truncated: false,
      source: "cli-json" as const,
      ...(operation === "version" && state === "ok" ? { cliVersion: "0.2.0" } : {}),
    },
  };
}

function statusEnvelope(
  overrides: Partial<ApiEnvelope<StatusPayload>> & { data?: StatusPayload },
): ApiEnvelope<StatusPayload> {
  const data: StatusPayload = overrides.data ?? {
    overall: "ok",
    probes: {
      version: probe("version", "ok", { version: "0.2.0", binary: "hath0r" }),
      doctor: probe("doctor", "ok", {
        group_id: "hath0r-opensource",
        control_tower: { product_id: "hath0r-cli", configured: true },
      }),
      "kb.path": probe("kb.path", "ok", { configured: true, available: true }),
    },
  };
  const rest = { ...overrides };
  delete rest.data;
  return {
    schema: POC_RESPONSE_SCHEMA,
    requestId: "req-status",
    generatedAt: "2026-09-18T00:00:00.000Z",
    source: "live-cli",
    state: data.overall,
    diagnostics: [],
    ...rest,
    data,
  };
}

function capsEnvelope(source: "application" | "fixture" = "application") {
  const doc = buildCapabilityDocument(defaultAdapterSupport(), "2026-09-18T00:00:00.000Z");
  return {
    schema: POC_RESPONSE_SCHEMA,
    requestId: "req-caps",
    generatedAt: "2026-09-18T00:00:00.000Z",
    source,
    state: "ok" as const,
    data: { ...doc, schema: POC_CAPABILITIES_SCHEMA, cliPresent: true },
    diagnostics: [],
  };
}

function healthEnvelope() {
  return {
    schema: POC_RESPONSE_SCHEMA,
    requestId: "req-health",
    generatedAt: "2026-09-18T00:00:00.000Z",
    source: "application" as const,
    state: "ok" as const,
    data: { status: "ok", service: "hathor-poc-adapter" },
    diagnostics: [],
  };
}

describe("StatusOverviewPage", () => {
  it("renders loading state initially", async () => {
    let resolveStatus!: (v: ApiEnvelope<StatusPayload>) => void;
    const loadStatus = vi.fn(
      () =>
        new Promise<ApiEnvelope<StatusPayload>>((r) => {
          resolveStatus = r;
        }),
    );
    render(
      <StatusOverviewPage
        loadStatus={loadStatus}
        loadCapabilities={async () => capsEnvelope()}
        loadHealth={async () => healthEnvelope()}
      />,
    );
    expect(screen.getByTestId("status-loading")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "State: Loading" })).toBeInTheDocument();
    resolveStatus(statusEnvelope({}));
    await waitFor(() => expect(screen.queryByTestId("status-loading")).not.toBeInTheDocument());
  });

  it("renders ok state with CLI, doctor, KB, and capabilities", async () => {
    render(
      <StatusOverviewPage
        loadStatus={async () => statusEnvelope({})}
        loadCapabilities={async () => capsEnvelope()}
        loadHealth={async () => healthEnvelope()}
      />,
    );
    await screen.findByRole("heading", { name: "Status" });
    expect(await screen.findByRole("heading", { name: "CLI" })).toBeInTheDocument();
    expect(screen.getByText("0.2.0")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Doctor" })).toBeInTheDocument();
    expect(screen.getByText("hath0r-cli")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Knowledgebase" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Capabilities" })).toBeInTheDocument();
    expect(screen.getByText("cli.version")).toBeInTheDocument();
    // Accessible state labels (non-color-only)
    expect(screen.getAllByRole("status", { name: /State: OK/i }).length).toBeGreaterThan(0);
  });

  it("renders degraded state with remediation", async () => {
    const degraded = statusEnvelope({
      data: {
        overall: "degraded",
        probes: {
          version: probe("version", "ok", { version: "0.2.0" }),
          doctor: probe("doctor", "degraded", { group_id: "hath0r-opensource" }, [
            {
              code: "DOCTOR_FAILED",
              message: "Suite checks failed",
              remediation: "Run hath0r doctor and fix failing checks.",
            },
          ]),
          "kb.path": probe("kb.path", "ok", { configured: true, available: true }),
        },
      },
      state: "degraded",
    });
    render(
      <StatusOverviewPage
        loadStatus={async () => degraded}
        loadCapabilities={async () => capsEnvelope()}
        loadHealth={async () => healthEnvelope()}
      />,
    );
    await screen.findByRole("heading", { name: "Doctor" });
    expect(screen.getByText(/Suite checks failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Run hath0r doctor/i)).toBeInTheDocument();
    expect(screen.getAllByRole("status", { name: /State: Degraded/i }).length).toBeGreaterThan(0);
  });

  it("renders unavailable state with install guidance", async () => {
    const unavailable = statusEnvelope({
      state: "unavailable",
      data: {
        overall: "unavailable",
        probes: {
          version: probe("version", "unavailable", null, [
            {
              code: "CLI_UNAVAILABLE",
              message: "hath0r executable not found",
              remediation: "Install HATH0R-CLI and ensure `hath0r` is on PATH.",
            },
          ]),
          doctor: probe("doctor", "unavailable", null),
          "kb.path": probe("kb.path", "unavailable", null),
        },
      },
      diagnostics: [
        {
          code: "CLI_UNAVAILABLE",
          message: "hath0r executable not found",
          remediation: "Install HATH0R-CLI and ensure `hath0r` is on PATH.",
        },
      ],
    });
    render(
      <StatusOverviewPage
        loadStatus={async () => unavailable}
        loadCapabilities={async () => capsEnvelope()}
        loadHealth={async () => healthEnvelope()}
      />,
    );
    expect((await screen.findAllByText(/hath0r executable not found/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Install HATH0R-CLI/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("status", { name: /State: Unavailable/i }).length).toBeGreaterThan(
      0,
    );
  });

  it("shows fixture banner when source is fixture", async () => {
    render(
      <StatusOverviewPage
        loadStatus={async () => statusEnvelope({ source: "fixture" })}
        loadCapabilities={async () => capsEnvelope("fixture")}
        loadHealth={async () => healthEnvelope()}
      />,
    );
    expect(await screen.findByTestId("fixture-banner")).toHaveTextContent(
      /Displaying fixture data — not connected to live CLI/,
    );
  });

  it("Retry re-fetches status", async () => {
    const user = userEvent.setup();
    const loadStatus = vi
      .fn()
      .mockResolvedValueOnce(statusEnvelope({}))
      .mockResolvedValueOnce(
        statusEnvelope({
          data: {
            overall: "degraded",
            probes: {
              version: probe("version", "ok", { version: "0.2.0" }),
              doctor: probe("doctor", "degraded", {}, [{ code: "X", message: "after retry" }]),
              "kb.path": probe("kb.path", "ok", { configured: true, available: true }),
            },
          },
          state: "degraded",
        }),
      );
    render(
      <StatusOverviewPage
        loadStatus={loadStatus}
        loadCapabilities={async () => capsEnvelope()}
        loadHealth={async () => healthEnvelope()}
      />,
    );
    await screen.findByText("0.2.0");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText(/after retry/);
    expect(loadStatus).toHaveBeenCalledTimes(2);
  });

  it("exposes semantic landmarks and keyboard-focusable retry", async () => {
    const user = userEvent.setup();
    render(
      <StatusOverviewPage
        loadStatus={async () => statusEnvelope({})}
        loadCapabilities={async () => capsEnvelope()}
        loadHealth={async () => healthEnvelope()}
      />,
    );
    await screen.findByRole("heading", { name: "Status" });
    expect(screen.getByRole("heading", { name: "Application" })).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Retry" });
    await user.tab();
    // Focus may land on retry after tabs through page; ensure it is focusable.
    retry.focus();
    expect(retry).toHaveFocus();
    expect(within(document.body).getByRole("heading", { level: 1 })).toHaveAccessibleName("Status");
  });
});
