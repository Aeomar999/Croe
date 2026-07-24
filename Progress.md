# Croe — Implementation Progress

> **Living document.** Updated after every phase gate and significant implementation milestone. Agents must keep this file current — any phase transition, test result, or deployment change is recorded here within the same commit. Canonical terms per [`26-Glossary.md`](for_agents/26-Glossary.md). Build sequence per [`27-Roadmap.md`](for_agents/27-Roadmap.md).

---

## Current Status

| | |
|---|---|
| **Specification phase** | Complete (28 docs, design system) |
| **Implementation phase** | In progress — backend scaffold |
| **Custody phase** | P0 (sandbox) |
| **Active branch** | `main` |
| **Last updated** | 2026-07-24 |

---

## Branching & Commit Convention (rule GIT-01)

Every implementation phase MUST follow this workflow:

1. **Create a branch per phase** from `main` before writing any code:
   ```
   git checkout main && git pull
   git checkout -b phase/1-data-ledger
   ```
2. **Commit after each self-contained unit of work** — not at the end of the phase. A "unit" is one logical change that passes lint, typecheck, and tests independently. Examples: "add migration runner", "seed custody_accounts P0 row", "add updated_at trigger", "revoke UPDATE/DELETE on ledger".
3. **Never commit broken code.** Every commit must pass `typecheck`, `lint`, and existing tests. If a partial change cannot stand alone, stash or stage it — do not commit.
4. **Merge the phase branch to `main` only after the phase gate is satisfied** (rule PROC-01). Squash-merge with a message following the format:
   ```
   feat(phase-N): <short description>
   ```
5. **Delete the phase branch** after merge.

### Branch naming

| Phase | Branch name |
|---|---|
| Phase 1 — Data & Ledger | `phase/1-data-ledger` |
| Phase 2 — Core API & ACID | `phase/2-core-api` |
| Phase 3 — Webhooks & Payments | `phase/3-webhooks-payments` |
| Phase 4 — Evidence & Heuristics | `phase/4-evidence-heuristics` |
| Phase 5 — AI Triage | `phase/5-ai-triage` |
| Phase 6 — Identity, KYC, Notifications, Admin | `phase/6-identity-kyc-notif-admin` |
| Phase 7 — Frontend | `phase/7-frontend` |
| Phase 8 — Ops, Reconciliation, Hardening | `phase/8-ops-hardening` |

### Commit message format

```
<type>(<scope>): <description>

type: feat | fix | test | refactor | docs | chore
scope: module or component name
description: imperative, present tense, no period, max 72 chars
```

Examples:
```
feat(db): add escrow_transactions table with CHECK constraints
feat(db): add idx_single_deposit_per_transaction partial unique index
feat(db): add updated_at trigger on escrow_transactions
test(webhook): add 50-concurrent-deposit race test
fix(api): handle 23505 trap in processDepositWebhook
```

---

## Phase Progress

### Phase 1 — Data & Ledger

| | |
|---|---|
| **Branch** | `phase/1-data-ledger` |
| **Spec** | [`05-Data-Model.md`](for_agents/05-Data-Model.md), [`26-Glossary.md`](for_agents/26-Glossary.md) |
| **Status** | In progress |
| **Started** | 2026-07-24 |
| **Gate passed** | — |

#### Checklist

