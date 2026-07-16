# Social Commerce Escrow Platform — AI Agent Implementation Roadmap & Progress Tracker (Progress.md)

This living document organizes the complete implementation of the Social Escrow platform into structured phases. AI engineering agents must update item statuses (`[ ]` uncompleted, `[/]` in-progress, `[x]` completed) as work progresses.

---

## Phase 1: Database Schema, Indexes & Forensic Ledger Setup
- [ ] **1.1 PostgreSQL Database Initialization**
  - [ ] Configure PostgreSQL 16+ database container (`docker-compose.yml`) with `uuid-ossp` extension enabled.
  - [ ] Implement DDL scripts for all 5 core tables (`users`, `escrow_transactions`, `transaction_ledger`, `evidence_artifacts`, `dispute_cases`).
  - [ ] Enforce strict financial data types (`NUMERIC(15,2)` for currency, `INET` for IP addresses, `JSONB` for AI payloads).
- [ ] **1.2 Performance & Anti-Fraud Index Engineering**
  - [ ] Create `idx_evidence_sha256` index on `evidence_artifacts(sha256_hash)` for instant recycled photo detection.
  - [ ] Create composite `idx_ledger_forensics` index on `transaction_ledger(ip_address, device_id)` for Sybil velocity checks.
  - [ ] Create `idx_ledger_transaction_time` index on `transaction_ledger(transaction_id, created_at ASC)`.
  - [ ] Create partial unique index `idx_single_deposit_per_transaction` on `transaction_ledger(transaction_id) WHERE event_type = 'FUNDS_DEPOSITED'`.
  - [ ] Create GIN index `idx_disputes_ai_payload` on `dispute_cases USING GIN (ai_reasoning_payload)`.
- [ ] **1.3 Database Security & Trigger Enforcement**
  - [ ] Revoke `UPDATE` and `DELETE` database privileges on `transaction_ledger` for application users.
  - [ ] Write PostgreSQL trigger ensuring `escrow_transactions.updated_at` syncs on row modification.

---

## Phase 2: Backend Core API, Pool Management & ACID Transactions
- [ ] **2.1 Node.js & TypeScript Server Scaffold**
  - [ ] Initialize Express/Fastify TypeScript project with strict compiler settings (`tsconfig.json`).
  - [ ] Configure `pg.Pool` with connection pool limits (`max: 20`, `idleTimeoutMillis: 30000`) and graceful shutdown hooks.
- [ ] **2.2 Escrow Lifecycle Endpoints (`/v1/escrow`)**
  - [ ] Implement `POST /v1/escrow` to create contract and return WhatsApp-ready shareable payment link (`https://app.escrow.co/pay/trx_<id>`).
  - [ ] Implement `GET /v1/escrow/:id` with Redis caching to fetch current contract status and item details.
  - [ ] Implement `POST /v1/escrow/:id/confirm-delivery` with client `Idempotency-Key` validation and automated MoMo vendor payout.
- [ ] **2.3 Concurrency & ACID Row Locking Service**
  - [ ] Implement dedicated client checkout `pool.connect()` wrapper for atomic transactions.
  - [ ] Write `processDepositWebhook` service utilizing `SELECT FOR UPDATE` explicit row lock.
  - [ ] Add explicit error handling for PostgreSQL error code `23505` (Unique Violation) defensively caught by `idx_single_deposit_per_transaction`.
  - [ ] Enforce `client.release()` inside `finally` blocks across all transactional services.

---

## Phase 3: Webhook Hardening & Asynchronous Payment Ingestion
- [ ] **3.1 Raw Buffer & HMAC Security Middleware**
  - [ ] Configure Express `verify` hook on body parser to preserve raw unparsed buffer (`req.rawBody`).
  - [ ] Write `verifyMoMoWebhook` middleware checking `x-momo-signature` and `x-momo-timestamp`.
  - [ ] Implement Replay Attack rejection for timestamps older than 300 seconds (5 minutes).
  - [ ] Implement Timing Attack protection using `crypto.timingSafeEqual()`.
