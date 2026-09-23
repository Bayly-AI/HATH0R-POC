# Runbook: HATHOR POC

> Canonical operations runbook for **HATHOR POC**.  
> Satisfies Hath0r initialization gate **CR-HATH0R-INIT-001**.  
> Tech family: HATHOR POC / agentic integration test bed. Peer reference: `/Users/raybayly/Development/OpenSource/hath0r-mcp/docs/runbook.md`.

---

## 1. Overview

Product workspace initialized on the HATHOR Universal Project Layout (`layout: hathor-upl`).

---

## 2. Prerequisites

- Operator CLI: `hath0r` on PATH (pin 0.2.0)
- Framework checkout: `/Users/raybayly/Development/OpenSource/hath0r`
- Secrets: `/Users/raybayly/Development/.credentials/<service>/.env` (never commit)

---

## 3. Install / bootstrap

```bash
cd /Users/raybayly/Development/OpenSource/hath0r-poc
./bin/hath0r-bootstrap.sh
```

---

## 4. Develop / quality / test / build

```bash
npm install || true
npm test || true
./bin/hath0r-bootstrap.sh
```

---

## 5. Hath0r doctor

```bash
# standalone (default)
./bin/hath0r-bootstrap.sh

# optional suite doctor
export HATH0R_GROUP_ROOT=/Users/raybayly/Development/OpenSource   # or product group root
hath0r doctor
```

---

## 6. Deploy / rollback

Document host-specific deploy/rollback here as the product matures. Prefer sibling peer runbooks when available.

---

## 7. Promotion path (CR-BAI-001)

```text
local → development → testing → staging → master (Production)
```

- Issue first; branch from `development` using `feature|bugfix|.../<issue>-slug`
- Feature PRs target `development` only

---

## 8. Related

| Doc | Role |
|-----|------|
| Setup playbook | `/Users/raybayly/Development/OpenSource/hath0r/docs/developers/hathor-playbook-001-repo-init-setup-20260919.md` |
| `AGENTS.md` | Product identity + agent rules |
| Peer runbook | `/Users/raybayly/Development/OpenSource/hath0r-mcp/docs/runbook.md` |
