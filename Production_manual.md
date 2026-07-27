# Croe — Production Manual

> **Living document.** This is the single source of truth for everything required to take Croe from development to 100% production readiness. Every section MUST be kept current as development progresses — if a new dependency, secret, service, or compliance requirement is discovered during implementation, it goes here immediately (rule PROC-03). Do not treat this as a post-development artifact; it is built alongside the code.

---

## How to Use This Manual

1. **During development:** Update the relevant section whenever you add a service, endpoint, secret, dependency, migration, or deployment step. If you discover a new production requirement, create or expand a section.
2. **Before each phase gate:** Walk through the checklist for that phase's subsystems. Every item must be checked and evidence-linked.
3. **Before go-live:** Complete the full Pre-Production Audit (§1) end-to-end. No shortcuts.
4. **After go-live:** Record incidents, lessons learned, and config changes in §10 (Post-Launch Log).

---

## 1. Pre-Production Audit

> Complete every checkbox before any real user touches the system. Evidence links go in the `Notes` column.

### 1.1 Code Readiness

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | All 8 phases implemented to spec (no stubs, mocks, or `TODO`s) | [ ] | |
| 2 | All acceptance criteria met for every subsystem doc (`for_agents/`) | [ ] | |
| 3 | TypeScript strict mode — zero `any` types in production code | [ ] | |
| 4 | `pnpm typecheck` passes with zero errors | [ ] | |
| 5 | `pnpm lint` passes with zero warnings | [ ] | |
| 6 | All tests passing: unit, integration, contract, E2E | [ ] | |
| 7 | 50-webhook concurrent race test passes deterministically | [ ] | |
| 8 | Money-precision tests assert exact equality (zero float drift) | [ ] | |
| 9 | Idempotency survives worker restart | [ ] | |
| 10 | Append-only enforcement verified (app role cannot UPDATE/DELETE `transaction_ledger`) | [ ] | |
| 11 | No `console.log`/`console.error` in production code — structured logger only | [ ] | |
| 12 | No secrets, API keys, or tokens in source code or logs (SEC-01) | [ ] | |
| 13 | `docker-compose up` brings full stack up locally | [ ] | |

### 1.2 Infrastructure Readiness

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Production PostgreSQL 16 provisioned | [ ] | |
| 2 | Production Redis 7.2 provisioned | [ ] | |
| 3 | Object storage (S3/R2) provisioned for evidence media | [ ] | |
| 4 | LLM hosting provisioned (vLLM on dedicated box) | [ ] | |
| 5 | DNS configured for `<croe-host>` | [ ] | |
| 6 | TLS certificate provisioned and auto-renewing | [ ] | |
| 7 | CDN/reverse proxy configured (Cloudflare, nginx, etc.) | [ ] | |
| 8 | CI/CD pipeline running: typecheck → lint → test → build → migrate → deploy | [ ] | |
| 9 | Automated daily Postgres backups configured with PITR | [ ] | |
| 10 | Object storage versioning enabled for evidence | [ ] | |
| 11 | Log aggregation configured (structured JSON → external store) | [ ] | |

### 1.3 Secrets & Configuration

> Every secret must be in the platform secret store — never in code, CI logs, or git.