- [x] PostgreSQL 16 container with `uuid-ossp` extension (migration 001)
- [x] Core tables created (5): `users`, `otp_challenges`, `auth_sessions`, `escrow_transactions`, `transaction_ledger`
- [x] Extended tables created (8): `custody_accounts`, `payouts`, `webhook_inbox`, `idempotency_keys`, `kyc_records`, `evidence_artifacts`, `dispute_cases`, `notifications`
- [x] All `CHECK` constraints enforced (state enums, amount >= 0, currency codes)
- [x] All indexes created incl. `idx_single_deposit_per_transaction` (partial unique) and `idx_evidence_sha256` (migration 002)
- [x] `updated_at` trigger function + triggers on mutable tables (migration 002)
- [x] `REVOKE UPDATE, DELETE ON transaction_ledger FROM app_user` applied (migration 002)
- [x] Migrations tooling configured (`node-pg-migrate`)
- [x] Seed `custody_accounts` P0 sandbox row (migration 003)
- [ ] Unit tests: table creation, constraint violations, trigger behavior
- [ ] Integration tests: `app_user` cannot UPDATE/DELETE `transaction_ledger`

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-24 | `cfebe4c` | docs: rename spec files to sequential numbering, archive legacy brainstorm docs |
| 2026-07-24 | `f7d0ea7` | docs: add AGENTS.md, Progress.md, Production_manual.md, .env.example, design system |
| 2026-07-24 | `6c9c294` | feat(backend): scaffold pnpm + TypeScript + Express + pg with Phase 1-2 foundations |
| 2026-07-24 | `2e746f9` | feat(infra): add docker-compose for local Postgres 16 + Redis, document Supabase/Docker env split |
| 2026-07-24 | `debef3b` | fix(db): use dotenv-cli to inject .env into node-pg-migrate and seed scripts |
| 2026-07-24 | `12bb92d` | feat(escrow): add state machine, escrow service, and REST routes |

---

### Phase 2 — Core API & ACID

| | |
|---|---|
| **Branch** | `phase/2-core-api` |
| **Spec** | [`04-Architecture.md`](for_agents/04-Architecture.md), [`07-Escrow-Lifecycle.md`](for_agents/07-Escrow-Lifecycle.md) |
| **Status** | In progress |
| **Started** | 2026-07-24 |
| **Gate passed** | — |
| **Depends on** | Phase 1 |

#### Checklist

- [x] Node.js 20 LTS + TypeScript (strict tsconfig: noImplicitAny, strictNullChecks)
- [x] `pg.Pool` configured (max: 20, idleTimeoutMillis: 30000)
- [x] Graceful shutdown handler (SIGTERM/SIGINT -> drain pool)
- [x] `CustodyProvider` interface implemented (TypeScript interface from 04-Architecture.md section 4)
- [x] `PaymentRail` interface implemented (TypeScript interface from 04-Architecture.md section 5)
- [x] P0 sandbox `CustodyProvider` implementation (mock aggregator calls)
- [x] P0 sandbox `PaymentRail` implementation (USSD prompt stub)
- [x] Express server with health check, Pino logging, helmet, CORS, forensic middleware
- [x] Escrow lifecycle state machine enforced (all transitions from 07-Escrow-Lifecycle.md)
- [x] `POST /v1/escrow` — create escrow contract (vendor)
- [x] `GET /v1/escrow/:id` — get escrow status (buyer/vendor)
- [ ] `POST /v1/escrow/:id/deposit` — initiate deposit (buyer)
- [x] `POST /v1/escrow/:id/ship` — mark shipped (vendor)
- [x] `POST /v1/escrow/:id/confirm-delivery` — confirm delivery (buyer)
- [x] `POST /v1/escrow/:id/cancel` — cancel (vendor)
- [x] State-machine guards: no SHIP before FUNDS_SECURED, no CONFIRM_DELIVERY before SHIPPED
- [x] `processDepositWebhook` with SELECT FOR UPDATE + 23505 trap
- [x] Money is always NUMERIC(15,2) — zero float arithmetic
- [x] Unit tests: state transitions, guard clauses, CustodyProvider methods
- [x] Integration tests: full escrow lifecycle happy path, invalid transition rejection, concurrent webhook race (50)

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-24 | `6c9c294` | feat(backend): CustodyProvider + PaymentRail interfaces, P0 sandbox impls, Express server, middleware stack |
| 2026-07-24 | `12bb92d` | feat(escrow): state machine, escrow service, REST routes (create, get, ship, confirm, cancel, deposit webhook) |
| 2026-07-24 | `eee59c3` | feat(escrow): add initiateDeposit endpoint with PaymentRail integration |
| 2026-07-24 | `16f7093` | test(state-machine,money): add state transition guards and money precision tests (44 passing) |
| 2026-07-24 | `016eed1` | test(escrow): add integration tests against real Postgres (54 tests total passing) |

