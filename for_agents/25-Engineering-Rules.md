# Croe — Engineering Rules (`25-Engineering-Rules.md`)

> Mandatory for all agents and developers. Any code/PR violating these is rejected. Each rule maps to a Global Constraint or a subsystem doc. Terms per [`26-Glossary.md`](26-Glossary.md).

## 1. Financial Precision
- **FIN-01 — No floats for money.** Never JS `number` float arithmetic or SQL `FLOAT`/`DOUBLE PRECISION` for amounts. Use `NUMERIC(15,2)` and decimal strings / integer minor units.
- **FIN-02 — Explicit currency.** Every amount carries a currency code; never add/compare across currencies without an audited conversion entry.

## 2. Concurrency & ACID
- **DB-01 — Dedicated client for transactions.** Use `await pool.connect()` and run all of `BEGIN…COMMIT` on that one client. Never `pool.query()` inside a transaction.
- **DB-02 — Explicit `FOR UPDATE`.** Any status read before a money mutation acquires a row lock: `SELECT current_status FROM escrow_transactions WHERE transaction_id=$1 FOR UPDATE`.
- **DB-03 — `finally` release.** Every transactional function releases the client in `finally`.
- **DB-04 — Trap `23505`.** Catch the partial-unique-index violation and treat it as a safely-defended duplicate.

## 3. Money Movement
- **MONEY-01 — Pay then ledger.** Write the `−amount` ledger event and `payouts.SUCCESS` only **after** the provider confirms success, in one DB transaction ([`12`](06-Money-Custody-and-Settlement.md) §6).
- **MONEY-02 — Custody phase annotation.** Every money-touching feature states which custody phase(s) (P0–P3) it applies to.
- **MONEY-03 — Provider abstraction only.** Escrow/dispute logic calls `CustodyProvider`/`PaymentRail`; never an aggregator SDK directly.

## 4. Webhooks & Security
- **WH-01 — Raw-buffer HMAC.** Verify signatures over `req.rawBody`, never parsed JSON.
- **WH-02 — Replay window.** Reject `|now − timestamp| > 300s`.
- **WH-03 — Constant-time compare.** Use `crypto.timingSafeEqual` after a length check; never `===`.
- **WH-04 — Fast 200.** ACK `200` in < 500 ms, then process asynchronously.
- **SEC-01 — No secrets in code/docs/logs.** All secrets from env/secret store.

## 5. Forensics & Audit
- **AUD-01 — Append-only.** Never `UPDATE`/`DELETE` `transaction_ledger`; append a new row per transition. App role lacks those grants.
- **AUD-02 — Silent header forensics.** Persist `X-Device-Fingerprint`, `X-Network-Type`, and `req.ip` on mutating actions — from headers, never the body.
- **AUD-03 — SHA-256 media.** Hash every upload on the fly and check for cross-transaction reuse before it can influence a dispute.

## 6. AI Arbitrator
- **AI-01 — Deterministic pre-filter.** Never send a claim to the LLM before the three SQL heuristics pass.
- **AI-02 — Strict JSON.** Enforce raw-JSON output (no markdown fences) matching the schema; discard/repair invalid output.
- **AI-03 — Confidence gate.** Autonomous `REFUND_BUYER`/`RELEASE_VENDOR` only at `confidence ≥ 0.900`; else `UNDER_HUMAN_REVIEW`.
- **AI-04 — Local only.** Dispute/user data never leaves for a third-party LLM API.

## 7. Frontend
- **UI-01 — React Native + TypeScript only.** No Flutter/Dart anywhere.
- **UI-02 — Idempotency headers.** Every mutating request injects a UUIDv4 `Idempotency-Key` via the interceptor; retries reuse a stable key per intent.
- **UI-03 — No alarmist visuals.** No crimson for dispute/hold screens; calm blues/slate/amber ([`32`](20-Design-System.md)).
- **UI-04 — Empathetic copy.** No backend enums/stack traces shown to users.

## 8. Product & Consistency
- **BRAND-01 — Croe branding.** Product/app is "Croe"; no `escrow.co` placeholders.
- **TERM-01 — Glossary terms only.** Use the canonical state/event/action names from [`45`](26-Glossary.md); no synonyms.
- **COST-01 — Prefer free/local in P0/P1.** Don't provision paid infra before its phase; document aggregator/partner fees as **[verify]** until confirmed.

## 9. Delivery & Process
- **PROC-01 — Phase gate (production-grade before advancing).** No implementation phase in [`27-Roadmap.md`](27-Roadmap.md) may start until the previous phase is **production-grade, complete, and tested**. A phase is "done" only when: every item is fully implemented to spec (no stubs, leftover mocks, `TODO`s, or "wire up later"); all of the relevant doc's **acceptance criteria** are met; tests exist and pass per [`24-Testing-Strategy.md`](24-Testing-Strategy.md) (incl. concurrency, money-precision, and fraud tests where relevant); the rules in this doc are satisfied; observability + reconciliation are wired wherever money is touched; and it has been **verified end-to-end** (actually run, not just unit-green).
- **PROC-02 — No Claude co-authorship in commits.** Git commit messages must never include a `Co-Authored-By: Claude…` trailer or any Claude attribution.
- **GIT-01 — Branch per phase, commit per unit.** Every implementation phase MUST be developed on a dedicated branch (`phase/<N>-<slug>`) created from `main` before any code is written. Work is committed after each self-contained unit (one logical change that passes lint, typecheck, and tests independently) — never at the end of the phase. Every commit must pass `typecheck`, `lint`, and existing tests; broken code is never committed. The phase branch merges to `main` via squash-merge only after the phase gate (PROC-01) is satisfied, with message format `feat(phase-<N>): <description>`. The branch is deleted after merge. Branch names and full convention are defined in [`Progress.md`](../Progress.md).
- **PROC-03 — Production manual is a living document.** [`Production_manual.md`](../Production_manual.md) must be updated in the same commit as any change that affects production readiness. Concretely: if you add a new secret, endpoint, service, migration, dependency, deployment step, or runbook entry during implementation, update the corresponding section of `Production_manual.md` in that commit. If you discover a new production requirement not yet covered by a section, create the section. The manual is never "done later" — it ships with the code.

## 10. Coverage Check (Global Constraints → rule)
Product name → BRAND-01 · RN stack → UI-01 · Money type → FIN-01/02 · Custody phased → MONEY-02 · Ledger append-only → AUD-01 · No legal-advice/secrets → SEC-01 · Authoring standard → enforced per-doc · Terminology → TERM-01 · Phase discipline → PROC-01 · Commit convention → PROC-02 · Branch/commit workflow → GIT-01 · Production manual currency → PROC-03.
