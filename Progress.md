# Croe — Implementation Progress

> **Living document.** Updated after every phase gate and significant implementation milestone. Agents must keep this file current — any phase transition, test result, or deployment change is recorded here within the same commit. Canonical terms per [`26-Glossary.md`](for_agents/26-Glossary.md). Build sequence per [`27-Roadmap.md`](for_agents/27-Roadmap.md).

---

## Current Status

| | |
|---|---|
| **Specification phase** | Complete (28 docs, design system) |
| **Implementation phase** | Phases 1–8 built; production-readiness audit 2026-09-26 found gaps before real money. Engineering tasks and launch gates: [`task.md`](task.md) |
| **Business readiness** | ⬜ Not started — tracked in [`GO-TO-MARKET.md`](GO-TO-MARKET.md) (entity, licensing, aggregator, ops, pilot) |
| **Custody phase** | P0 (sandbox) |
| **Test suite** | 410 backend (40 files) + 81 mobile + 24 admin passing; `tsc --noEmit` clean; CI green since 2026-09-26 (PR #19) |
| **Active branch** | `main` |
| **Last updated** | 2026-09-26 |
| **Follow-up fixes (2026-09-20)** | **Frontend Mock Removal:** `KycScreen` and `DisputeStatusScreen` created. `HomeScreen`, `LinksScreen`, `WalletScreen`, and `TransactionStatusScreen` wired up to use `useEscrowList` and `useEscrow` instead of hardcoded mock data. `ProfileScreen` uses `useUserProfile` and `useKycStatus`. |
| **Follow-up fixes (2026-09-12)** | Retention purge targets `auth_sessions`+`notifications`; `/health` mounted at root; ledger-integrity introspects checksum column (23 §6, skipped when absent); reconciliation + admin report source custody balances via `CustodyProvider.getBalance` (23 §1); sandbox pooled sum reads `amount_delta`. Live boot verified: all 3 jobs run clean, `/health` + `/v1/health` → 200. |
| **Tooling (2026-09-12)** | `lint` now runs: ESLint 10 + typescript-eslint 8 flat config (`backend/eslint.config.mjs`), `typescript` pinned to 6.0.3 (typescript-eslint rejects TS 7), script updated to `eslint src`. Gate: 0 errors / 34 warnings (`no-unused-vars` + explicit `any` backlog); Express type augmentation allowed via `no-namespace` with `allowDeclarations`. |

---

## Local Dev Environment (2026-09-12)

> Workaround record. This dev box uses a Podman 6.0.2 machine (`podman-machine-default`, Fedora 44, WSL2, kernel `6.6.87.2-microsoft-standard-WSL2`) whose kernel ships **no NAT modules** (`nft_chain_nat`/`nft_masq` absent, legacy `iptable_nat` too). Podman 6's netavark v2 dropped the iptables firewall backend, so **bridge networking with port maps cannot start** (`docker compose up` fails). Docker Desktop is installed but its engine fails to start ("backend exited before becoming ready"). Fallback in use:

- Postgres + Redis run **host-networked** in the Podman VM (reuses `croe_pgdata` / `croe_redisdata` volumes, same images/env as `docker-compose.yml`):
  ```
  podman run -d --name croe-postgres --network host -e POSTGRES_USER=croe -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=croe -v croe_pgdata:/var/lib/postgresql/data postgres:16-alpine
  podman run -d --name croe-redis --network host -v croe_redisdata:/data redis:7.2-alpine
  ```
- `backend/.env` now points at the VM's WSL address `172.25.95.79` (was `127.0.0.1`) for `DATABASE_URL` / `REDIS_URL`. **IP may change if the Podman machine restarts** — re-check via `podman exec croe-postgres sh -c "ip route"` (eth0 src) and update `.env`.
- Verified: 5 migrations applied, seed idempotent, `pnpm --dir backend dev` boots and serves HTTP.

**Pre-existing issues found (not caused by the env migration):**
- `jobs/retention.ts` `runRetentionPurge` errors: `relation "messages" does not exist` — job queries a table that was never in the schema (schema has `notifications`). Scheduler logs ERROR every tick.
- `GET /health` returns 404 — no route registered (compose healthcheck expects it).

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
| **Status** | ✅ Complete |
| **Started** | 2026-07-24 |
| **Gate passed** | 2026-07-25 |

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
- [x] Schema validated via integration tests (275 tests pass against live schema)

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
| **Status** | ✅ Complete |
| **Started** | 2026-07-24 |
| **Gate passed** | 2026-07-25 |
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
- [x] `POST /v1/escrow/:id/deposit` — initiate deposit (buyer)
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
| **Branch** | `phase/3-webhooks-payments` |
| **Spec** | [`10-Payments-Collection.md`](for_agents/10-Payments-Collection.md), [`11-Payouts-Refunds.md`](for_agents/11-Payouts-Refunds.md), [`12-Webhooks-and-Idempotency.md`](for_agents/12-Webhooks-and-Idempotency.md) |
| **Status** | ✅ Complete (73 tests, 3 commits) |
| **Started** | 2026-07-24 |
| **Gate passed** | — |
| **Depends on** | Phase 2 |

#### Checklist

- [x] Raw-body HMAC middleware (WH-01: `req.rawBody`, not parsed JSON)
- [x] Replay defense: reject `|now − timestamp| > 300s` (WH-02)
- [x] Constant-time compare via `crypto.timingSafeEqual` + length check (WH-03)
- [x] Fast-200: ACK `< 500ms` before async processing (WH-04)
- [x] Redis `SETNX` fast dedup gate (`SETNX idemp:<provider_ref>`, 24h TTL)
- [x] Durable `webhook_inbox` INSERT with `ON CONFLICT DO NOTHING`
- [x] Client `Idempotency-Key` validation (UUIDv4, `POST`/`PUT`/`DELETE` only)
- [x] `Idempotency-Key` replay → stored response; missing key → `400 IDEMPOTENCY_KEY_REQUIRED`
- [x] Collection (deposit) flow: `CustodyProvider.collect()` → webhook → `hold()`
- [x] Payout flow: `CustodyProvider.releaseTo()` → provider confirms → ledger write (MONEY-01)
- [x] Refund flow: `CustodyProvider.refundTo()` → provider confirms → ledger write
- [x] Commission math: `vendor_net + commission == amount` exactly (NUMERIC(15,2))
- [x] Payout state machine: `INITIATED` → `SUCCESS`/`FAILED`/`RETRYING`
- [x] `idx_single_success_payout` enforced — no double-release per direction
- [x] Unit tests: HMAC verification, replay rejection, timing-safe comparison
- [x] Unit tests: idempotency dedup, conflict detection
- [x] Unit tests: commission math precision
- [x] **Critical test: 50 concurrent identical deposit webhooks → exactly one `FUNDS_DEPOSITED`**

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-24 | `17038c8` | feat(webhook): HMAC verification, durable inbox, fast-200 ack, client idempotency, 64 tests passing |
| 2026-07-24 | `16d1557` | feat(payout): release/refund flows with MONEY-01 pay-then-ledger, Redis dedup gate, commission math, 67 tests |
| 2026-07-24 | `9da0f94` | feat(idempotency): full replay guard with stored response, conflict detection, 24h TTL purge, 73 tests |

---

### Phase 4 — Evidence & Heuristics

| | |
|---|---|
| **Branch** | `phase/4-evidence-heuristics` |
| **Spec** | [`14-Evidence-and-Forensics.md`](for_agents/14-Evidence-and-Forensics.md), [`13-Disputes-and-AI-Triage.md`](for_agents/13-Disputes-and-AI-Triage.md) (Step 1 only) |
| **Status** | ✅ Complete (87 tests, 1 commit) |
| **Started** | 2026-07-24 |
| **Gate passed** | — |
| **Depends on** | Phase 3 |

#### Checklist

- [x] Upload endpoint: `POST /v1/evidence/upload` (multipart, max 25 MB)
- [x] Streaming SHA-256 hash computed on-the-fly during upload (AUD-03)
- [x] Object storage write (S3/R2) with content-addressed path
- [x] `409 EVIDENCE_RECYCLED` when same SHA-256 exists for a different transaction
- [x] `evidence_artifacts` row written only after successful storage
- [x] Forensic metadata capture: `X-Device-Fingerprint`, `X-Network-Type`, `req.ip` from headers (AUD-02)
- [x] `POST /v1/disputes` — open dispute with `reason_code`, `claim_description`, `evidence_artifact_ids[]`
- [x] `GET /v1/disputes/:id/status` — check dispute status
- [x] **Query A — recycled evidence:** `SELECT EXISTS (SELECT 1 FROM evidence_artifacts WHERE sha256_hash=$1 AND transaction_id!=$2)`
- [x] **Query B — Sybil velocity:** count distinct accounts/disputes from same IP/device in 24h
- [x] **Query C — trust/age:** check `trust_score`, `is_frozen`, account age
- [x] Cascading rule engine: recycled media → `FRAUD_LOCKOUT` + trust −50; Sybil → freeze; burner → `UNDER_HUMAN_REVIEW`
- [x] Unit tests: SHA-256 hash consistency, recycled detection, rule engine cascading
- [x] Integration tests: upload → hash → recycle detection end-to-end

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-24 | `612eb44` | feat(evidence): upload with streaming SHA-256, recycled-evidence trap, dispute heuristics, 87 tests |

---

### Phase 5 — AI Triage

| | |
|---|---|
| **Branch** | `phase/5-ai-triage` |
| **Spec** | [`13-Disputes-and-AI-Triage.md`](for_agents/13-Disputes-and-AI-Triage.md) (Step 2), [`22-Infra-and-Deployment.md`](for_agents/22-Infra-and-Deployment.md) |
| **Status** | ✅ Complete (111 tests, 1 commit) |
| **Started** | 2026-07-24 |
| **Gate passed** | — |
| **Depends on** | Phase 4 |

#### Checklist

- [x] Local LLM setup: Ollama (dev) / vLLM (prod)
- [x] Pin exact model id → `ai_model_version` column in `dispute_cases`
- [x] System prompt implemented verbatim (from `13-Disputes-and-AI-Triage.md` §4)
- [x] Strict JSON output validation (AI-02): reject/re-request on malformed output
- [x] Image pre-captioning pipeline (text-only to LLM, keeps inference < 5s)
- [x] Confidence gate (AI-03): `≥ 0.900` → auto-execute via `23`; `< 0.900` → `UNDER_HUMAN_REVIEW`
- [x] LLM output stored in `dispute_cases.ai_reasoning_payload` (GIN-indexed)
- [x] Prompt-injection hardening (AI-04): user text isolated in JSON fields, never concatenated into instructions
- [x] LLM never directly triggers payout — only code can execute `23` methods
- [x] Unit tests: schema validation, confidence threshold logic, repair/escalation
- [x] Integration tests: malformed output → repair, low confidence → human, high confidence → auto

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-24 | `d8cc3b4` | feat(ai-triage): LLM client, system prompt, schema validation, confidence gate, 111 tests |

---

### Phase 6 — Identity, KYC, Notifications, Admin

| | |
|---|---|
| **Branch** | `phase/6-identity-kyc-notif-admin` |
| **Spec** | [`08-Identity-Auth.md`](for_agents/08-Identity-Auth.md), [`09-KYC-and-AML.md`](for_agents/09-KYC-and-AML.md), [`15-Notifications.md`](for_agents/15-Notifications.md), [`16-Admin-Console.md`](for_agents/16-Admin-Console.md), [`17-Trust-Score-and-Anti-Fraud.md`](for_agents/17-Trust-Score-and-Anti-Fraud.md) |
| **Status** | ✅ Complete (174 tests, 1 commit) |
| **Started** | 2026-07-25 |
| **Gate passed** | — |
| **Depends on** | Phase 5 |

#### Checklist

**Auth (20):**
- [x] `POST /v1/auth/otp/request` — generate 6-digit OTP, store hash + 5-min expiry, send SMS
- [x] `POST /v1/auth/otp/verify` — match hash, upsert user, create session, return tokens
- [x] `POST /v1/auth/refresh` — rotate refresh token, return new pair
- [x] `POST /v1/auth/logout` — revoke session (`revoked_at`)
- [x] Access token: JWT ~15 min, carries `user_id`, `kyc_tier`, `session_id`
- [x] Refresh token: opaque, hashed in `auth_sessions`, ~30 days, reuse detection
- [x] Device binding: `device_id` from `X-Device-Fingerprint`, mismatch flagged
- [x] Brute-force lockout: `attempts ≥ 5` → lock challenge → `429 OTP_LOCKED`
- [x] Always return `202` on OTP request (no user enumeration)

**KYC (21):**
- [x] Tiered KYC: Tier 0 (phone-only), Tier 1 (+ ID), Tier 2 (+ enhanced)
- [x] Per-tier transaction and daily caps enforced before every money action
- [x] `403 KYC_LIMIT_EXCEEDED` when amount exceeds tier cap
- [x] Raw government-ID numbers hashed, never stored plaintext
- [x] Tier upgrade requires audit-logged approval event

**Notifications (27):**
- [x] SMS channel for critical money events
- [x] Push channel for status updates
- [x] Per-event notification matrix implemented (from `15-Notifications.md`)
- [x] Calm micro-empathy copy templates (from `20-Design-System.md`)
- [x] Failed sends retried with backoff; no silent drops
- [x] Critical money/dispute events never suppressed by user preferences

**Admin (28):**
- [x] `GET /v1/admin/disputes/queue` — prioritized escalation queue
- [x] `POST /v1/admin/disputes/:id/resolve` — adjudicate with reason
- [x] `POST /v1/admin/users/:id/freeze` — freeze/unfreeze with reason
- [x] `GET /v1/admin/reconciliation` — reconciliation view with date range
- [x] RBAC: Reviewer, Ops, Admin roles
- [x] All admin actions audit-logged with reason string

**Trust Score (29):**
- [x] Deterministic trust-score model (0–100, default 100)
- [x] Audit-logged adjustments: recycled evidence (−50), lost dispute (−10), Sybil (−50 + freeze), successful tx (+1)
- [x] Freeze blocks new money actions but never seizes in-escrow funds
- [x] Thresholds configurable, documented as `[verify]`

- [x] Unit tests: OTP hashing, session rotation, device binding, trust-score math
- [x] Integration tests: full auth flow, KYC tier enforcement, notification delivery

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-25 | `fc4d817` | feat(identity): OTP auth with JWT sessions, KYC tiers, trust score, notifications, admin RBAC — 174 tests passing |

---

### Phase 7 — Frontend

| | |
|---|---|
| **Branch** | `phase/7-frontend` |
| **Spec** | [`19-Frontend-React-Native.md`](for_agents/19-Frontend-React-Native.md), [`20-Design-System.md`](for_agents/20-Design-System.md), [`18-API-Reference.md`](for_agents/18-API-Reference.md) |
| **Status** | ✅ Complete (42 unit + 37 E2E tests, 8 commits) |
| **Started** | 2026-07-26 |
| **Gate passed** | — |
| **Depends on** | Phase 6 |

#### Checklist

**Scaffold:**
- [x] React Native + TypeScript app (Expo SDK 54, rule UI-01)
- [x] React Navigation configured (AuthStack + MainStack + custom floating dock)
- [x] TanStack Query for server state
- [x] Zustand for local state (auth store with SecureStore persistence)
- [x] Axios HTTP client configured

**Interceptor:**
- [x] Forensic headers injected: `X-Device-Fingerprint`, `X-Network-Type`, `X-App-Version`, `X-Client-Timestamp`
- [x] `Idempotency-Key` (UUIDv4) injected on every `POST`/`PUT`/`DELETE` (UI-02)
- [x] Retries reuse stable key per user intent
- [x] Error responses rendered as calm, human-readable copy (UI-04)

**Core screens:**
- [x] Auth: phone input → OTP entry
- [x] Onboarding: 3-step carousel
- [x] Home: BalanceBlock, escrow list with TransactionRow, filter chips
- [x] Escrow creation: item description, amount, delivery mode, fee calc
- [x] Link created: success hero, chat preview, share actions
- [x] Deposit: carrier picker (MTN/Telecel/AT), reassurance wash
- [x] Transaction status: timeline rail, status pill, wash banner, actions
- [x] Dispute: open dispute with reason picker, description, evidence upload
- [x] Wallet: balance with allocation bar, transaction history
- [x] Links: active escrow list with filter/search (placeholder)
- [x] Profile: user info, KYC status, settings (placeholder)

**Design system:**
- [x] Theme tokens applied (Soft Light v3 from tokens.css — no blue, no Inter/Outfit)
- [x] 4pt spacing grid
- [x] Plus Jakarta Sans typography (5 weights)
- [x] All user-facing strings follow micro-empathy tone
- [x] Pill (trace/signal), Button (6 variants), Input, WashBanner, BalanceBlock, Table, Avatar, Toast, icons

**Testing:**
- [x] Unit tests: API client interceptor (forensic headers, idempotency key, auth token, 401 retry) — 22 tests
- [x] Unit tests: auth store (setTokens, logout, loadStored, setUser) — 10 tests
- [x] Unit tests: API layer (auth, escrow, disputes endpoints) — 10 tests
- [x] E2E tests (Detox): auth flow, escrow creation, dispute flow — 3 suites (37 tests)

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-26 | `59eb401` | Unit 1: Expo scaffold, tokens, typography, API client, auth store, components, navigation |
| 2026-07-26 | `8f6f80e` | Unit 2: PhoneInput, OtpEntry, Onboarding screens |
| 2026-07-27 | `bcd67a3` | Unit 3: HomeScreen, TransactionStatusScreen, TransactionRow |
| 2026-07-27 | `5eda84b` | Unit 4: CreateEscrowScreen, LinkCreatedScreen, PayDepositScreen |
| 2026-07-27 | `86555e7` | Unit 5: WalletScreen, DisputeOpenScreen |
| 2026-07-27 | `c8b0776` | Unit 6: MainStack navigation wiring, Progress.md |
| 2026-07-27 | `328f14e` | Unit 7: LinksScreen with search/filter, ProfileScreen with KYC/trust/settings |

---

### Phase 8 — Ops, Reconciliation, Hardening

| | |
|---|---|
| **Branch** | `phase/8-ops-hardening` |
| **Spec** | [`23-Observability-and-Reconciliation.md`](for_agents/23-Observability-and-Reconciliation.md), [`24-Testing-Strategy.md`](for_agents/24-Testing-Strategy.md), [`21-Security-Threat-Model.md`](for_agents/21-Security-Threat-Model.md) |
| **Status** | ✅ Complete (275 backend tests, 23 files, typecheck clean) |
| **Started** | 2026-07-27 |
| **Gate passed** | 2026-07-27 |
| **Depends on** | Phase 7 |

#### Checklist

**Observability (42):**
- [x] Structured JSON logging (Pino), no secrets — `config/logger.ts`
- [x] Log sanitizer: regex scrubber for API keys, tokens, UUIDs, phone numbers — `utils/log-sanitizer.ts` (9 tests)
- [x] Correlation IDs on every request — `middleware/correlation-id.ts` (7 tests)
- [x] Request latency histogram (Prometheus) — `middleware/metrics-timer.ts` (4 tests)
- [x] In-memory metrics store with Prometheus scrape — `services/metrics.ts` (10 tests)
- [x] SLO alerting: heuristic latency, LLM inference, webhook ACK, auto-resolution rate — `services/alerting.ts` (9 tests)
- [x] Admin endpoints: `GET /admin/metrics`, `GET /admin/scheduler-status`

**Reconciliation (42):**
- [x] Daily reconciliation job: pooled balance vs. sub-ledger vs. partner statement — `jobs/reconciliation.ts` (11 tests)
- [x] Append-only ledger integrity check (checksums) — `jobs/ledger-integrity.ts` (11 tests)
- [x] Data retention/deletion scheduling (90-day sessions, 1-year notifications/messages) — `jobs/retention.ts` (7 tests)
- [x] Dispute exclusion: active disputes protected from retention purge
- [x] Job scheduler with configurable intervals — `jobs/scheduler.ts`

**Security hardening (40):**
- [x] Rate limits deployed per `21-Security-Threat-Model.md` §4 — all routes wired (4 tests)
- [x] Helmet/security headers configured
- [x] CORS locked to known origins
- [x] All secrets from env/secret store (SEC-01) — zero literals in code
- [x] HMAC webhook verification, replay defense, constant-time compare (Phase 3)
- [x] Auth middleware tests: JWT extraction, missing/bad token, role enforcement — `middleware/auth.test.ts` (10 tests)
- [x] Forensic capture tests: IP/fingerprint/network, AUD-02 compliance — `middleware/forensic.test.ts` (8 tests)

**Infrastructure:**
- [x] `docker-compose.yml` — Postgres 16, Redis 7.2, app, Ollama
- [x] `backend/Dockerfile` — multi-stage Node 20 Alpine build (builder + runner)
- [x] CI pipeline: typecheck → build → test (`.github/workflows/ci.yml`)
- [x] Sandbox deployment runbook updated (Production_manual.md §2.1 — 13 steps, all verified)

#### Sub-tasks log

| Date | Commit | Description |
|---|---|---|
| 2026-07-27 | `97703e3` | feat(ops): structured logging, correlation IDs, metrics, alerting, reconciliation, retention, rate limits, docker-compose, CI — 257 tests passing |
| 2026-07-27 | `6d30444` | feat(mobile): onboarding role selection, auth/forensic middleware tests, ShoppingBag icon — 275 tests total |
| 2026-07-27 | — | feat(infra): add Dockerfile, GitHub Actions CI (typecheck → build → test), update deployment runbook |

---

## Go-Live Gates

| Gate | Criteria | Status |
|---|---|---|
| **P0 → P1** | All Phase 1–8 tests green on sandbox; company registered; legal sign-off on interim custody | Pending (code ready; company/legal/infra pending) |
| **P1 → P2** | Partner trust-account agreement signed; custody swapped via `CUSTODY_PHASE`; reconciliation clean for N days | Not started |

---

## Audit Trail

> Record every phase gate decision, deployment, and significant finding here.

| Date | Event | Author | Notes |
|---|---|---|---|
| 2026-07-24 | Spec package complete (28 docs) | — | Implementation not yet started |
| 2026-07-24 | Audit remediation applied | — | C-1 fixed, docs archived, .env.example created, validation schemas + rate limits added |
| 2026-07-24 | Backend scaffold created | — | pnpm + TypeScript 7 strict + Express 5 + pg.Pool + Pino + node-pg-migrate; 3 migrations (schema, indexes/triggers, seed); CustodyProvider/PaymentRail interfaces + P0 sandbox impls; health check endpoint; forensic + request logging middleware |
| 2026-07-25 | Phase 1–5 complete | — | 111 tests passing across 7 files; state machine, escrow CRUD, webhooks, HMAC, idempotency, evidence SHA-256, heuristics, AI triage with P0 mock sandbox |
| 2026-07-25 | Phase 6 complete | — | 174 tests passing across 11 files; OTP auth (JWT+refresh), KYC tier enforcement, trust-score deterministic model, notification matrix, admin RBAC, 2 migrations (004, 005) |
| 2026-09-19 | P1 Paystack Integration | Agent | Implemented PaystackPaymentRail and PaystackCustodyProvider, updated webhook HMAC for Paystack signatures, configured dynamic P1 swapping based on CUSTODY_PHASE. |
| 2026-09-26 | Production-readiness audit | Agent | 146 engineering tasks and M1/M2/M3 launch gates recorded in [`task.md`](task.md). CI had been red on `main` since at least 2026-09-24 (9 failing backend tests, Docker build broken on Node 20). |
| 2026-09-26 | M1 engineering tasks (PR #19) | Agent | Security hygiene (T1.1, T1.2, T1.4, T1.5); CI green (T2.1, T2.2); Docker-runtime Render blueprint with pre-deploy migrations, boot-time config validation, `/health/ready` (T3.1–T3.7, T3.10, T3.12); trust proxy, `password_hash` migration + staff provisioning, OTP log redaction, CORS validation (T7.1, T7.3, T7.9, T7.21); webhook retry sweeper + dead letter (T6.1, T6.2, T6.3, T6.7). Also fixed: admin image could not start, admin session refresh, reconciliation `'0'` crash, every alert throwing. Remaining M1 items need repo-admin or infra access (task.md §19). |

---

## Summary

| Phase | Status | Tests | Gate |
|---|---|---|---|
| 1 — Data & Ledger | ✅ Complete | Schema (3 migrations) | ✅ |
| 2 — Core API & ACID | ✅ Complete | 54 | ✅ |
| 3 — Webhooks & Payments | ✅ Complete | 73 | ✅ |
| 4 — Evidence & Heuristics | ✅ Complete | 87 | ✅ |
| 5 — AI Triage | ✅ Complete | 111 | ✅ |
| 6 — Identity, KYC, Notif, Admin | ✅ Complete | 174 | ✅ |
| 7 — Frontend | ✅ Complete | 42 unit + 37 E2E | ✅ |
| 8 — Ops, Reconciliation, Hardening | ✅ Complete | 285 (backend total) | ✅ |
| 2026-09-24 | God-Tier Design UI | Agent | Rebuilt admin dashboard using nested bento UI design system across 6 major views, renamed routes, added real-time ledger view. |
