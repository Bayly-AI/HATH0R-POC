# Docker group standard (ATC + MCP + UXP + Redis + NGINX)

> Product: `Bayly-AI/HATH0R-POC` · Control tower: `Bayly-AI/HATH0R-CLI` · Issue #46

## Topology

Per product family (`hath0r`, `1-nation`, `bai`):

1. **Redis** — shared state  
2. **NGINX** — shared edge  
3. **ATC** — **config manager** for the group  
4. **MCP** — knowledge/tools  
5. **UXP** — experience UI (`hath0r-poc-ui`)

## Templates

| Group | Path |
|-------|------|
| Hath0r | `cfg/docker/groups/hath0r/docker-compose.yml` (on Control Tower) |
| 1-Nation | ATC canonical + `cfg/docker/groups/1-nation/README.md` |
| BAI | `cfg/docker/groups/bai/docker-compose.yml` |

## Workflows

- `cfg/docker/workflows/hath0r-poc-ui.json` (POC UI stack workflow)
- `cfg/docker/workflows/hath0r-docker-group.json` (Full group workflow on Control Tower)

Validate: `hath0r docker workflow validate <file>`

## Docs set

- Checklist: `docs/governance/checklists/docker-group.md`
- Playbook: `docs/governance/playbooks/docker-group-playbook.md`
- Runbook: `docs/governance/runbooks/docker-group-runbook.md`
