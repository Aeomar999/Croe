# Croe Production Readiness — Comprehensive Task List

> **114 tasks** organized across 7 phases (A-G) plus ongoing funding activities and code quality maintenance.
> Generated from `PRODUCTION_READINESS_PLAN.md` and living documents.
> **Last updated:** 2026-09-21

---

## Phase A: Existential Validation (Weeks 1-2) — **BLOCKING**

*Must complete before any other spend. Aggregator must explicitly permit escrow/delayed-settlement model.*

| # | Task | Owner | Status | Evidence |
|---|------|-------|--------|----------|
| A1 | Send aggregator questionnaire to Paystack GH | Founder | [ ] | Written response in GO-TO-MARKET.md §1 |
| A2 | Send aggregator questionnaire to Hubtel | Founder | [ ] | Written response in GO-TO-MARKET.md §1 |
| A3 | Send aggregator questionnaire to Flutterwave | Founder | [ ] | Written response in GO-TO-MARKET.md §1 |
| A4 | Book fintech lawyer consultation | Founder | [ ] | Engagement letter |
| A5 | Start ORC company registration + TIN application | Founder | [ ] | Registration certificate |
| A6 | Record P1 viability decision in GO-TO-MARKET.md §1 outcome table | Founder | [ ] | Go/No-Go decision documented |

**Exit Criteria**: Aggregator explicitly permits delayed-settlement/escrow model in writing.

---

## Phase B: Entity & Compliance Foundation (Weeks 3-8) — **PARALLEL**

*Runs in parallel with Phase C after Phase A completes.*

| # | Task | Owner | Status | Evidence |
|---|------|-------|--------|----------|
| B1 | Open corporate bank account | Founder | [ ] | Bank confirmation |
| B2 | Register with Data Protection Commission (Act 843) | Lawyer | [ ] | DPC certificate |
| B3 | Lawyer-drafted Terms of Service published | Lawyer | [ ] | Published URL |
| B4 | Lawyer-drafted Privacy Policy published | Lawyer | [ ] | Published URL |
| B5 | BoG registration category confirmed (PFTSP?) | Lawyer | [ ] | Written opinion |
| B6 | KYC thresholds confirmed against BoG/partner rules | Lawyer | [ ] | Updated 09-KYC-and-AML.md |
| B7 | Record-retention duration confirmed | Lawyer | [ ] | Written confirmation |
| B8 | FIC suspicious-activity reporting process confirmed | Lawyer | [ ] | Documented process |
| B9 | Hand-recruit 10-20 pilot vendors with signed commitments | Founder | [ ] | Signed commitment letters |

---

## Phase C: Production Infrastructure (Weeks 3-8) — **PARALLEL**

*Runs in parallel with Phase B after Phase A completes.*

| # | Task | Target | Status | Notes |
|---|------|--------|--------|-------|
| C1 | Provision managed PostgreSQL 16 with PITR (Supabase/Neon/Cloud SQL) | Provisioned | [ ] | 30-day retention |
| C2 | Provision managed Redis 7.2 (Upstash/Redis Cloud) with RDB+AOF | Provisioned | [ ] | 7-day retention |
| C3 | Provision object storage (Cloudflare R2/S3) with versioning + cross-region replication | Provisioned | [ ] | Evidence media |
| C4 | Provision LLM hosting (CPU-only Ollama on app host for pilot) | Provisioned | [ ] | **Run pilot CPU-only per cost discipline** |
| C5 | Configure DNS + TLS (Cloudflare) with auto-renewing certs | Configured | [ ] | api.croe.com |
| C6 | Set up CI/CD pipeline (GitHub Actions → Render/Railway/Fly) | Running | [ ] | Typecheck → Lint → Test → Build → Migrate → Deploy |
| C7 | Configure log aggregation (Pino → Loki/Better Stack/Datadog) | Configured | [ ] | Structured JSON |
| C8 | Configure daily Postgres backups + PITR with monthly restore tests | Verified | [ ] | Automated + tested |

---

## Phase D: Secrets & Security (Weeks 6-10)

*Depends on Phase C (infrastructure provisioned).*

