# Social Commerce Escrow Platform — Strict Engineering & Coding Rules (Rules.md)

These engineering rules are mandatory for all AI agents and developers modifying or extending the Social Escrow codebase. Any code generation or pull request violating these rules must be rejected immediately.

---

## 1. Financial Precision & Currency Safety Rules
- **RULE-FIN-01 (No Floating-Point Math)**: NEVER use JavaScript/TypeScript `number` floating-point arithmetic or SQL `FLOAT` / `DOUBLE PRECISION` for monetary amounts. Always use PostgreSQL `NUMERIC(15,2)` and TypeScript fixed-point arithmetic libraries (or integer cents representation via `BigInt`).
- **RULE-FIN-02 (Strict Currency Scoping)**: Every monetary calculation must explicitly specify and compare currency codes (`GHS`, `NGN`, `KES`). Never add or compare balances across different currencies without an explicit exchange rate conversion audit entry.

---

## 2. ACID Concurrency & Database Transaction Rules
- **RULE-DB-01 (Dedicated Client Pool Checkout)**: When executing row-level locks or multi-step database transactions (`BEGIN ... COMMIT`), you MUST checkout a dedicated client connection (`await pool.connect()`) and execute all queries on that exact `client` instance. NEVER call `pool.query()` inside a transaction block.
- **RULE-DB-02 (Explicit FOR UPDATE Locking)**: Any operation reading `escrow_transactions` status prior to a financial mutation (deposit, release, refund) MUST acquire a pessimistic row lock:
  ```sql
  SELECT current_status FROM escrow_transactions WHERE transaction_id = $1 FOR UPDATE;
  ```
- **RULE-DB-03 (Mandatory `finally` Release)**: Every transactional service function MUST wrap its database operations in `try / catch / finally` and call `client.release()` inside the `finally` block to prevent connection pool exhaustion.
- **RULE-DB-04 (Catch Constraint Violations)**: Backend handlers must explicitly trap PostgreSQL Error Code `23505` (Unique Constraint Violation) thrown by `idx_single_deposit_per_transaction` and treat it as a safely defended duplicate request (return `200 OK` or structured idempotency response).

---

## 3. Webhook Cryptography & Security Rules
- **RULE-WEBHOOK-01 (Raw Buffer HMAC Computation)**: Webhook signatures (`x-momo-signature`) MUST be verified against the unparsed raw request buffer (`req.rawBody`). NEVER compute HMAC over Express-parsed JSON objects (`req.body`).
- **RULE-WEBHOOK-02 (Replay Attack Expiry)**: All webhook handlers must inspect `x-momo-timestamp` and reject requests where `|currentTime - webhookTime| > 300 seconds` (5 minutes).
- **RULE-WEBHOOK-03 (Constant-Time String Comparison)**: All HMAC signature comparisons MUST use `crypto.timingSafeEqual(expectedBuffer, computedBuffer)` after verifying buffer lengths. NEVER use standard equality operators (`===` or `==`).
- **RULE-WEBHOOK-04 (Fast-Response Acknowledgment)**: Webhook receivers must acknowledge receipt with HTTP `200 OK` within `500ms` before executing heavy background SQL or AI triage tasks.

---

## 4. Digital Forensics & Audit Rules
- **RULE-AUDIT-01 (Append-Only State Changes)**: Never update or overwrite historical status entries. Every contract transition must append a new immutable row to `transaction_ledger`.
- **RULE-AUDIT-02 (Silent Header Forensics)**: All mutating API endpoints must extract client forensic headers (`X-Device-Fingerprint`, `X-Network-Type`, client IP via `req.ip`) and persist them into `transaction_ledger` or `evidence_artifacts`.
- **RULE-AUDIT-03 (SHA-256 Media Verification)**: Every uploaded photo or document must be hashed (`SHA-256`) on upload and queried against `evidence_artifacts` (`sha256_hash = $1 AND transaction_id != $2`). Matching hashes must instantly trigger automated fraud rejection.

---

## 5. AI Dispute Arbitrator Rules
- **RULE-AI-01 (Deterministic Pre-Filtering)**: NEVER pass user dispute claims directly to the LLM without first running deterministic SQL security queries (Query A: SHA-256 Check; Query B: Sybil Velocity; Query C: Account Age/Trust).
- **RULE-AI-02 (Strict JSON Output)**: LLM system prompts must enforce raw valid JSON output matching the target schema (`reasoning_steps`, float `confidence_score`, `recommended_action`, `summary_for_users`) and explicitly prohibit markdown code block wrappers (`````json `````).
- **RULE-AI-03 (Confidence Threshold Gate)**: Autonomous state execution (`REFUND_BUYER` / `RELEASE_VENDOR`) may ONLY occur if `ai_confidence_score >= 0.900`. Any score `< 0.900` must route to `UNDER_HUMAN_REVIEW`.

---

## 6. Frontend UI/UX & Networking Rules
- **RULE-UI-01 (No Alarmist Visuals)**: Never use sharp crimson warning reds (`#FF0000`) for dispute or hold screens. Use calming slate grays, deep blues, and muted amber.
- **RULE-UI-02 (Idempotency Header Injection)**: All mutating HTTP requests (`POST`, `PUT`, `DELETE`) from Flutter MUST inject a unique UUIDv4 `Idempotency-Key` header via `FintechForensicInterceptor`.
