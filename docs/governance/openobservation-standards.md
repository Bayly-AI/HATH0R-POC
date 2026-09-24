# OpenObservation standards — setup and adherence

> Product: `Bayly-AI/HATH0R-POC` · Control tower: `Bayly-AI/HATH0R-CLI` · Issue track: #41  
> Org-wide observability *intent* and SLI baseline (pairs with OpenTelemetry implementation).

## Intent

**OpenObservation** defines *what* we observe and the operator-facing baseline: SLIs/SLOs, golden signals, audit/event classes, and dashboard/alert expectations.  
**OpenTelemetry** defines *how* signals are produced and exported (`opentelemetry-standards.md`).

## Golden signals (required per service)

1. **Latency** — p50/p95 for primary UI navigation, render cycles, and API requests
2. **Traffic** — page views, route navigations, and integration API calls per minute  
3. **Errors** — client exceptions, console errors, HTTP 4xx/5xx API responses  
4. **Saturation** — browser memory footprint, client pool wait, UI event loop lag  

## Event / audit classes

| Class | Examples | Retention guidance |
|-------|----------|--------------------|
| `security` | authz deny, secret access attempt | longest; restricted |
| `governance` | branch guard block, quality gate fail | medium |
| `ops` | deploy, container health check, status page refresh | medium |
| `product` | UI view navigation, fixture toggle, run trigger | per product policy |

Telemetry spool (Hath0r): `.hath0r/spool/telemetry-*.jsonl` — never blocks primary UX; never contains secrets.

## SLI defaults (POC)

| SLI | Target (dev/test) | Notes |
|-----|-------------------|-------|
| UI `/healthz` success | ≥ 99% rolling 24h local | Container health endpoint |
| UI API error rate | < 5% excluding user cancel | Integration client queries |
| UI P95 render latency | < 200ms | React component mount / transition |
| PR quality gate flake | investigate > 2 consecutive infra fails | Sonar token missing = infra |

## Configuration surface

- `cfg/observability/openobservation.json` — SLI names, alert hooks (urls via env), dashboard links
- Dashboards/alerts are **referenced**, not hardcoded with credentials

## Adherence checklist

`docs/governance/checklists/openobservation-adherence.md`

## Playbook / runbook

- `docs/governance/playbooks/openobservation-setup-playbook.md`
- `docs/governance/runbooks/openobservation-ops-runbook.md`
