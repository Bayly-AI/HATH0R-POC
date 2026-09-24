# Hath0r Docker group (POC pointer)

> Issue: #46 · Canonical compose: control tower **HATH0R-CLI**  
> Template: https://github.com/Bayly-AI/HATH0R-CLI/blob/development/cfg/docker/groups/hath0r/docker-compose.yml  
> Standard: https://github.com/Bayly-AI/HATH0R-CLI/blob/development/docs/governance/docker-group-standard.md

## Topology (ATC + MCP + UXP + REDIS + NGINX)

| Role | Container | Notes |
|------|-----------|-------|
| Shared state | `HATH0R-Redis` | redis:7-alpine |
| Shared edge | `HATH0R-NGINX` | host port default 38000 |
| ATC | `HATH0R-ATC` | config manager · profile `apps` |
| MCP | `HATH0R-MCP` | profile `apps` |
| UXP | `HATH0R-UXP` / `hath0r-poc-ui` | experience surface · profile `apps` when image present |

Patterned after **BAI / Hath0r / 1-Nation** ATC-managed groups. This member repo does **not** vendor the full compose tree; operate from the control tower checkout or execute validated Docker workflows.

## Operator

```bash
# Control tower checkout
cd /Users/raybayly/Development/OpenSource/HATH0R-CLI
docker compose -f cfg/docker/groups/hath0r/docker-compose.yml up -d redis nginx
docker compose -f cfg/docker/groups/hath0r/docker-compose.yml --profile apps up -d
```

## Workflow JSON (this repo)

- `cfg/docker/workflows/hath0r-poc-ui.json` — Hath0r validate → Docker Factory execute

Secrets: `/Users/raybayly/Development/.credentials/hath0r/.env` only — never commit.
