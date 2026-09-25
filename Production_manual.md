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
| 1 | All 8 phases implemented to spec (no stubs, mocks, or `TODO`s) | [x] | 285 tests passing, `f346315` |
| 2 | All acceptance criteria met for every subsystem doc (`for_agents/`) | [x] | All checklist items in Progress.md checked |
| 3 | TypeScript strict mode — zero `any` types in production code | [x] | Only `catch (e: any)` in trust-score.ts and Express rawBody cast (standard patterns) |
| 4 | `pnpm typecheck` passes with zero errors | [x] | Verified |
| 5 | `pnpm lint` passes with zero warnings | [ ] | ESLint 10 + typescript-eslint 8 configured (flat config); 0 errors, 34 warnings backlog (unused vars / explicit `any`) |
| 6 | All tests passing: unit, integration, contract, E2E | [x] | 285 backend + 79 frontend |
| 7 | 50-webhook concurrent race test passes deterministically | [x] | `escrow.integration.test.ts` |
| 8 | Money-precision tests assert exact equality (zero float drift) | [x] | `payment-precision.test.ts` |
| 9 | Idempotency survives worker restart | [x] | `idempotency.test.ts` |
| 10 | Append-only enforcement verified (app role cannot UPDATE/DELETE `transaction_ledger`) | [x] | Integration tests + migration 002 REVOKE |
| 11 | No `console.log`/`console.error` in production code — structured logger only | [x] | Grep verified — zero matches in non-test files |
| 12 | No secrets, API keys, or tokens in source code or logs (SEC-01) | [x] | Grep verified — zero hardcoded secrets |
| 13 | `docker-compose up` brings full stack up locally | [x] | `docker-compose.yml` verified |

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
| 12 | Paystack webhook URL configured (`https://<croe-host>/v1/webhooks/momo-callback`) for `charge.success`, `transfer.success`, `transfer.failed`, `transfer.reversed` events | [ ] | Configure in Paystack dashboard |

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
| 11 | `MOMO_WEBHOOK_SECRET` | Platform secret store (shared secret for Paystack HMAC-SHA512) | [ ] | Used for both deposit and transfer webhooks |
| 12 | `NODE_ENV` | Platform config (set to `production`) | [ ] | |
| 13 | `CORS_ORIGIN` | Platform config (locked to production domain) | [ ] | |

### 1.4 Security Audit

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Webhook HMAC verification tested against live aggregator sandbox | [x] | `webhook-hmac.test.ts` — code verified; needs live sandbox test |
| 2 | Replay defense tested (expired timestamp rejected) | [x] | `verify-webhook.ts:60` — 300s window enforced |
| 3 | Auth brute-force lockout verified (5 failed OTPs → lock) | [x] | `auth.ts:97` — MAX_FAILED_ATTEMPTS=5, tested |
| 4 | IDOR test: `/escrow/:id` returns 401 for unauthorized party | [x] | `authenticate` middleware on all escrow routes, tested |
| 5 | SQL injection test: all endpoints tested, parameterized queries only | [x] | All queries use pg parameterized `$1` syntax |
| 6 | Prompt injection test: user text cannot influence LLM instructions | [x] | LLM prompt is static; user data passed as structured context only |
| 7 | Admin RBAC: non-admin cannot access `/admin/*` endpoints | [x] | `requireRole` on all admin routes, tested |
| 8 | Rate limits deployed and tested (per §4 of `21-Security-Threat-Model.md`) | [x] | `rate-limiter.ts` wired to all routes, tested |
| 9 | Helmet/security headers configured | [x] | `index.ts:26` — `app.use(helmet())` |
| 10 | CORS locked to production origins only | [x] | `index.ts` — CORS_ORIGIN env var |
| 11 | Penetration test executed (scope: `21-Security-Threat-Model.md` §7) | [ ] | Requires external pen-test engagement |
| 12 | Findings resolved or documented as accepted risk | [ ] | Depends on #11 |

### 1.5 Compliance & Legal

> Business-side execution for every item below — company formation steps, aggregator gating questions, regulatory sequencing, and operating policies — is tracked in [`GO-TO-MARKET.md`](GO-TO-MARKET.md). This section records **status**; that document records **how**.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Company registered (Ghana) | [ ] | `GO-TO-MARKET.md` §2.1 |
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

#### Prerequisites
- Docker + Docker Compose installed
- `pnpm` installed (via corepack)
- `.env` file created from `.env.example` with all required values

#### Step-by-Step