| # | Task | Status | Notes |
|---|------|--------|-------|
| D1 | Move all 12 secrets to platform secret store (Render/Vercel/AWS Secrets Manager) | [ ] | DATABASE_URL, REDIS_URL, MOMO_WEBHOOK_SECRET, JWT_SECRET, OTP_PEPPER, AGGREGATOR_API_KEY, AGGREGATOR_BASE_URL, S3_ACCESS_KEY, S3_SECRET_KEY, LLM_URL, LLM_MODEL, CUSTODY_PHASE |
| D2 | Rotate all secrets post-migration | [ ] | New values generated |
| D3 | Execute external penetration test (scope: 21-Security-Threat-Model.md §7) | [ ] | P1 requirement |
| D4 | Close all P0/P1 penetration test findings | [ ] | Zero open critical/high |

---

## Phase E: Distribution Plumbing (Weeks 6-10)

*Runs in parallel with Phase D. App store review takes 2-6 weeks.*

| # | Task | Status | Notes |
|---|------|--------|-------|
| E1 | Enroll in Apple Developer Program under company entity | [ ] | Financial app scrutiny |
| E2 | Enroll in Google Play Developer under company entity | [ ] | Financial services declaration |
| E3 | Register SMS Sender ID via Arkesel/NCA | [ ] | Days to weeks |
| E4 | Submit iOS app to App Store (financial app review) | [ ] | Budget 2-6 weeks |
| E5 | Submit Android app to Play Store (financial services declaration) | [ ] | Budget 2-6 weeks |
| E6 | Launch production landing page + company email domain | [ ] | Aggregator/app store reviewers check |

---

## Phase F: Operational Readiness (Weeks 8-12)

*Depends on Phase B (entity/compliance). All roles need primary + backup.*

### Role Assignments (7 roles × 2 = 14 assignments)

| # | Role | Primary | Backup | Trained on Runbooks |
|---|------|---------|--------|---------------------|
| F1 | L3 Dispute Reviewer | [ ] | [ ] | [ ] |
| F2 | KYC Approver | [ ] | [ ] | [ ] |
| F3 | Reconciliation Operator | [ ] | [ ] | [ ] |
| F4 | Payout Failure Handler | [ ] | [ ] | [ ] |
| F5 | Support Lead | [ ] | [ ] | [ ] |
| F6 | On-call Engineer | [ ] | [ ] | [ ] |
| F7 | Commission Sweep/Bookkeeping | [ ] | [ ] | [ ] |

### Operating Documents (7 SOPs)

| # | Document | Status | Notes |
|---|----------|--------|-------|
| F8 | Dispute Adjudication Policy | [ ] | Ground truth for LLM prompt + ToS |
| F9 | KYC Review SOP | [ ] | ID acceptance, rejection grounds, duplicate detection |
| F10 | Refund & Goodwill Policy | [ ] | When Croe eats loss, authorization levels |
| F11 | Vendor Onboarding & Acceptance Criteria | [ ] | Categories accepted/refused |
| F12 | Fraud Response Playbook | [ ] | Collusion rings, structuring, FRAUD_LOCKOUT handling |
| F13 | Escalation Ladder & Contact Tree | [ ] | Money-loss/reconciliation incidents |
| F14 | Support Macros / Response Templates | [ ] | Top 10 questions, calm tone per Design System |

### Training & Contacts

| # | Task | Status |
|---|------|--------|
| F15 | Train all role owners on Production_manual.md runbooks (§7) | [ ] |
| F16 | Fill Production_manual.md §9 Operational Contacts | [ ] |

---

## Phase G: Supervised P1 Pilot (Weeks 10-14)

*All previous phases must be complete. 60-day minimum pilot.*

### Launch Gates

| # | Gate | Status |
|---|------|--------|
| G1 | Verify all P0→P1 gates in Production_manual.md §6.1 satisfied | [ ] |
| G2 | Set CUSTODY_PHASE=P1 in production | [ ] |
| G3 | Set low transaction-size caps | [ ] |
| G4 | Add interim custody disclosure in-app | [ ] |

### Daily Operations (First 30 Days)

| # | Task | Status |
|---|------|--------|
| G5 | Manual daily reconciliation review for 30 days | [ ] |
| G6 | Personally adjudicate every dispute + log reasoning | [ ] |

### Pilot Success Metrics (Track Weekly)