---

### Phase 3 — Webhooks & Payments

| | |
|---|---|
| **Branch** | `phase/1-data-ledger` (combined) |
| **Spec** | [`10-Payments-Collection.md`](for_agents/10-Payments-Collection.md), [`11-Payouts-Refunds.md`](for_agents/11-Payouts-Refunds.md), [`12-Webhooks-and-Idempotency.md`](for_agents/12-Webhooks-and-Idempotency.md) |
| **Status** | In progress |
| **Started** | 2026-07-24 |
| **Gate passed** | — |
| **Depends on** | Phase 2 |

#### Checklist

- [x] Raw-body HMAC middleware (WH-01: `req.rawBody`, not parsed JSON)
- [x] Replay defense: reject `|now − timestamp| > 300s` (WH-02)
- [x] Constant-time compare via `crypto.timingSafeEqual` + length check (WH-03)
- [x] Fast-200: ACK `< 500ms` before async processing (WH-04)
- [ ] Redis `SETNX` fast dedup gate (`SETNX idemp:<provider_ref>`, 24h TTL)
- [x] Durable `webhook_inbox` INSERT with `ON CONFLICT DO NOTHING`
- [x] Client `Idempotency-Key` validation (UUIDv4, `POST`/`PUT`/`DELETE` only)
- [ ] `Idempotency-Key` replay → stored response; missing key → `400 IDEMPOTENCY_KEY_REQUIRED`
- [ ] Collection (deposit) flow: `CustodyProvider.collect()` → webhook → `hold()`
- [ ] Payout flow: `CustodyProvider.releaseTo()` → provider confirms → ledger write (MONEY-01)
- [ ] Refund flow: `CustodyProvider.refundTo()` → provider confirms → ledger write
- [ ] Commission math: `vendor_net + commission == amount` exactly (NUMERIC(15,2))
- [ ] Payout state machine: `INITIATED` → `SUCCESS`/`FAILED`/`RETRYING`
- [ ] `idx_single_success_payout` enforced — no double-release per direction
- [x] Unit tests: HMAC verification, replay rejection, timing-safe comparison
- [ ] Unit tests: idempotency dedup, conflict detection
- [ ] Unit tests: commission math precision
- [x] **Critical test: 50 concurrent identical deposit webhooks → exactly one `FUNDS_DEPOSITED`**

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-24 | `17038c8` | feat(webhook): HMAC verification, durable inbox, fast-200 ack, client idempotency, 64 tests passing |

---

### Phase 4 — Evidence & Heuristics

| | |
|---|---|
| **Branch** | `phase/4-evidence-heuristics` |
| **Spec** | [`14-Evidence-and-Forensics.md`](for_agents/14-Evidence-and-Forensics.md), [`13-Disputes-and-AI-Triage.md`](for_agents/13-Disputes-and-AI-Triage.md) (Step 1 only) |
| **Status** | Not started |
| **Started** | — |
| **Gate passed** | — |
| **Depends on** | Phase 3 |

#### Checklist

- [ ] Upload endpoint: `POST /v1/evidence/upload` (multipart, max 25 MB)
- [ ] Streaming SHA-256 hash computed on-the-fly during upload (AUD-03)
- [ ] Object storage write (S3/R2) with content-addressed path
- [ ] `409 EVIDENCE_RECYCLED` when same SHA-256 exists for a different transaction
- [ ] `evidence_artifacts` row written only after successful storage
- [ ] Forensic metadata capture: `X-Device-Fingerprint`, `X-Network-Type`, `req.ip` from headers (AUD-02)
- [ ] `POST /v1/disputes` — open dispute with `reason_code`, `claim_description`, `evidence_artifact_ids[]`
- [ ] `GET /v1/disputes/:id/status` — check dispute status
- [ ] **Query A — recycled evidence:** `SELECT EXISTS (SELECT 1 FROM evidence_artifacts WHERE sha256_hash=$1 AND transaction_id!=$2)`
- [ ] **Query B — Sybil velocity:** count distinct accounts/disputes from same IP/device in 24h
- [ ] **Query C — trust/age:** check `trust_score`, `is_frozen`, account age
- [ ] Cascading rule engine: recycled media → `FRAUD_LOCKOUT` + trust −50; Sybil → freeze; burner → `UNDER_HUMAN_REVIEW`
- [ ] Unit tests: SHA-256 hash consistency, recycled detection, rule engine cascading
- [ ] Integration tests: upload → hash → recycle detection end-to-end

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| — | — | _No commits yet_ |

