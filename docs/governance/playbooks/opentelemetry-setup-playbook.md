# Playbook — OpenTelemetry setup

1. Copy or maintain `cfg/observability/otel.json` in the service repository.
2. Configure `OTEL_EXPORTER_OTLP_ENDPOINT` via environment or credential file.
3. Wire SDK initialization with required resource attributes (`service.name`, `service.namespace`, `deployment.environment`).
4. Validate that test spans reach designated collector/backend.
5. Complete checklist `opentelemetry-adherence.md`.