| # | Metric | Target | Actual |
|---|--------|--------|--------|
| G7 | Released transactions/month | ≥ 63 (break-even) | — |
| G8 | Net margin per transaction | ≥ 8.00 GHS | — |
| G9 | Dispute rate | < 8% | — |
| G10 | Adjudication accuracy (not reversed on appeal) | > 95% | — |
| G11 | Buyer drop-off at payment step | < 30% | — |
| G12 | Vendor retention (day 60) | > 60% | — |
| G13 | Reconciliation mismatches | 0 | — |

---

## Ongoing: Cloud Credits Applications (Start Immediately)

*Highest ROI — zeros infrastructure line including GPU.*

| # | Program | Status | Credit Awarded |
|---|---------|--------|----------------|
| OC1 | Microsoft for Startups Founders Hub | [ ] | — |
| OC2 | AWS Activate | [ ] | — |
| OC3 | Google Cloud for Startups | [ ] | — |
| OC4 | DigitalOcean Hatch | [ ] | — |

---

## Ongoing: Non-Dilutive Grants Pipeline

*Apply after Phase A validation + vendor commitments.*

| # | Source | Type | Status | Cycle/Deadline |
|---|--------|------|--------|----------------|
| OG1 | Hult Prize | Student competition | [ ] | On-campus rounds |
| OG2 | Tony Elumelu Foundation | Grant + training (~$5k) | [ ] | Early year |
| OG3 | MEST Africa | Training + seed | [ ] | Annual cohort |
| OG4 | University incubator/innovation centre | Grant + intros | [ ] | Rolling |
| OG5 | Catalyst Fund (BFA Global) | Grant + technical assistance | [ ] | Verify |
| OG6 | NEIP | Gov. seed + incubation | [ ] | Verify |
| OG7 | Ghana Tech Lab | Incubation/accelerator | [ ] | Verify |
| OG8 | Ghana Enterprises Agency | SME/youth support | [ ] | Verify |
| OG9 | Google for Startups Black Founders Fund/Africa | Equity-free | [ ] | Verify |

---

## Code Quality Gates (Already Passing — Maintain)

| # | Gate | Current Status | Must Maintain |
|---|------|----------------|---------------|
| CQ1 | All tests passing | ✅ 354 (275 backend + 79 frontend) | Zero regressions |
| CQ2 | TypeScript strict mode | ✅ Zero errors | Zero errors |
| CQ3 | No console.log/console.error in production code | ✅ Verified | Zero occurrences |
| CQ4 | No hardcoded secrets in source code | ✅ Verified | Zero occurrences |
| CQ5 | ESLint | ✅ Zero errors (34 warnings OK) | Zero errors |
| CQ6 | 50-concurrent-webhook race test | ✅ Passing | Deterministic pass |

---

## Dependency Graph

```
Phase A (Weeks 1-2) — BLOCKING
    │
    ├─→ Phase B (Weeks 3-8) ──→ Phase F (Weeks 8-12)
    │       │
    │       └─→ Phase E (Weeks 6-10) [parallel with D]
    │
    └─→ Phase C (Weeks 3-8) ──→ Phase D (Weeks 6-10)
            │
            └─→ Phase E (Weeks 6-10) [parallel with D]

Phase F + D + E complete → Phase G (Weeks 10-14)

Ongoing (OC1-4, OG1-9) — Start immediately, run throughout
```

---

## Quick Status Summary

| Category | Total | Pending | In Progress | Completed |
|----------|-------|---------|-------------|-----------|
| Phase A (Blocking) | 6 | 6 | 0 | 0 |
| Phase B (Entity) | 9 | 9 | 0 | 0 |
| Phase C (Infra) | 8 | 8 | 0 | 0 |
| Phase D (Secrets/Sec) | 4 | 4 | 0 | 0 |
| Phase E (Distribution) | 6 | 6 | 0 | 0 |
| Phase F (Ops) | 16 | 16 | 0 | 0 |
| Phase G (Pilot) | 13 | 13 | 0 | 0 |
| Ongoing: Cloud Credits | 4 | 4 | 0 | 0 |
| Ongoing: Grants | 9 | 9 | 0 | 0 |
| Code Quality (Maintain) | 6 | 0 | 0 | 6 |
| **TOTAL** | **114** | **108** | **0** | **6** |

---

## Next Action

**This week**: Execute A1, A2, A3 (send 3 aggregator emails), A4 (book lawyer), A5 (start ORC registration), OC1-OC4 (apply cloud credits).

Update GO-TO-MARKET.md §1 outcome table as responses arrive.