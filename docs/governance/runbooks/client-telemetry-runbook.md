# Runbook: Client Telemetry Inspection and Diagnostics

> Document Type: **Runbook** (`cr-workflow-doc-001`)  
> Product: **HATH0R-Agentic-POC** · Issue: #68 · SemVer: `minor`

## 1. Quick Diagnostics Commands

### Run Telemetry & Component Unit Tests
```bash
npm run test test/unit/telemetry.test.ts test/unit/ObservabilityPage.test.tsx test/unit/TelemetryErrorBoundary.test.tsx
```

### Run Typecheck & Linter
```bash
npm run typecheck
npm run lint
```

### Start Console in Local Mode
```bash
npm run dev
```
Open `http://localhost:5173/observability` to inspect live Golden Signals and SLIs.

### Enable Console Debug Mode
Set feature flag in browser console:
```javascript
window.__HATH0R_FEATURE_FLAGS__ = { "poc.telemetry.console_debug": true };
```
Or dispatch event to enable real-time telemetry streaming in console logs.