---

### Phase 5 — AI Triage

| | |
|---|---|
| **Branch** | `phase/5-ai-triage` |
| **Spec** | [`13-Disputes-and-AI-Triage.md`](for_agents/13-Disputes-and-AI-Triage.md) (Step 2), [`22-Infra-and-Deployment.md`](for_agents/22-Infra-and-Deployment.md) |
| **Status** | Not started |
| **Started** | — |
| **Gate passed** | — |
| **Depends on** | Phase 4 |

#### Checklist

- [ ] Local LLM setup: Ollama (dev) / vLLM (prod)
- [ ] Pin exact model id → `ai_model_version` column in `dispute_cases`
- [ ] System prompt implemented verbatim (from `13-Disputes-and-AI-Triage.md` §4)
- [ ] Strict JSON output validation (AI-02): reject/re-request on malformed output
- [ ] Image pre-captioning pipeline (text-only to LLM, keeps inference < 5s)
- [ ] Confidence gate (AI-03): `≥ 0.900` → auto-execute via `23`; `< 0.900` → `UNDER_HUMAN_REVIEW`
- [ ] LLM output stored in `dispute_cases.ai_reasoning_payload` (GIN-indexed)
- [ ] Prompt-injection hardening (AI-04): user text isolated in JSON fields, never concatenated into instructions
- [ ] LLM never directly triggers payout — only code can execute `23` methods
- [ ] Unit tests: schema validation, confidence threshold logic, repair/escalation
- [ ] Integration tests: malformed output → repair, low confidence → human, high confidence → auto

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| — | — | _No commits yet_ |

---

### Phase 6 — Identity, KYC, Notifications, Admin

| | |
|---|---|
| **Branch** | `phase/6-identity-kyc-notif-admin` |
| **Spec** | [`08-Identity-Auth.md`](for_agents/08-Identity-Auth.md), [`09-KYC-and-AML.md`](for_agents/09-KYC-and-AML.md), [`15-Notifications.md`](for_agents/15-Notifications.md), [`16-Admin-Console.md`](for_agents/16-Admin-Console.md), [`17-Trust-Score-and-Anti-Fraud.md`](for_agents/17-Trust-Score-and-Anti-Fraud.md) |
| **Status** | Not started |
| **Started** | — |
| **Gate passed** | — |
| **Depends on** | Phase 3 |

#### Checklist

**Auth (20):**
- [ ] `POST /v1/auth/otp/request` — generate 6-digit OTP, store hash + 5-min expiry, send SMS
- [ ] `POST /v1/auth/otp/verify` — match hash, upsert user, create session, return tokens
- [ ] `POST /v1/auth/refresh` — rotate refresh token, return new pair
- [ ] `POST /v1/auth/logout` — revoke session (`revoked_at`)
- [ ] Access token: JWT ~15 min, carries `user_id`, `kyc_tier`, `session_id`
- [ ] Refresh token: opaque, hashed in `auth_sessions`, ~30 days, reuse detection
- [ ] Device binding: `device_id` from `X-Device-Fingerprint`, mismatch flagged
- [ ] Brute-force lockout: `attempts ≥ 5` → lock challenge → `429 OTP_LOCKED`
- [ ] Always return `202` on OTP request (no user enumeration)

**KYC (21):**
- [ ] Tiered KYC: Tier 0 (phone-only), Tier 1 (+ ID), Tier 2 (+ enhanced)
- [ ] Per-tier transaction and daily caps enforced before every money action
- [ ] `403 KYC_LIMIT_EXCEEDED` when amount exceeds tier cap
- [ ] Raw government-ID numbers hashed, never stored plaintext
- [ ] Tier upgrade requires audit-logged approval event

