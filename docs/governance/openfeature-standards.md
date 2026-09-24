# OpenFeature standards — setup and adherence

> Product: `Bayly-AI/HATH0R-POC` · Control tower: `Bayly-AI/HATH0R-CLI` · Issue track: #42  
> Applies org-wide across product groups.

## Policy (CRITICAL)

1. **OpenFeature is the canonical feature-flag API** for runtime toggles (no ad-hoc `if ENV_FLAG` sprawl for product behavior).
2. Flag evaluation MUST go through an OpenFeature-compatible client/provider abstraction.
3. Flag keys are **stable, lowercase, dotted or kebab** identifiers (e.g. `poc.fixture_mode.default`, `poc.dark_mode.preview`).
4. Default values ship safe-for-production (fail closed for mutating/dangerous paths).
5. Providers and remote config URLs are configured via env/config — **no secrets in repo**.
6. Evaluation context SHOULD include: `targetingKey` / principal (non-PII when possible), `environment`, `product`, `service.name`.

## Configuration surface

- `cfg/feature-flags/openfeature.json` — provider kind, defaults, flag catalog pointers
- Env:
  - `OPENFEATURE_PROVIDER` (`in-memory` | `env` | `file` | vendor)
  - `OPENFEATURE_PROVIDER_OPTIONS` (JSON string; secrets via env interpolation outside git)

## Flag catalog expectations

Each product maintains a short catalog (markdown or JSON) listing:

| Flag key | Type | Default | Owner | Notes |
|----------|------|---------|-------|-------|
| `poc.fixture_mode.default` | boolean | false | uxp | Live vs fixture fallback |
| `poc.telemetry.console_debug` | boolean | false | observability | Diagnostic logging |
| `poc.dark_mode.preview` | boolean | true | uxp | UI styling preview |

Local catalog: `cfg/feature-flags/catalog.example.json`.

## Correlation with observability

When OTel is enabled, attach flag keys/values used for a request as span attributes under `feature_flag.*` (OpenFeature semantic conventions where available). Never attach secrets.

## Adherence checklist

`docs/governance/checklists/openfeature-adherence.md`

## Playbook / runbook

- `docs/governance/playbooks/openfeature-setup-playbook.md`
- `docs/governance/runbooks/openfeature-ops-runbook.md`
