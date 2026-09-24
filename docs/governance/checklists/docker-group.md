# Checklist — Docker group (#46)

- [ ] Group stack topology conforms to Redis + NGINX + ATC + MCP + UXP
- [ ] ATC labeled config-manager
- [ ] Network dedicated per group (`hath0r-net`)
- [ ] Host ports configured via env variables; no secrets in compose/workflows
- [ ] Workflow JSON validates: `hath0r docker workflow validate`
- [ ] Runbook reviewed and operational
