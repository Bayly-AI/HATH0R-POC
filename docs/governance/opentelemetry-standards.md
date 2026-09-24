# OpenTelemetry (OTel) standards — setup and adherence

> Product: `Bayly-AI/HATH0R-POC` · Control tower: `Bayly-AI/HATH0R-CLI` · Issue track: #43  
> Applies org-wide across product groups.

## Policy (CRITICAL)

1. **OpenTelemetry is the canonical observability SDK/API** for traces, metrics, and (where adopted) logs bridge.
2. Every long-running service (MCP, ATC, UXP backends, factories that emit runtime telemetry) MUST initialize OTel once at process start.
3. **Resource attributes** (required):
   - `service.name` — stable service id (`hath0r-poc-ui`)
   - `service.namespace` or product/group — `hath0r-opensource`
   - `deployment.environment` — `local` | `development` | `testing` | `staging` | `production`
   - `service.version` — from `VERSION` / build metadata when available
4. **Export**: OTLP preferred (HTTP or gRPC). Endpoints via config/env only.
5. **Secrets**: collector auth tokens / API keys ONLY via env refs under `/Users/raybayly/Development/.credentials/<service>/.env` — never commit.
6. Do not invent competing proprietary trace formats. Bridge legacy metrics into OTel views when practical.

## Configuration surface

- `cfg/observability/otel.json` — exporter endpoints, sampler, resource defaults
- Env overrides:
  - `OTEL_SERVICE_NAME`
  - `OTEL_RESOURCE_ATTRIBUTES`
  - `OTEL_EXPORTER_OTLP_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_HEADERS` (secret via env, never file-in-git)
  - `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG`

## Minimum instrumentation

| Surface | Signal | Notes |
|---------|--------|-------|
| HTTP/MCP request path | traces | One span per inbound request/tool call |
| Factory / workflow run | traces + metrics | `run_id`, factory_id, step bot/action |
| Health probes | metrics only | Avoid high-cardinality labels |
| Errors | span status + exception events | No secret values in attributes |

## Adherence checklist

See `docs/governance/checklists/opentelemetry-adherence.md`.

## Playbook / runbook

- Playbook: `docs/governance/playbooks/opentelemetry-setup-playbook.md`
- Runbook: `docs/governance/runbooks/opentelemetry-ops-runbook.md`

## Related standards

- OpenObservation (what we observe / SLIs): `openobservation-standards.md`
- OpenFeature (flag evaluation correlation): `openfeature-standards.md`
