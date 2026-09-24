# Runbook — OpenTelemetry (OTel) ops

## No spans or telemetry reaching collector
- Check `OTEL_EXPORTER_OTLP_ENDPOINT` and target collector health.
- Confirm sampler ratio is not dropping events (`OTEL_TRACES_SAMPLER_ARG`).

## Authentication failures to collector
- Rotate or set credentials in `/Users/raybayly/Development/.credentials/<service>/.env`.
- Never commit authorization headers to source control.
