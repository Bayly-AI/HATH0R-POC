# Strategy: Client Telemetry and Golden Signals Collection

> Document Type: **Strategy** (`cr-workflow-doc-001`)  
> Product: **HATH0R-Agentic-POC** · Issue: #68 · SemVer: `minor`  
> Suite Reference: [`cfg/observability/openobservation.json`](../../cfg/observability/openobservation.json)

## 1. Context & Motivation

`HATH0R-Agentic-POC` provides a read-only React/TypeScript Integration Console over the `hath0r` CLI. Per suite OpenObservation standards (`cfg/observability/openobservation.json`), services must observe the four golden signals:
- **Latency**: UI render timing, route transition latency, and API call latency.
- **Traffic**: Request counts across UI views, API probe invocations, and route visits.
- **Errors**: API call failures, error boundary catches, and unhandled promise rejections.
- **Saturation**: Buffer / event queues and spool volume.

In client applications, collecting and aggregating these signals locally allows both runtime evaluation against defined Service Level Indicators (SLIs) and operator visibility via an in-console Golden Signals panel or console debug mode.

## 2. Goals & Non-Goals

### Goals
- Instrument client-side API requests (`fetchStatus`, `fetchCapabilities`, `fetchHealth`, `fetchProducts`) to measure latency and error rates.
- Provide a React Error Boundary (`TelemetryErrorBoundary`) to capture unhandled render exceptions.
- Implement an in-memory client telemetry collector aggregating golden signals and evaluating against SLIs:
  - `ui.health.success_rate` (target $\ge 99\%$)
  - `ui.api.error_rate` (target $\le 5\%$)
  - `ui.render.latency_p95_ms` (target $\le 200$ ms)
- Integrate OpenFeature flag evaluation (`poc.telemetry.console_debug`) to control debug logging to the browser console.
- Provide a dedicated UI view (`/observability`) in the integration console to inspect live golden signals and SLI conformance.
- Ensure strict zero-PII and zero-secret redaction on any captured errors or URLs.

### Non-Goals
- Browser-side arbitrary disk writes (browser cannot write to host filesystem directly; events can be posted to the server spool endpoint or held in in-memory ring buffers).
- Heavy external dependencies (zero external analytics/tracking SDKs like Datadog or Sentry injected into the bundle).

## 3. Architecture & Data Flow

```
[UI Components & Routes]
          │
          ▼ (render / transition latency)
[TelemetryCollector] ◄── [TelemetryErrorBoundary] (unhandled UI errors)
          │
          ├── (API latency / errors) ◄── [Wrapped api.ts fetchers]
          │
          ├── Evaluates SLIs (success rate, error rate, p95 latency)
          │
          ├── OpenFeature Flag (`poc.telemetry.console_debug`) ──► [console.debug]
          │
          └── [Observability / Golden Signals Page (/observability)]
```