- [ ] **3.2 Fast-Response & Idempotency Gate**
  - [ ] Implement Redis `SETNX` idempotency check for incoming transaction webhooks.
  - [ ] Ensure route handler returns `200 OK` in `< 500ms` before running asynchronous background database tasks.

---

## Phase 4: Deterministic SQL Heuristics & Media Hashing
- [ ] **4.1 Evidence Upload & On-The-Fly SHA-256 Hashing (`/v1/evidence`)**
  - [ ] Implement multipart file upload endpoint (`POST /v1/evidence/upload`).
  - [ ] Compute SHA-256 cryptographic hash of incoming files via Node `crypto.createHash('sha256')`.
  - [ ] Upload file binary to S3/R2 and record SHA-256 hash alongside IP and device ID in `evidence_artifacts`.
- [ ] **4.2 Sub-Second SQL Heuristic Engine**
  - [ ] Implement Query A: Zero-day recycled proof detector (`sha256_hash = $1 AND transaction_id != $2`).
  - [ ] Implement Query B: Sybil velocity check counting distinct accounts/disputes per IP/Device ID in 24 hours.
  - [ ] Implement Query C: Account age and trust score profile check.
  - [ ] Build cascading heuristic gate (Rule 1: Recycled Photo -> Auto-Ban; Rule 2: Sybil Velocity -> Freeze Accounts; Rule 3: Burner Account -> Route to Human Review; Rule 4: Pass -> Trigger AI).

---

## Phase 5: Local AI Dispute Arbitrator Integration
- [ ] **5.1 Local LLM Inference Service Integration**
  - [ ] Connect Node.js backend to local open-weights inference server (Gemma 4 / Llama 3 via vLLM/Ollama REST API).
- [ ] **5.2 Prompt Engineering & Structured JSON Validation**
  - [ ] Embed exact impartial arbitrator System Prompt enforcing raw JSON output without markdown block syntax.
  - [ ] Implement JSON Schema validation parsing `reasoning_steps` array, float `confidence_score` (0.000–1.000), `recommended_action`, and `summary_for_users`.
- [ ] **5.3 Autonomous Execution Engine**
  - [ ] Build auto-adjudication worker: If `confidence_score >= 0.900`, automatically execute `REFUND_BUYER` or `RELEASE_VENDOR` smart contract state transition.
  - [ ] Route low-confidence (`< 0.900`) or `ESCALATE_HUMAN` decisions to human reviewer dashboard queue.

---

## Phase 6: Cross-Platform Flutter Frontend Architecture
- [ ] **6.1 Flutter Project & Dio Client Setup**
  - [ ] Scaffold Flutter app with Material 3 / custom design system theme.
  - [ ] Configure `ApiClient` singleton with 10-second connect/receive timeouts.
- [ ] **6.2 Forensic Interceptor (`FintechForensicInterceptor`)**
  - [ ] Implement custom Dio interceptor capturing hardware ID (`device_info_plus`) and network type (`connectivity_plus`).
  - [ ] Inject `X-Device-Fingerprint`, `X-Network-Type`, `X-App-Version`, and `X-Client-Timestamp` headers automatically on every request.
  - [ ] Auto-generate `Idempotency-Key` UUIDv4 headers for all `POST`, `PUT`, and `DELETE` requests.
- [ ] **6.3 UI/UX Implementation ("Calm Over Confrontation")**
  - [ ] Build `DisputeStatusCard` widget with approachable geometry (16dp rounded corners, muted slate background `#F4F6F9`).
  - [ ] Build structured vertical Progress Tracker timeline.
  - [ ] Implement micro-empathy copywriting strings across all dispute and escrow status screens.

---

## Phase 7: Verification, Stress Testing & Security Audit
- [ ] **7.1 Concurrency & Race Condition Stress Testing**
  - [ ] Run load test firing 50 concurrent webhooks for the exact same `transaction_id` to verify zero double-deposits and clean PostgreSQL `23505` error traps.
- [ ] **7.2 Forensic & Anti-Fraud Suite Verification**
  - [ ] Test SHA-256 photo recycling tripwire across different user accounts.
  - [ ] Test Sybil velocity lockout with simulated IP/device flood.