**Notifications (27):**
- [ ] SMS channel for critical money events
- [ ] Push channel for status updates
- [ ] Per-event notification matrix implemented (from `15-Notifications.md`)
- [ ] Calm micro-empathy copy templates (from `20-Design-System.md`)
- [ ] Failed sends retried with backoff; no silent drops
- [ ] Critical money/dispute events never suppressed by user preferences

**Admin (28):**
- [ ] `GET /v1/admin/disputes/queue` — prioritized escalation queue
- [ ] `POST /v1/admin/disputes/:id/resolve` — adjudicate with reason
- [ ] `POST /v1/admin/users/:id/freeze` — freeze/unfreeze with reason
- [ ] `GET /v1/admin/reconciliation` — reconciliation view with date range
- [ ] RBAC: Reviewer, Ops, Admin roles
- [ ] All admin actions audit-logged with reason string

**Trust Score (29):**
- [ ] Deterministic trust-score model (0–100, default 100)
- [ ] Audit-logged adjustments: recycled evidence (−50), lost dispute (−10), Sybil (−50 + freeze), successful tx (+1)
- [ ] Freeze blocks new money actions but never seizes in-escrow funds
- [ ] Thresholds configurable, documented as `[verify]`

- [ ] Unit tests: OTP hashing, session rotation, device binding, trust-score math
- [ ] Integration tests: full auth flow, KYC tier enforcement, notification delivery

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| — | — | _No commits yet_ |

---

### Phase 7 — Frontend

| | |
|---|---|
| **Branch** | `phase/7-frontend` |
| **Spec** | [`19-Frontend-React-Native.md`](for_agents/19-Frontend-React-Native.md), [`20-Design-System.md`](for_agents/20-Design-System.md), [`18-API-Reference.md`](for_agents/18-API-Reference.md) |
| **Status** | Not started |
| **Started** | — |
| **Gate passed** | — |
| **Depends on** | Phase 6 |

#### Checklist

**Scaffold:**
- [ ] React Native + TypeScript app (Expo, rule UI-01)
- [ ] React Navigation configured
- [ ] TanStack Query for server state
- [ ] Zustand for local state
- [ ] Axios HTTP client configured

**Interceptor:**
- [ ] Forensic headers injected: `X-Device-Fingerprint`, `X-Network-Type`, `X-App-Version`, `X-Client-Timestamp`
- [ ] `Idempotency-Key` (UUIDv4) injected on every `POST`/`PUT`/`DELETE` (UI-02)
- [ ] Retries reuse stable key per user intent
- [ ] Error responses rendered as calm, human-readable copy (UI-04)

**Core screens:**
- [ ] Auth: phone input → OTP entry
- [ ] Escrow creation: item description, amount, currency, delivery terms
- [ ] Deposit: MoMo number, carrier selection
- [ ] Transaction status: state display with calm visual language
- [ ] Dispute: open dispute, attach evidence, view status
- [ ] KYC: document submission
- [ ] Wallet/balance view

**Design system:**
- [ ] Theme tokens applied (colors: blues/grays/amber, no crimson — UI-03)
- [ ] 8pt spacing grid
- [ ] Calm typography
- [ ] DisputeStatusCard component
- [ ] All user-facing strings follow micro-empathy tone

- [ ] Unit tests: interceptor header injection, idempotency key stability
- [ ] E2E tests (Detox): auth flow, escrow creation, dispute flow

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| — | — | _No commits yet_ |

---

### Phase 8 — Ops, Reconciliation, Hardening

| | |
|---|---|
| **Branch** | `phase/8-ops-hardening` |
| **Spec** | [`23-Observability-and-Reconciliation.md`](for_agents/23-Observability-and-Reconciliation.md), [`24-Testing-Strategy.md`](for_agents/24-Testing-Strategy.md), [`21-Security-Threat-Model.md`](for_agents/21-Security-Threat-Model.md) |
| **Status** | Not started |
| **Started** | — |
| **Gate passed** | — |
| **Depends on** | Phase 7 |

#### Checklist

