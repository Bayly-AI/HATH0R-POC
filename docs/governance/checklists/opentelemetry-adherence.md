# Checklist — OpenTelemetry adherence (#43)

- [ ] `cfg/observability/otel.json` present and conforms to `hath0r.observability.otel/v1`
- [ ] Resource attributes: `service.name`, `service_namespace`/group, `deployment_environment`
- [ ] OTLP endpoint configured via env refs; headers secret via env only
- [ ] No tokens or credentials in git
- [ ] HTTP/MCP/UI paths propagate context and trace correlation
- [ ] Docs linked from AGENTS or SUITE_STANDARDS pointer
