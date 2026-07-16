# Croe — Testing Strategy (`43-Testing-Strategy.md`)

> Every NFR/KPI in [`01-PRD.md`](01-PRD.md) maps to a test here. Custody phase: tests run against P0 sandbox.

## 1. Test Pyramid

| Level | Scope | Tools (pin in [`41`](41-Infra-and-Deployment.md)) |
| :--- | :--- | :--- |
| **Unit** | pure logic: money math, state guards, heuristic rules, JSON-schema validation | Jest / Vitest |
| **Integration** | service + real Postgres/Redis (test containers): transactions, locks, idempotency | Jest + Testcontainers |
| **Contract** | against aggregator **sandbox**: deposit, webhook, payout | sandbox keys |
| **E2E** | full flows via API (and RN via Detox where useful) | supertest / Detox |
| **Load/concurrency** | race conditions, throughput | k6 / custom harness |

## 2. Critical Tests (must exist)

### 2.1 Concurrency race (the headline test)
Fire **50 concurrent identical deposit webhooks** for one `transaction_id`:
- **Expect:** exactly one `FUNDS_DEPOSITED` ledger row, final state `FUNDS_SECURED`, zero double-funding, `23505` traps counted and treated as safe (no 5xx).

### 2.2 Idempotency
- Same `Idempotency-Key` replayed → identical response, single side-effect.
- Same key, different body → `409 IDEMPOTENCY_KEY_CONFLICT`.
- Durable: restart the worker mid-batch → still no duplicate processing (`webhook_inbox`).

### 2.3 Money precision
- Commission and payouts computed in `NUMERIC(15,2)`; property test across many amounts → **zero float drift**; `vendor_net + commission == amount` exactly.

### 2.4 Fraud heuristics
- **Recycled photo:** same SHA-256 across two transactions → `FRAUD_LOCKOUT`, trust −50.
- **Sybil velocity:** simulate N accounts/disputes from one device/IP in 24h → freeze at threshold.
- **Burner account:** age < 48h + trust < 50 → `UNDER_HUMAN_REVIEW`.

### 2.5 Webhook security
- Bad HMAC → `401`; expired timestamp → `401`; valid → processed once.

### 2.6 AI triage
- Malformed LLM output → repair-or-escalate; `confidence < 0.900` → human review; valid high-confidence → auto action (mocked disbursement).

### 2.7 Auth
- Expired/consumed OTP rejected; brute-force lockout; refresh rotation; device-mismatch flag.

## 3. NFR/KPI → Test Map

| NFR/KPI | Test |
| :--- | :--- |
| No float drift (NFR-FIN-1) | 2.3 |
| Double-spend immunity (NFR-FIN-2) | 2.1 |
| Idempotency (NFR-FIN-3) | 2.2 |
| Heuristics < 50 ms (NFR-PERF-1) | perf assertion in 2.4 |
| LLM < 5 s (NFR-PERF-2) | 2.6 timing |
| Webhook < 500 ms (NFR-PERF-3) | 2.5 timing |
| Append-only (NFR-AUD-1) | integration: `UPDATE`/`DELETE` on ledger fails for app role |
| 0 double-spend (KPI-3) | 2.1 |

## 4. Test Data & Environments

- Seed users across KYC tiers/trust scores; seed evidence with known hashes for recycled tests.
- Aggregator **sandbox** for all payment contract tests; never hit live in CI.
- CI runs unit + integration + contract on every PR ([`41`](41-Infra-and-Deployment.md)).

## 5. Acceptance Criteria

- The 50-webhook race test exists and passes deterministically.
- Every PRD NFR and KPI has at least one corresponding automated test.
- No test depends on live payments or real money.
- Money-precision tests assert exact equality, not approximate.