**Observability (42):**
- [ ] Structured JSON logging (Winston/Pino), no secrets
- [ ] Correlation IDs on every request
- [ ] PRD SLOs measured and alertable:
  - [ ] Heuristic latency < 50ms
  - [ ] LLM inference < 5s
  - [ ] Webhook ACK < 500ms
  - [ ] Auto-resolution rate ≥ 80%
  - [ ] Double-spend incidents = 0
  - [ ] False-positive lockouts < 0.5%

**Reconciliation (42):**
- [ ] Daily reconciliation job: pooled balance vs. sub-ledger vs. partner statement
- [ ] Mismatch triggers: freeze disbursements + alert + runbook
- [ ] Append-only enforcement continuously verified (app role UPDATE/DELETE revoked)
- [ ] Data retention/deletion scheduling per Ghana Data Protection Act

**Testing (43):**
- [ ] **Critical test: 50 concurrent deposit webhooks → exactly one `FUNDS_DEPOSITED`**
- [ ] Idempotency: same key replay → single effect; same key different body → `409`
- [ ] Idempotency survives worker restart
- [ ] Money precision: `vendor_net + commission == amount` exactly across many amounts
- [ ] Fraud heuristics: recycled photo → lockout, Sybil velocity → freeze, burner → human
- [ ] Webhook security: bad HMAC → `401`, expired timestamp → `401`, valid → processed once
- [ ] AI triage: malformed → repair/escalate, low confidence → human, high confidence → auto
- [ ] Auth: expired/consumed OTP rejected, brute-force lockout, refresh rotation, device mismatch

**Security hardening (40):**
- [ ] Pen-test scope executed (webhook forgery, auth brute force, IDOR, SQL injection, prompt injection, admin RBAC)
- [ ] Helmet/security headers configured
- [ ] CORS locked to known origins
- [ ] Rate limits deployed per `21-Security-Threat-Model.md` §4 table
- [ ] All secrets from env/secret store (SEC-01) — zero literals in code

- [ ] `docker-compose up` brings full stack locally for free
- [ ] CI pipeline: typecheck → lint → unit → integration on every PR

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| — | — | _No commits yet_ |

---

## Go-Live Gates

| Gate | Criteria | Status |
|---|---|---|
| **P0 → P1** | All Phase 1–8 tests green on sandbox; company registered; legal sign-off on interim custody | Not started |
| **P1 → P2** | Partner trust-account agreement signed; custody swapped via `CUSTODY_PHASE`; reconciliation clean for N days | Not started |

---

## Audit Trail

> Record every phase gate decision, deployment, and significant finding here.

| Date | Event | Author | Notes |
|---|---|---|---|
| 2026-07-24 | Spec package complete (28 docs) | — | Implementation not yet started |
| 2026-07-24 | Audit remediation applied | — | C-1 fixed, docs archived, .env.example created, validation schemas + rate limits added |
| 2026-07-24 | Backend scaffold created | — | pnpm + TypeScript 7 strict + Express 5 + pg.Pool + Pino + node-pg-migrate; 3 migrations (schema, indexes/triggers, seed); CustodyProvider/PaymentRail interfaces + P0 sandbox impls; health check endpoint; forensic + request logging middleware |

---

## Summary

| Phase | Branch | Status | Tests | Gate |
|---|---|---|---|---|
| 1 — Data & Ledger | `phase/1-data-ledger` | In progress | — | — |
| 2 — Core API & ACID | `phase/2-core-api` | In progress | — | — |
| 3 — Webhooks & Payments | `phase/3-webhooks-payments` | Not started | — | — |
| 4 — Evidence & Heuristics | `phase/4-evidence-heuristics` | Not started | — | — |
| 5 — AI Triage | `phase/5-ai-triage` | Not started | — | — |
| 6 — Identity, KYC, Notif, Admin | `phase/6-identity-kyc-notif-admin` | Not started | — | — |
| 7 — Frontend | `phase/7-frontend` | Not started | — | — |
| 8 — Ops, Reconciliation, Hardening | `phase/8-ops-hardening` | Not started | — | — |
