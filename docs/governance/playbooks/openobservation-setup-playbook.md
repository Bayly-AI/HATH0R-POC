# Playbook — OpenObservation setup

1. Identify golden signals for the service (latency, traffic, errors, saturation).
2. Configure `cfg/observability/openobservation.json` SLIs and targets.
3. Ensure telemetry events and spooling write exclusively to `.hath0r/spool`.
4. Wire alert webhook environment references if notifications are enabled.
5. Verify against `openobservation-adherence.md` checklist.
