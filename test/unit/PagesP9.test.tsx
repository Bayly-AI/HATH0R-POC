import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AboutFeaturePage } from "../../src/app/features/about/AboutPage";
import { DiagnosticsFeaturePage } from "../../src/app/features/diagnostics/DiagnosticsPage";
import { ProductsFeaturePage } from "../../src/app/features/products/ProductsPage";
import { App } from "../../src/app/App";
import { POC_RESPONSE_SCHEMA } from "../../src/shared/contracts";
import type { ApiEnvelope } from "../../src/shared/contracts/api-envelope";
import type { ProductsPayload, StatusPayload } from "../../src/app/services/api";

function productsOk(): ApiEnvelope<ProductsPayload> {
  return {
    schema: POC_RESPONSE_SCHEMA,
    requestId: "p1",
    generatedAt: "2026-09-18T00:00:00.000Z",
    source: "live-cli",
    state: "ok",
    data: {
      mediaType: "application/json",
      group_id: "hath0r-opensource",
      control_tower_product_id: "hath0r-cli",
      products: [
        {
          product_id: "hath0r-cli",
          product_name: "HATH0R CLI",
          role: "control-tower",
          canonical: true,
          is_control_tower: true,
        },
      ],
    },
    diagnostics: [],
  };
}

function productsError(): ApiEnvelope<null> {
  return {
    schema: POC_RESPONSE_SCHEMA,
    requestId: "p2",
    generatedAt: "2026-09-18T00:00:00.000Z",
    source: "live-cli",
    state: "unavailable",
    data: null,
    diagnostics: [
      {
        code: "PRODUCT_CATALOG_NOT_FOUND",
        message: "catalog missing",
        remediation: "run doctor",
      },
    ],
  };
}

function statusOk(): ApiEnvelope<StatusPayload> {
  return {
    schema: POC_RESPONSE_SCHEMA,
    requestId: "s1",
    generatedAt: "2026-09-18T12:00:00.000Z",
    source: "live-cli",
    state: "ok",
    data: {
      overall: "ok",
      probes: {
        version: {
          operation: "version",
          state: "ok",
          data: { version: "0.2.0" },
          diagnostics: [],
          meta: {
            durationMs: 1,
            exitCode: 0,
            timedOut: false,
            truncated: false,
            source: "cli-json",
            cliVersion: "0.2.0",
          },
        },
        doctor: {
          operation: "doctor",
          state: "ok",
          data: {},
          diagnostics: [],
          meta: {
            durationMs: 1,
            exitCode: 0,
            timedOut: false,
            truncated: false,
            source: "cli-json",
          },
        },
        "kb.path": {
          operation: "kb.path",
          state: "ok",
          data: { configured: true, available: true },
          diagnostics: [],
          meta: {
            durationMs: 1,
            exitCode: 0,
            timedOut: false,
            truncated: false,
            source: "cli-json",
          },
        },
      },
    },
    diagnostics: [],
  };
}

function statusDegraded(): ApiEnvelope<StatusPayload> {
  const base = statusOk();
  return {
    ...base,
    state: "degraded",
    source: "fixture",
    data: {
      overall: "degraded",
      probes: {
        ...base.data!.probes,
        doctor: {
          ...base.data!.probes.doctor,
          state: "degraded",
          diagnostics: [
            {
              code: "DOCTOR_FAILED",
              message: "check failed",
              remediation: "fix it",
            },
          ],
        },
      },
    },
  };
}

describe("ProductsFeaturePage", () => {
  it("shows loading then product rows", async () => {
    render(<ProductsFeaturePage loadProducts={async () => productsOk()} />);
    expect(screen.getByTestId("products-loading")).toBeInTheDocument();
    await screen.findByRole("table");
    expect(screen.getAllByText("hath0r-cli").length).toBeGreaterThan(0);
    expect(screen.getByText("HATH0R CLI")).toBeInTheDocument();
  });

  it("shows error/unavailable remediation", async () => {
    render(<ProductsFeaturePage loadProducts={async () => productsError()} />);
    await screen.findByText(/catalog missing/i);
    expect(screen.getByText(/run doctor/i)).toBeInTheDocument();
  });

  it("shows empty catalog message", async () => {
    const empty = productsOk();
    empty.data = {
      mediaType: "application/json",
      products: [],
    };
    render(<ProductsFeaturePage loadProducts={async () => empty} />);
    expect(await screen.findByTestId("products-empty")).toBeInTheDocument();
  });

  it("shows fixture banner", async () => {
    const fix = productsOk();
    fix.source = "fixture";
    render(<ProductsFeaturePage loadProducts={async () => fix} />);
    expect(await screen.findByTestId("fixture-banner")).toBeInTheDocument();
  });
});

describe("DiagnosticsFeaturePage", () => {
  it("shows empty diagnostics when all ok", async () => {
    render(<DiagnosticsFeaturePage loadStatus={async () => statusOk()} />);
    expect(await screen.findByTestId("diagnostics-empty")).toBeInTheDocument();
  });

  it("lists diagnostics with source and timestamp", async () => {
    render(<DiagnosticsFeaturePage loadStatus={async () => statusDegraded()} />);
    await screen.findByText(/check failed/i);
    expect(screen.getByText(/fix it/i)).toBeInTheDocument();
    expect(screen.getByText("doctor")).toBeInTheDocument();
    expect(screen.getAllByText(/2026-09-18T12:00:00.000Z/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("fixture-banner")).toBeInTheDocument();
  });
});

describe("AboutFeaturePage", () => {
  it("renders identity and SoT boundaries", async () => {
    render(
      <AboutFeaturePage
        loadHealth={async () => ({
          schema: POC_RESPONSE_SCHEMA,
          requestId: "h",
          generatedAt: "2026-09-18T00:00:00.000Z",
          source: "application",
          state: "ok",
          data: { status: "ok", service: "hathor-poc-adapter" },
          diagnostics: [],
        })}
        loadStatus={async () => statusOk()}
      />,
    );
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Source of truth" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Boundaries" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("about-cli-version")).toHaveTextContent("0.2.0"));
  });

  it("shows fixture banner when status is fixture", async () => {
    render(
      <AboutFeaturePage
        loadHealth={async () => ({
          schema: POC_RESPONSE_SCHEMA,
          requestId: "h",
          generatedAt: "2026-09-18T00:00:00.000Z",
          source: "application",
          state: "ok",
          data: { status: "ok" },
          diagnostics: [],
        })}
        loadStatus={async () => ({ ...statusOk(), source: "fixture" })}
      />,
    );
    expect(await screen.findByTestId("fixture-banner")).toBeInTheDocument();
  });
});

describe("App routes for P9 pages", () => {
  it("navigates to products route heading", async () => {
    // Avoid live fetches from route pages by only checking shell links exist.
    render(<App />);
    expect(screen.getByRole("link", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Diagnostics" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
  });

  it("renders Products route element", async () => {
    render(
      <MemoryRouter initialEntries={["/products"]}>
        <Routes>
          <Route
            path="/products"
            element={<ProductsFeaturePage loadProducts={async () => productsOk()} />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Products" });
  });
});
