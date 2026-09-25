# Playbook: Client Telemetry Operations and SLI Response

> Document Type: **Playbook** (`cr-workflow-doc-001`)  
> Product: **HATH0R-Agentic-POC** · Issue: #68 · SemVer: `minor`

## 1. Scenario: Degraded SLI Alert or Warning

When viewing the Observability dashboard or inspecting telemetry:

### Case A: `ui.api.error_rate` Exceeds Target ($> 5\%$)
1. Check the **Recent Errors** panel in `/observability`.
2. Determine whether errors originate from adapter connection refused (`HTTP 502/503`) or probe failures.
3. If adapter loopback is down, run `hath0r doctor` to check daemon/CLI health.
4. Verify server logs via `npm run dev:server`.

### Case B: `ui.render.latency_p95_ms` Exceeds Target ($> 200$ ms)
1. Enable `poc.telemetry.console_debug` in feature flag config or browser storage.
2. Open DevTools Performance tab and profile route transitions between `/status` and `/products`.
3. Check for unbounded array rendering or large JSON payload normalization on the main thread.

### Case C: Unhandled Exception in React Tree
1. `TelemetryErrorBoundary` renders fallback UI banner ("Something went wrong in this view").
2. The error event is recorded into `telemetryCollector.getErrors()`.
3. If `poc.telemetry.console_debug` is enabled, examine sanitized stack trace.
4. Click "Reload View" to remount without full page refresh.