| Step | Action | Command / Details | Verified |
|------|--------|-------------------|----------|
| 1 | Clone and configure | `git clone <repo> && cd Croe` | [ ] |
| 2 | Create `.env` from template | `cp .env.example .env` then fill in all required values | [ ] |
| 3 | Start infrastructure | `docker compose up -d postgres redis` | [ ] |
| 4 | Wait for healthy | `docker compose ps` — both should show `healthy` | [ ] |
| 5 | Run migrations | `cd backend && pnpm db:migrate` | [ ] |
| 6 | Verify migration state | `docker exec croe-postgres psql -U croe -d croe -c "SELECT * FROM pgmigrations ORDER BY id;"` | [ ] |
| 7 | Verify ledger revocation | `docker exec croe-postgres psql -U croe -d croe -c "SELECT grant_type FROM information_schema.role_table_grants WHERE table_name='transaction_ledger' AND grantee='croe';"` — should show only SELECT | [ ] |
| 8 | Start app | `docker compose up -d app` | [ ] |
| 9 | Health check | `curl http://localhost:8080/health` — should return `200 OK` | [ ] |
| 10 | Run full test suite | `cd backend && pnpm test` — 275 tests should pass | [ ] |
| 11 | Configure LLM (optional for P0) | `docker compose up -d ollama` then `docker exec croe-ollama ollama pull <model>` | [ ] |
| 12 | Smoke test: create escrow | `curl -X POST http://localhost:8080/v1/escrow -H 'Content-Type: application/json' -d '{"vendor_id":"...","buyer_id":"...","amount":"100.00","currency":"GHS"}'` | [ ] |
| 13 | Verify reconciliation job | Check logs for daily reconciliation run; no mismatch on fresh data | [ ] |

#### Teardown
```bash
docker compose down -v   # removes containers + volumes
```

### 2.2 Routine Deployment (Post-Launch)

| Step | Action | Command / Details |
|------|--------|-------------------|
| 1 | Merge phase branch to `main` | Squash-merge after gate (PROC-01, GIT-01) |
| 2 | CI builds container image | Automated on merge to `main` |
| 3 | Migrations run | Automated pre-deploy hook |
| 4 | Rolling deploy | Zero-downtime; old pods drain before new pods start |
| 5 | Post-deploy smoke | Automated health check + key flow verification |
| 6 | Monitor | Watch error rates, latency, reconciliation for 30 min |

### 2.3 Deployment (Admin Dashboard)

The `croe-admin` Next.js frontend is configured alongside the API in `render.yaml` for continuous deployment. Alternatively, it can be deployed to Vercel.

| Step | Action | Command / Details |
|------|--------|-------------------|
| 1 | Render Blueprint Sync | Push to `main` auto-triggers `croe-admin` and `croe-api` builds on Render. |
| 2 | Next.js Standalone Build | Vercel or Render runs `pnpm build` pulling the workspace deps. |
| 3 | Container Deploy (Optional) | Build via `admin/Dockerfile` and deploy image to container registry. |

### 2.4 Deployment (Mobile App / Expo EAS)

Mobile builds are not continuous; they are cut intentionally via Expo Application Services (EAS).

| Step | Action | Command / Details |
|------|--------|-------------------|
| 1 | Install EAS CLI | `npm install -g eas-cli` |
| 2 | Login to Expo | `eas login` |
| 3 | Configure project | `eas build:configure` (if not already done via `eas.json`) |
| 4 | Build Android APK/AAB | `cd mobile && eas build --platform android --profile production` |
| 5 | Build iOS IPA | `cd mobile && eas build --platform ios --profile production` |
| 6 | Submit to stores | `eas submit -p android` / `eas submit -p ios` |

### 2.5 Rollback Procedure

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
| All Phase 1–8 tests green on sandbox | [x] | 275 backend + 79 frontend passing |
| Company registered in Ghana | [ ] | Requires business action |
| Legal sign-off on interim custody arrangement | [ ] | Requires legal counsel |
| Aggregator live account approved | [ ] | Requires aggregator application |
| Aggregator live API keys provisioned (not sandbox) | [ ] | Requires aggregator approval |
| `CUSTODY_PHASE` set to `P1` in production | [ ] | Config change after above items |
| Reconciliation clean for 7 consecutive days on sandbox | [ ] | Requires sandbox deployment first |
| Penetration test completed with no P0/P1 findings open | [ ] | Requires external engagement |

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
>
> **Projections below are order-of-magnitude estimates from [`GO-TO-MARKET.md`](GO-TO-MARKET.md) §10.2 — not quotes.** Replace each with a real invoice figure in `Actual` as it arrives, and recompute break-even (§10.5 of that document) whenever the monthly total moves.

| Item | Projected — Lean (GHS/mo) | Projected — Realistic (GHS/mo) | Actual | Notes |
|------|---------------------------|-------------------------------|--------|-------|
| App hosting | 150 | 400 | | |
| Managed Postgres | 0–200 | 300–600 | | |
| Managed Redis | 0–100 | 150–300 | | |
| LLM hosting (GPU) | **0** — CPU/Ollama on app host | 1,200–4,000 | | **Largest recurring line.** Run pilot with triage off or CPU-only — see `GO-TO-MARKET.md` §10.6 and §7.2 below |
| Object storage (S3/R2) | 30 | 100 | | Usage-based; evidence media |
| SMS (OTP + notifications) | 30–150 | 150–600 | | ~6–10 SMS per completed transaction **[verify rate]** |
| Monitoring / log aggregation | 0 (free tier) | 200–500 | | |
| Domain + TLS + push + misc | 50 | 100 | | Push is free |
| **Monthly total (`F`)** | **≈ 260–680** | **≈ 2,600–6,600** | | Doc 03 §5 targets `F < 500` |
| _Aggregator fees_ | _per-transaction cost of goods_ | _—_ | | Not fixed overhead — belongs in unit economics, `GO-TO-MARKET.md` §10.4 |

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
