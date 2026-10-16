# Checklist: Client Telemetry Verification

> Document Type: **Checklist** (`cr-workflow-doc-001`)  
> Product: **HATH0R-Agentic-POC** · Issue: #68 · SemVer: `minor`

- [ ] Golden Signals (latency, traffic, errors, saturation) collected in client runtime
- [ ] SLIs evaluated against `cfg/observability/openobservation.json`:
  - [ ] `ui.health.success_rate` (target $\ge 0.99$)
  - [ ] `ui.api.error_rate` (target $\le 0.05$)
  - [ ] `ui.render.latency_p95_ms` (target $\le 200$ ms)
- [ ] OpenFeature catalog flag `poc.telemetry.console_debug` toggles console output
- [ ] React Error Boundary captures UI crashes and updates error signals
- [ ] PII and secret redaction enforced on captured messages, stacks, and query strings
- [ ] Dedicated UI page `/observability` accessible from navigation
- [ ] All unit and integration tests passing (`npm run check`)
- [ ] No secrets committed
