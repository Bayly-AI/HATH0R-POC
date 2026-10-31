# Changelog

All notable changes to **HATH0R POC** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-31

### Added

- **`CR-CLI-ENTRY-001` & `CR-FEATURE-WORKFLOW-STANDARD-001` Governance & `hath0r-net` Phoenix/MLflow/Cruise Control OTel Alignment** (#105):
  - Codified `CR-CLI-ENTRY-001` and `CR-FEATURE-WORKFLOW-STANDARD-001` (Every Feature is a Service run by `>= 1` Bot, Level 1 `HATH0R-MCP` & Level 2 `HATH0R-CLI`/Bot Memory on `AgentGraph`, Workflow-First Missing-Workflow Offer, and 4-hour pre-task auto-calibration) in `AGENTS.md` and synchronized `CLAUDE.md` 1:1.
  - Updated `cfg/observability/otel.json` to target `http://localhost:38000/phoenix` (`Hath0r-phoenix:6006`), `Hathor-MLFLOW` (`http://localhost:38000/mlflow/`), and `Hath0r-Cruise-Control` (`http://localhost:38000/cruise/radar`) so `hath0r arch verify --fleet` passes `5/5` across all suite repositories.

## [0.2.9] - 2026-10-29

### Changed

- **Rule Harmonization, `CLAUDE.md` 1:1 Sync & Workflow Upgrade (`CR-CLAUDE-SYNC-001` · `CR-AGENTIC-SEC-001`)**:
  - Removed conflicting legacy SemVer (`or none`) and duplicate Hyper Context Pointers in `AGENTS.md`, added `CR-CLI-ENTRY-001`, `CR-CLAUDE-SYNC-001`, `CR-AGENTIC-SEC-001`, and `CR-MEMORY-COMPOUND-001`, synchronized `CLAUDE.md` 1:1 with `AGENTS.md`, initialized `THREATMODEL.md`, and updated `.agents/skills/clean-repos/SKILL.md` and `.agents/skills/orient/SKILL.md`.

## [0.2.8] - 2026-10-28

### Added

- **Automatic Task Evaluation Configuration (`CR-TASK-EVAL-001`)**: Added declarative `cfg/evals/task-eval.json` binding `HATH0R-POC` to `TaskEvaluatorBot` (`hath0r evals run`) and `.hath0r/evals/` gitignore negation rules (#103).

## [0.2.7] - 2026-10-28

### Added

- CR-SEMVER-BUMP-001: every created or merged PR must create or bump the product's Semantic Version (`VERSION` is the source of truth).

## [0.2.6] - 2026-10-28

### Changed

- Added `CR-SONAR-PREANNOUNCE-001` to the agent instructions: confirm SonarCloud Quality Gate thresholds before announcing work Complete.
