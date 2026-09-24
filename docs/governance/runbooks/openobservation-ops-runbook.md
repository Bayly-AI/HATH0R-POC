# Runbook — OpenObservation ops

## SLI breach remediation
- Check golden signal telemetry (latency, error rate, saturation); correlate with OpenTelemetry traces.
- Inspect `.hath0r/spool/telemetry-*.jsonl` for local operation or container health check failures.
- Verify status endpoints (`/healthz`) and integration API reachability.
