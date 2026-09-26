# Croe Production Readiness — Deep Plan

> Generated 2026-09-21. Based on `Production_manual.md`, `GO-TO-MARKET.md`, `Progress.md`, and current codebase state.

---

## Current State Summary

| Area | Status | Gap |
|------|--------|-----|
| **Code** | ⚠️ Partial | CI green since 2026-09-26 (backend 410, mobile 81, admin 24 tests; TypeScript strict). Not "zero mocks": payout MSISDN placeholders, hard-coded buyer MoMo number, unresolvable pay links, missing authz and timers. Engineering work to M2 is tracked in [`task.md`](task.md) |
| **Infrastructure** | ❌ 0/11 | No production Postgres, Redis, Object Storage, LLM hosting, DNS, TLS, CDN, CI/CD, Backups, Log aggregation |
| **Secrets** | ❌ 0/12 | All secrets in local `.env`, not in platform secret store |
| **Security** | ⚠️ Partial | Penetration test not executed (P1 item) |
| **Compliance/Legal** | ❌ 0/9 | No company, no aggregator approval, no legal sign-off, no ToS/Privacy Policy |
| **Business Ops** | ❌ 0/7 roles, 0/7 SOPs | No named owners for L3 reviewer, KYC approver, Reconciliation operator, etc. |
| **Distribution** | ❌ 0/8 | No Apple/Google developer accounts, no SMS sender ID, no app store submissions |

---

## Critical Path Dependencies (Must Resolve First)

```
┌─────────────────────────────────────────────────────────────────┐
│  GATING QUESTION: Will an aggregator allow escrow model?       │
│  (Paystack GH / Hubtel / Flutterwave — written answers needed) │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  LEGAL ENTITY: Company registration + TIN + Corporate Bank     │
│  (Required for aggregator KYB, app store publishing)           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    Aggregator    Production    App Store
    Live Account  Infra         Accounts
    (Sandbox→Live) (Postgres,    (Apple/Google
                 Redis, R2,      under company)
                 DNS, TLS)
```

---

## Phased Execution Plan

### Phase A: Existential Validation (Weeks 1-2) — **BLOCKING**

| # | Action | Owner | Evidence |
|---|--------|-------|----------|
| A1 | Email all 3 aggregators with §1 questionnaire (GO-TO-MARKET.md) | Founder | Written responses in GO-TO-MARKET.md §1 outcome table |
| A2 | Book fintech lawyer consultation | Founder | Engagement letter |
| A3 | Start ORC company registration + TIN (background) | Founder | Registration certificate |
| A4 | Record: **Is P1 viable?** (Go/No-Go) | Founder | Decision in GO-TO-MARKET.md |

**Exit Criteria**: Aggregator explicitly permits delayed-settlement/escrow model in writing.

---

### Phase B: Entity & Compliance Foundation (Weeks 3-8) — **PARALLEL**

| # | Action | Owner | Evidence |
|---|--------|-------|----------|
| B1 | Corporate bank account application | Founder | Bank confirmation |
| B2 | Data Protection Commission registration (Act 843) | Lawyer | DPC certificate |
| B3 | Lawyer-drafted ToS + Privacy Policy | Lawyer | Published URLs |
| B4 | BoG registration category confirmed (PFTSP?) | Lawyer | Written opinion |
| B5 | KYC thresholds confirmed against BoG/partner | Lawyer | Updated 09-KYC-and-AML.md |
| B6 | Hand-recruit 10-20 pilot vendors | Founder | Signed commitment letters |

---

### Phase C: Production Infrastructure (Weeks 3-8) — **PARALLEL**

| # | Item | Target | Notes |
|---|------|--------|-------|
| C1 | Managed PostgreSQL 16 (Supabase/Neon/Cloud SQL) | Provisioned | PITR enabled, 30-day retention |
| C2 | Managed Redis 7.2 (Upstash/Redis Cloud) | Provisioned | RDB+AOF, 7-day retention |
| C3 | Object Storage (Cloudflare R2 / S3) | Provisioned | Versioning + cross-region replication |
| C4 | LLM Hosting (vLLM on GPU box or CPU/Ollama) | Provisioned | **Run pilot CPU-only per cost discipline** |
| C5 | DNS + TLS (Cloudflare) | Configured | Auto-renewing certs |
| C6 | CI/CD Pipeline (GitHub Actions → Render/Railway/Fly) | ⚠️ CI green; deploy not wired | Typecheck → Lint → Test → Build → Docker verified. Staging services and deploy hooks not set up yet (task.md T3.8, T3.9) |
| C7 | Log Aggregation (Pino → Loki/Better Stack/Datadog) | Configured | Structured JSON |
| C8 | Daily Postgres Backups + PITR | Verified | Monthly restore test scheduled |

---

### Phase D: Secrets & Security (Weeks 6-10)

| # | Action | Status |
|---|--------|--------|
| D1 | Move all 12 secrets to platform secret store (Render/Vercel/AWS Secrets Manager) | [ ] |
| D2 | Rotate all secrets post-migration | [ ] |
| D3 | External penetration test (scope: 21-Security-Threat-Model.md §7) | [ ] |
| D4 | Close all P0/P1 findings | [ ] |

---

### Phase E: Distribution Plumbing (Weeks 6-10)

