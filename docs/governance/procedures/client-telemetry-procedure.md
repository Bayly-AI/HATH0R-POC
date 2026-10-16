# Procedure: Client Telemetry and Golden Signals Collection

> Document Type: **Procedure** (`cr-workflow-doc-001`)  
> Product: **HATH0R-Agentic-POC** · Issue: #68 · SemVer: `minor`

## 1. Scope

Normative procedure for implementing and validating client telemetry, SLI evaluation, and OpenFeature flag integration in the `hath0r-poc` React/Vite UI.

## 2. Steps

### Step 1: Client Telemetry Collector Module
1. Define `ClientTelemetryCollector` in `src/app/services/telemetry.ts`.
2. Maintain bounded ring buffers for:
   - API request metrics (method, url, durationMs, success, statusCode)
   - Route transition / component render timings (name, durationMs)
   - UI errors (message, stack, componentName)
3. Implement `computeSLIs()` calculating:
   - `ui.health.success_rate`: fraction of successful status/health checks.
   - `ui.api.error_rate`: ratio of failed API calls to total calls.
   - `ui.render.latency_p95_ms`: 95th percentile latency of render timings.
4. Integrate PII and secret redaction (`stripAnsi`, `redactSecrets`, `redactAbsolutePaths`) on all error messages and URL queries.

### Step 2: OpenFeature Flag Integration
1. Define an in-memory feature flag manager in `src/app/services/flags.ts` referencing `cfg/feature-flags/catalog.example.json`.
2. Support evaluated flag `poc.telemetry.console_debug`.
3. When enabled, `ClientTelemetryCollector` logs telemetry records to `console.debug`.

### Step 3: Error Boundary
1. Create `TelemetryErrorBoundary` component in `src/app/components/TelemetryErrorBoundary.tsx`.
2. Wrap route rendering or app layout with the boundary.
3. On `componentDidCatch`, invoke `telemetryCollector.recordError()`.

### Step 4: Observability View
1. Create `ObservabilityPage` in `src/app/features/observability/ObservabilityPage.tsx` and route `/observability`.
2. Display:
   - Golden Signals summary (Latency p50/p95, Traffic count, Errors count, Saturation).
   - SLI compliance status against `cfg/observability/openobservation.json` targets.
   - Recent telemetry event log.
3. Add navigation link in `App.tsx` layout.

### Step 5: Verification & Tests
1. Unit tests covering:
   - `telemetry.ts` metrics ingestion, p95 calculation, and SLI computations.
   - Redaction of tokens, keys, passwords, and file paths.
   - OpenFeature flag evaluation and console debug behavior.
   - `TelemetryErrorBoundary` fallback rendering and error capture.
   - `ObservabilityPage` rendering and interactive refreshes.
2. Run full test suite: `npm run check`.