| # | Secret | Location | Rotated | Notes |
|---|--------|----------|---------|-------|
| 1 | `DATABASE_URL` | Platform secret store | [ ] | |
| 2 | `REDIS_URL` | Platform secret store | [ ] | |
| 3 | `MOMO_WEBHOOK_SECRET` | Platform secret store | [ ] | |
| 4 | `JWT_SECRET` | Platform secret store | [ ] | |
| 5 | `OTP_PEPPER` | Platform secret store | [ ] | |
| 6 | `AGGREGATOR_API_KEY` | Platform secret store | [ ] | |
| 7 | `AGGREGATOR_BASE_URL` | Platform secret store | [ ] | |
| 8 | `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Platform secret store | [ ] | |
| 9 | `LLM_URL` / `LLM_MODEL` | Platform secret store | [ ] | |
| 10 | `CUSTODY_PHASE` | Platform secret store (set to `P1` for pilot) | [ ] | |
| 11 | `NODE_ENV` | Platform config (set to `production`) | [ ] | |
| 12 | `CORS_ORIGIN` | Platform config (locked to production domain) | [ ] | |

### 1.4 Security Audit

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Webhook HMAC verification tested against live aggregator sandbox | [ ] | |
| 2 | Replay defense tested (expired timestamp rejected) | [ ] | |
| 3 | Auth brute-force lockout verified (5 failed OTPs → lock) | [ ] | |
| 4 | IDOR test: `/escrow/:id` returns 401 for unauthorized party | [ ] | |
| 5 | SQL injection test: all endpoints tested, parameterized queries only | [ ] | |
| 6 | Prompt injection test: user text cannot influence LLM instructions | [ ] | |
| 7 | Admin RBAC: non-admin cannot access `/admin/*` endpoints | [ ] | |
| 8 | Rate limits deployed and tested (per §4 of `21-Security-Threat-Model.md`) | [ ] | |
| 9 | Helmet/security headers configured | [ ] | |
| 10 | CORS locked to production origins only | [ ] | |
| 11 | Penetration test executed (scope: `21-Security-Threat-Model.md` §7) | [ ] | |
| 12 | Findings resolved or documented as accepted risk | [ ] | |

### 1.5 Compliance & Legal

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Company registered (Ghana) | [ ] | |
| 2 | Legal sign-off on interim custody arrangement (P1) | [ ] | |
| 3 | Aggregator live account approved and funded | [ ] | |
| 4 | All `[verify]` regulatory figures confirmed with legal counsel | [ ] | |
| 5 | Data Protection Act compliance verified | [ ] | |
| 6 | KYC thresholds confirmed with BoG or legal counsel | [ ] | |
| 7 | Commission rates confirmed with aggregator | [ ] | |
| 8 | Privacy policy published | [ ] | |
| 9 | Terms of service published | [ ] | |

---

## 2. Deployment Procedures

### 2.1 First-Time Deployment (P0 → P1)

| Step | Action | Command / Details | Verified |
|------|--------|-------------------|----------|
| 1 | Provision production database | PostgreSQL 16, create `croe` database and `app_user` role | [ ] |
| 2 | Run migrations | `pnpm db:migrate` | [ ] |
| 3 | Verify migration state | Check `pgmigrations` table for applied migrations | [ ] |
| 4 | Seed production data | `custody_accounts` P1 row (one per currency: GHS) | [ ] |
| 5 | Verify ledger revocation | `REVOKE UPDATE, DELETE ON transaction_ledger FROM app_user` | [ ] |
| 6 | Provision Redis | Redis 7.2, confirm connectivity | [ ] |
| 7 | Deploy API service | Build + deploy container; verify health endpoint | [ ] |
| 8 | Configure webhook URL in aggregator dashboard | Point to `https://<croe-host>/v1/webhooks/momo-callback` | [ ] |
| 9 | Send test webhook from aggregator sandbox | Verify HMAC verification + 200 ACK | [ ] |
| 10 | Configure LLM endpoint | Pin model id; verify inference < 5s | [ ] |
| 11 | Smoke test: full escrow lifecycle | Create → deposit → ship → confirm → release | [ ] |
| 12 | Smoke test: dispute flow | Open dispute → heuristics pass → LLM triage → resolution | [ ] |
| 13 | Verify reconciliation job runs | Daily job executes; no mismatch on fresh data | [ ] |
| 14 | Verify alerts fire | Page on reconciliation mismatch, webhook failure, high error rate | [ ] |
| 15 | Deploy React Native app | Submit to app stores / OTA update | [ ] |

### 2.2 Routine Deployment (Post-Launch)

| Step | Action | Command / Details |
|------|--------|-------------------|
| 1 | Merge phase branch to `main` | Squash-merge after gate (PROC-01, GIT-01) |
| 2 | CI builds container image | Automated on merge to `main` |
| 3 | Migrations run | Automated pre-deploy hook |
| 4 | Rolling deploy | Zero-downtime; old pods drain before new pods start |
| 5 | Post-deploy smoke | Automated health check + key flow verification |
| 6 | Monitor | Watch error rates, latency, reconciliation for 30 min |

### 2.3 Rollback Procedure

| Step | Action | Command / Details |
|------|--------|-------------------|
| 1 | **Stop traffic** (if critical) | Scale down or route to maintenance page |
| 2 | **Revert container** | Deploy previous known-good image tag |
| 3 | **Rollback migration** (if schema changed) | `pnpm db:migrate:down` — ONLY if the migration is backward-compatible. If not, do not roll back the migration; fix forward. |
| 4 | **Verify** | Smoke test the rolled-back version |
| 5 | **Notify** | Log incident in §10; page on-call if money movement affected |
| 6 | **Root cause** | Document and fix before re-deploying |

> **NEVER roll back a migration that has written to `transaction_ledger`.** Ledger writes are append-only and idempotent; roll back application code, not the ledger.

---

## 3. Monitoring & Alerting

### 3.1 Health Checks

| Endpoint | Frequency | Expected | Alert if |
|----------|-----------|----------|----------|
| `GET /health` | Every 30s | `200 OK` | Down for > 2 min |
| `GET /health/db` | Every 30s | `200 OK` (pool stats) | Connection pool > 80% utilized |
| `GET /health/redis` | Every 60s | `200 OK` | Latency > 10ms |

### 3.2 Business Metrics (from `01-PRD.md` and `23-Observability-and-Reconciliation.md`)

| Metric | Target | Alert threshold | Alert channel |
|--------|--------|-----------------|---------------|
| Auto-resolution rate | ≥ 80% | < 70% over 24h | Pager |
| Median dispute resolution time | < 10s | > 30s over 1h | Pager |
| Double-spend incidents | Exactly 0 | Any occurrence | Page + freeze |
| False-positive fraud lockouts | < 0.5% | > 1% over 7d | Slack |
| Webhook ACK latency (p99) | < 500ms | > 500ms for 5 min | Pager |
| Heuristic execution time (p99) | < 50ms | > 50ms for 1h | Slack |
| LLM inference time (p99) | < 5s | > 5s for 1h | Slack |

### 3.3 Technical Metrics

| Metric | Target | Alert threshold |
|--------|--------|-----------------|
| API error rate (5xx) | < 0.1% | > 1% over 5 min |
| API latency (p99) | < 1s | > 2s for 5 min |
| Database connection pool utilization | < 80% | > 80% sustained |
| Redis memory usage | < 70% | > 80% |
| Disk usage (DB) | < 70% | > 80% |
| Container restart count | 0 | Any restart |

### 3.4 Alert Routing

| Severity | Response time | Channel | Examples |
|----------|---------------|---------|----------|
| **P0 — Critical** | Immediate | Pager + Slack + SMS | Double-spend, money loss, total outage |
| **P1 — High** | < 15 min | Pager + Slack | Reconciliation mismatch, webhook failures, auth down |
| **P2 — Medium** | < 1 hour | Slack | Elevated error rates, slow LLM, disk warnings |
| **P3 — Low** | Next business day | Slack | Non-critical alerts, capacity warnings |

---

## 4. Incident Response

### 4.1 Money-Loss Incident (P0)

| Step | Action |
|------|--------|
| 1 | **Immediately freeze all disbursements** — set `CUSTODY_PHASE` to sandbox or halt payout workers |
| 2 | **Preserve evidence** — export relevant `transaction_ledger` rows, `webhook_inbox` entries, logs |
| 3 | **Notify** — page legal, compliance, and leadership |
| 4 | **Assess scope** — how many transactions affected, total amount at risk |
| 5 | **Reconcile** — compare pooled balance vs. sub-ledger vs. aggregator statement |
| 6 | **Resolve** — fix root cause, do not resume until verified |
| 7 | **Report** — file with aggregator, regulator (if required), and internal post-mortem |

### 4.2 Reconciliation Mismatch (P1)

| Step | Action |
|------|--------|
| 1 | **Freeze new disbursements** (automated by reconciliation job) |
| 2 | **Investigate** — compare pooled balance, sub-ledger sum, and aggregator statement line by line |
| 3 | **Identify discrepancy** — missing ledger entry, double-write, or aggregator error |
| 4 | **Correct** — append corrective ledger entries (never UPDATE the ledger) |
| 5 | **Resume** — only after reconciliation is clean and verified |

### 4.3 Security Breach (P0)

| Step | Action |
|------|--------|
| 1 | **Rotate all secrets immediately** — webhook HMAC, JWT signing key, OTP pepper, DB password |
| 2 | **Revoke all active sessions** — `UPDATE auth_sessions SET revoked_at = NOW()` |
| 3 | **Freeze affected accounts** |
| 4 | **Investigate** — scope, entry point, data accessed |
| 5 | **Notify** — legal, compliance, affected users (if PII exposed) |
| 6 | **Remediate** — fix vulnerability, re-deploy |

---

## 5. Backup & Disaster Recovery

### 5.1 Backup Schedule

| Component | Method | Frequency | Retention | Test |
|-----------|--------|-----------|-----------|------|
| PostgreSQL | Automated dump + PITR | Daily (continuous WAL archiving) | 30 days | Monthly restore test |
| Redis | RDB snapshots + AOF | Every 6 hours (RDB), continuous (AOF) | 7 days | Quarterly restore test |
| Object storage (S3/R2) | Versioning + cross-region replication | Continuous | 90 days version history | Quarterly restore test |

### 5.2 Recovery Procedures

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Database corruption | < 1 hour | < 5 min (PITR) | Restore from latest PITR snapshot; replay WAL to point of failure |
| Complete DB loss | < 4 hours | < 24 hours (daily backup) | Provision new instance, restore from daily dump, apply WAL |
| Object storage loss | < 2 hours | < 1 hour | Restore from cross-region replica; evidence hashes verified |
| Full region outage | < 8 hours | < 1 hour | Restore DB + object storage in alternate region; re-deploy API |

### 5.3 Ledger as Source of Truth

> If anything is inconsistent, the `transaction_ledger` wins. It is append-only, immutable, and the financial source of truth. Never delete or modify ledger rows — append corrections as new entries.

---

## 6. Custody Phase Transitions

### 6.1 P0 → P1 (Pilot Launch)

| Prerequisite | Verified |
|--------------|----------|
| All Phase 1–8 tests green on sandbox | [ ] |
| Company registered in Ghana | [ ] |
| Legal sign-off on interim custody arrangement | [ ] |
| Aggregator live account approved | [ ] |
| Aggregator live API keys provisioned (not sandbox) | [ ] |
| `CUSTODY_PHASE` set to `P1` in production | [ ] |
| Reconciliation clean for 7 consecutive days on sandbox | [ ] |
| Penetration test completed with no P0/P1 findings open | [ ] |

### 6.2 P1 → P2 (Partner-Held)

| Prerequisite | Verified |
|--------------|----------|
| Licensed partner trust account agreement signed | [ ] |
| Partner trust account funded | [ ] |
| `CustodyProvider` P2 implementation tested | [ ] |
| `CUSTODY_PHASE` switched to `P2` (config-only, no code change) | [ ] |
| Reconciliation clean for 30 consecutive days | [ ] |
| Regulatory notification filed (if required) | [ ] |

### 6.3 P2 → P3 (Own Licence)

| Prerequisite | Verified |
|--------------|----------|
| BoG EPSP/DEMI licence approved | [ ] |
| Own trust account established | [ ] |
| `CustodyProvider` P3 implementation tested | [ ] |
| `CUSTODY_PHASE` switched to `P3` | [ ] |
| All regulatory filings current | [ ] |

---

## 7. Runbooks

### 7.1 High Error Rate

1. Check API logs for the error pattern (structured JSON, correlation IDs)
2. Identify the failing endpoint and error code
3. If DB-related: check connection pool, slow queries, locks
4. If external service: check aggregator/LLM status pages
5. If code bug: revert to last known-good deploy (§2.3)
6. If sustained > 5 min: page on-call

### 7.2 Slow LLM Inference

1. Check Ollama/vLLM service health and GPU utilization
2. Check if model is loaded in memory (cold start vs. hot)
3. Check input size — ensure pre-captioning pipeline is not passing raw images
4. If sustained: restart LLM service; if recurring, consider model upgrade
5. Disputes queue during outage: all route to `UNDER_HUMAN_REVIEW` (graceful degradation)

### 7.3 Webhook Flooding

1. Check Redis rate-limit counters for the webhook endpoint
2. Verify the fast-200 rule is working (< 500ms ACK)
3. If legitimate flood: check aggregator for retry loops
4. If attack: temporary IP block at CDN/reverse proxy level
5. Verify `webhook_inbox` dedup is catching duplicates

### 7.4 Database Full

1. Check disk usage and growth trend
2. Identify largest tables (likely `transaction_ledger` or `notifications`)
3. Run retention/deletion job for expired data (per `23-Observability-and-Reconciliation.md`)
4. If `transaction_ledger`: archive old rows to cold storage (never delete)
5. Scale disk if growth is expected

---

## 8. Cost Tracking

> Track actual costs against projections from `03-Business-Model-and-Costs.md`. Update this section monthly.

| Item | Projected (P1) | Actual | Notes |
|------|----------------|--------|-------|
| Managed Postgres | | | |
| Managed Redis | | | |
| LLM hosting (GPU) | | | |
| Object storage (S3/R2) | | | |
| SMS (OTP + notifications) | | | |
| Aggregator fees | | | |
| Domain + TLS | | | |
| **Monthly total** | | | |

---

## 9. Operational Contacts

| Role | Name | Contact | On-call |
|------|------|---------|---------|
| Engineering lead | _[fill in]_ | | |
| On-call engineer | _[fill in]_ | | |
| Legal counsel | _[fill in]_ | | |
| Compliance officer | _[fill in]_ | | |
| Aggregator support | _[fill in]_ | | |
| Infrastructure provider | _[fill in]_ | | |

---

## 10. Post-Launch Log

> Record every incident, deployment, config change, and lesson learned here. Date-stamp everything.

| Date | Type | Summary | Resolution | Severity |
|------|------|---------|------------|----------|
| _—_ | _—_ | _No entries yet_ | | |

---

## 11. Definition of "100% Production Ready"

Croe is 100% production ready when ALL of the following are true:

1. **Code:** All 8 phases implemented, tested, and verified end-to-end (§1.1)
2. **Infrastructure:** Production services provisioned, configured, and monitored (§1.2)
3. **Secrets:** All secrets in platform secret store, rotated, and verified (§1.3)
4. **Security:** Penetration test passed with no open P0/P1 findings (§1.4)
5. **Compliance:** Legal sign-off, company registered, aggregator live (§1.5)
6. **Deployment:** CI/CD pipeline running, rollback tested (§2)
7. **Monitoring:** All business and technical metrics alerting (§3)
8. **Incident response:** Runbooks tested, on-call schedule active (§4)
9. **Backups:** Automated, tested, and verified (§5)
10. **Custody:** Appropriate custody phase activated (§6)
11. **Costs:** Actual costs within 20% of projections (§8)
12. **Team:** At least one person trained on every runbook (§9)
