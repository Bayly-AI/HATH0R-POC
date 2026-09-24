# Checklist — OpenObservation adherence (#41)

- [ ] Golden signals identified per service (latency, traffic, errors, saturation)
- [ ] SLIs documented in `cfg/observability/openobservation.json`
- [ ] Telemetry spool under `.hath0r/spool` only
- [ ] No secrets in events or configurations
- [ ] Alert webhook only via environment variable references
