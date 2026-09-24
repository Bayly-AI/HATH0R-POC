# AGENTS.md — HATHOR POC

> Role: **Integration test bed for the HATHOR system** · member of **OpenSource Project** (`hath0r-opensource`)  
> Updated: 2026-09-15

## Group membership (CRITICAL)

| Field | Value |
|-------|-------|
| Group | `hath0r-opensource` |
| Project | **OpenSource Project** |
| Group root | `/Users/raybayly/Development/OpenSource` |
| **Control tower** | `/Users/raybayly/Development/OpenSource/HATH0R-CLI` (`Bayly-AI/HATH0R-CLI`) |
| This product | `HATHOR-POC` |
| GitHub | `Bayly-AI/HATH0R-Agentic-POC` |
| Local path | `/Users/raybayly/Development/OpenSource/hath0r-poc` |
| Canonical KB | `/Users/raybayly/Development/OpenSource/.hath0r/knowledgebase` |
| Operator CLI | `hath0r` |
| KB mode | stub |

### Canonical siblings (all under OpenSource are project members)

- **Control tower / CLI**: `/Users/raybayly/Development/OpenSource/HATH0R-CLI` → `Bayly-AI/HATH0R-CLI`
- Framework: `/Users/raybayly/Development/OpenSource/hath0r` → `Bayly-AI/HATH0R-Agentic-Framework`
- POC: `/Users/raybayly/Development/OpenSource/hath0r-poc` → `Bayly-AI/HATH0R-Agentic-POC`

Group rules: `/Users/raybayly/Development/OpenSource/AGENTS.md`  
Group policy: `/Users/raybayly/Development/OpenSource/WARP.md`

## Framework hidden root (CRITICAL — cr-hath0r-root-001)

Use **only** `.hath0r/` for framework-created / modified / saved project metadata (including this repo’s KB stub).

Do **not** use `.ai/`, `.aegis/`, or `.infraOS/`.

## Knowledgebase (CRITICAL — cr-kb-tower-001)

1. Point local knowledgebase operations at the OpenSource group hub.
2. Keep `.hath0r/knowledgebase` as stub/pointer only (see README there).
3. Resolve control-tower / suite orientation to **HATH0R-CLI**.
4. Framework `docs/` is the **canonical OpenSource documentation** corpus.
5. Do **not** treat private internal product trees as OpenSource canonical sources.

## Branch & PR targets (CRITICAL — cr-branch-gov-001)

1. **Issue first**: create a GitHub issue before any work branch. No issue → no branch.
2. Branch from `development` only, using:
   `feature|bugfix|enhancement|research|fix|chore/<issue-number>-short-slug`
   Example: `chore/3-control-tower-cli`
3. Open the PR with **base = `development`** (feature work never targets testing/staging/master).
4. **Owner approval required** before merge (`@somesayray` via CODEOWNERS + branch protection).
5. Merge into **`development` only** for feature work.
6. Promote via `development → testing → staging → master` — do not skip stages.

### Canonical branches (locked)

`development` (default), `testing`, `staging`, `master`

- Must not be deleted
- Must not be used as feature/work branches
- Must not be merged into each other except along the promotion path above
- Branch protection: PR required, 1 approving review, code-owner review, no force-push, no deletions, `validate-promotion-path` required

Forbidden: feature PRs targeting `master`, `testing`, or `staging`; PRs without an issue number in the branch name; merging canonical branches sideways.

## Config pointers in this repo

- `cfg/suite.yaml`
- `cfg/knowledge-tower.yaml`
- `.hath0r/knowledgebase/README.md`

## CR-BAI-001: Environment Promotion Path (CRITICAL — org-wide)

Canonical policy: `/Users/raybayly/Development/BAI/WARP.md` (org-wide). Group mirror: `/Users/raybayly/Development/OpenSource/WARP.md`.

Required order (never skip):

```text
local → development → testing → staging → master (Production)
```

CI enforcement: `.github/workflows/enforce-promotion-path.yml`

- PRs into `testing` must come from `development`
- PRs into `staging` must come from `testing`
- PRs into `master` must come from `staging`
- Each stage needs deploy + URL validation before the next promote

## Credentials

`/Users/raybayly/Development/.credentials/<service>/.env` — never hardcode or print secrets.


## CR-HATH0R-INIT-001: Hath0r repo initialization entry gate (CRITICAL — org-wide)

Before initializing (or re-initializing) any repository with Hath0r, agents MUST:

1. **Setup playbook** — Follow the canonical playbook:
   - `/Users/raybayly/Development/OpenSource/hath0r/docs/developers/hathor-playbook-001-repo-init-setup-20260919.md`
   - Mirror: `/Users/raybayly/Development/OpenSource/hathor-cli/docs/hathor-playbook-001-repo-init-setup-20260919.md`
2. **Same-technology runbook** — Use this repo's `docs/runbook.md` (or a same-stack peer runbook).
3. Only then apply fileset/layout, `.hath0r/`, `cfg/`, contracts pin, `AGENTS.md` identity, and `./bin/hath0r-bootstrap.sh`.

Do not skip the playbook/runbook gate. Layout scaffolding without a documented ops path is incomplete initialization.

Operator CLI: `hath0r` (pin 0.2.0). Hidden root: **only** `.hath0r/` (never `.ai/`, `.aegis/`, `.infraOS/`).
Runbook: [`docs/runbook.md`](docs/runbook.md)


## Branch rules (pointer)

See `docs/governance/branch-rules.md` (cr-branch-gov-001 / CR-BAI-001). Work PRs → `development` only; release trains use `release/x.x.x`.