| # | Action | Notes |
|---|--------|-------|
| E1 | Apple Developer Program (company entity) | Financial app scrutiny — budget 2-6 weeks |
| E2 | Google Play Developer (company entity) | Financial services declaration |
| E3 | SMS Sender ID registration (via Arkesel/NCA) | Days to weeks |
| E4 | App Store submissions (iOS + Android) | Under company account |
| E5 | Landing page + company email domain | Aggregator/app store reviewers check |

---

### Phase F: Operational Readiness (Weeks 8-12)

| Role | Named Owner | Backup | Trained on Runbooks |
|------|-------------|--------|---------------------|
| L3 Dispute Reviewer | [ ] | [ ] | [ ] |
| KYC Approver | [ ] | [ ] | [ ] |
| Reconciliation Operator | [ ] | [ ] | [ ] |
| Payout Failure Handler | [ ] | [ ] | [ ] |
| Support | [ ] | [ ] | [ ] |
| On-call Engineer | [ ] | [ ] | [ ] |
| Commission Sweep/Bookkeeping | [ ] | [ ] | [ ] |

**Operating Documents to Author:**
1. Dispute Adjudication Policy
2. KYC Review SOP
3. Refund & Goodwill Policy
4. Vendor Onboarding & Acceptance Criteria
5. Fraud Response Playbook
6. Escalation Ladder & Contact Tree
7. Support Macros / Response Templates

---

### Phase G: Supervised P1 Pilot (Weeks 10-14)

| Gate | Criteria | Status |
|------|----------|--------|
| G1 | All P0→P1 gates in Production_manual.md §6.1 satisfied | [ ] |
| G2 | `CUSTODY_PHASE=P1` in production | [ ] |
| G3 | Transaction-size caps set low | [ ] |
| G4 | Interim custody disclosed in-app | [ ] |
| G5 | Reconciliation reviewed manually daily (30 days) | [ ] |
| G6 | Every dispute personally adjudicated + logged | [ ] |

**Pilot Success Metrics (from GO-TO-MARKET.md §5):**
- Released txns/month: ≥ 63 (break-even)
- Net margin/txn: ≥ 8.00 GHS (verify with real fees)
- Dispute rate: < 8%
- Adjudication accuracy: > 95%
- Buyer drop-off at payment: < 30%
- Vendor retention (day 60): > 60%
- Reconciliation mismatches: 0

---

## Budget Reality Check

| Tier | Setup + 3mo + Float | Key Driver |
|------|---------------------|------------|
| **Bootstrap** | GHS 15,000–30,000 (~$1,200–2,500) | Self-filed, lean infra, LLM off, pen test deferred |
| **Recommended** | GHS 60,000–185,000 (~$5,000–15,000) | Proper legal, pen test, real infra |

**Largest recurring cost**: LLM hosting (GHS 1,200–4,000/mo). **Decision**: Run pilot with AI triage OFF (CPU-only Ollama on app host) — disputes route to `UNDER_HUMAN_REVIEW`. Enable GPU when volume justifies.

**Break-even sensitivity**: At GHS 500/mo fixed cost → 63 txns. At GHS 6,000/mo (with GPU) → 750 txns. **Infrastructure choices matter more than pricing.**

---

## Immediate Next Steps (This Week)

1. **Send aggregator questionnaires** (3 emails, template in GO-TO-MARKET.md §1) — **highest leverage, $0 cost**
2. **Book fintech lawyer** — highest-value spend
3. **Apply for cloud credits** (Microsoft Founders Hub, AWS Activate, GCP, DigitalOcean Hatch) — zeros infra line including GPU
4. **Start ORC registration** (background, cheap, slow)
5. **Update GO-TO-MARKET.md §1 outcome table** as responses arrive

---

## Definition of "Production Ready" (Both Manuals Must Be Green)

**Production_manual.md §11** — 12/12 items:
- [ ] Code, [ ] Infra, [ ] Secrets, [ ] Security, [ ] Compliance, [ ] Deployment, [ ] Monitoring, [ ] Incident Response, [ ] Backups, [ ] Custody, [ ] Costs, [ ] Team

**GO-TO-MARKET.md §9** — 12/12 items:
- [ ] Aggregator, [ ] Entity, [ ] Legal, [ ] Regulatory, [ ] Treasury, [ ] Distribution, [ ] Demand, [ ] Ops, [ ] Policy, [ ] Finance, [ ] System, [ ] Custody

---

## Risk Register (Top 3 Existential)

| Risk | Mitigation | Owner |
|------|------------|-------|
| Aggregator refuses escrow model | Answer in Week 1 before any spend | Founder |
| P1 legally thin (interim custody) | Low volumes, user disclosure, continuous P2 movement | Founder + Lawyer |
| Margin inverts (real payout fees > assumed) | Confirm fees in writing; set min txn size / floor fee | Founder |

---

## Recommended Tooling for Tracking

1. **Production_manual.md** — Technical readiness (already structured)
2. **GO-TO-MARKET.md** — Business readiness (already structured)  
3. **Progress.md** — Implementation progress (already current)
4. **Weekly sync** — Update both manuals, recompute break-even when real quotes arrive

---

## Bottom Line

The code is production-grade. The business is not. The critical path is **aggregator approval → company registration → lawyer sign-off → production infra**. Everything else runs in parallel. Budget GHS 15-30k bootstrap to supervised pilot; GHS 60-185k recommended.