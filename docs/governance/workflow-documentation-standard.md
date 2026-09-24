# Workflow Documentation Standard (POC Member)

> Member: `Bayly-AI/HATH0R-Agentic-POC` · Issue track: #45  
> Canonical Control Tower Specification: [`Bayly-AI/HATH0R-CLI` workflow-documentation-standard.md](https://github.com/Bayly-AI/HATH0R-CLI/blob/development/docs/governance/workflow-documentation-standard.md)

## Requirement

Every durable workflow in this repository (CI, Docker, testing, and lifecycle automation) MUST have a complete documentation set covering the six canonical document types:

| Type | Purpose | Local path |
|------|---------|------------|
| **Strategy** | Why / goals / non-goals | `docs/governance/strategies/<id>-strategy.md` |
| **Procedure** | Ordered normative steps | `docs/governance/procedures/<id>-procedure.md` |
| **Playbook** | Guided scenarios / decision branches | `docs/governance/playbooks/<id>-playbook.md` |
| **Runbook** | Ops incident / execution steps | `docs/runbook.md`, `docs/governance/playbooks/*-runbook.md` |
| **Checklist** | Pre/post gates and tick boxes | `docs/governance/checklists/<id>.md` |
| **Test-doc** | Verification and test specifications | `test/` suites + `docs/hathor-guide-039-development-testing-20260916.md` |

## Local Workflow Matrix (HATH0R-POC)

| In-Scope Workflow | Strategy | Procedure | Playbook | Runbook | Checklist | Test-Doc |
|-------------------|----------|-----------|----------|---------|-----------|----------|
| **PR & Branch Promotion** | Tower `strategies/pr-lifecycle-strategy.md` | `docs/governance/pr-workflow.md` | `docs/governance/playbooks/pr-workflow-playbook.md` | `docs/governance/playbooks/release-runbook.md` | `docs/governance/checklists/pr-pre-merge-development.md` | `docs/governance/checklists/pr-pre-promote-testing.md` |
| **SonarCloud Quality Gate** | Tower `strategies/quality-release-strategy.md` | `docs/governance/sonarcloud-quality-gates.md` | `docs/governance/playbooks/sonarcloud-quality-gate-playbook.md` | `docs/runbook.md` | `docs/governance/checklists/sonarcloud-pr-gate.md` | `.github/workflows/sonarcloud-quality-gate.yml` |
| **Semantic Versioning & Release** | Tower `strategies/quality-release-strategy.md` | `docs/governance/semantic-versioning.md` | `docs/governance/playbooks/release-runbook.md` | `docs/governance/playbooks/release-runbook.md` | `docs/governance/checklists/semantic-versioning-checklist.md` | `test/unit/` |
| **POC Web UI & Console Runtime** | `docs/hathor-arch-003-integration-console-architecture-20260916.md` | `docs/hathor-guide-037-getting-started-20260916.md` | `docs/hathor-guide-041-troubleshooting-20260916.md` | `docs/runbook.md` | `docs/governance/checklists/agent-session-start.md` | `test/e2e/console.spec.ts` |
| **Docker Workflow Execution (POC Stack)** | Tower `strategies/docker-group-strategy.md` | Tower `procedures/docker-group-procedure.md` | Tower `playbooks/docker-group-playbook.md` | `docs/runbook.md` | Tower `checklists/docker-group.md` | `cfg/docker/workflows/hath0r-poc-ui.json` |
| **MCP Enablement & Tools** | Tower `strategies/mcp-doc-publish-strategy.md` | `docs/governance/mcp-configuration.md` | `docs/governance/playbooks/mcp-enablement-runbook.md` | `docs/governance/playbooks/mcp-enablement-runbook.md` | `docs/governance/checklists/mcp-enablement-checklist.md` | `src/server/mcp/` |
| **Task Lifecycle (Start / Finish)** | Tower `strategies/task-lifecycle-strategy.md` | Tower `procedures/task-start-procedure.md` | Tower `playbooks/task-lifecycle-playbook.md` | `docs/runbook.md` | `docs/governance/checklists/agent-session-start.md` | `hath0r task start|finish` |

## Enforcement

1. **Agent Session Gate**: Check `docs/governance/checklists/agent-session-start.md` before starting work.
2. **Docs Before Code**: Before scaffolding new features or workflows, ensure the six doc types are identified or authored.
