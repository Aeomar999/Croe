# Croe Spec Package — Authoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the complete, ship-ready Croe spec package — 28 interlocking specification documents in `for_agents/` — governed by the approved blueprint at `docs/superpowers/specs/2026-07-16-escrow-spec-package-design.md`.

**Architecture:** This is a *documentation* deliverable, not code. Tasks are sequenced in 5 dependency waves so shared vocabulary and interfaces exist before the docs that consume them. Existing `for_agents/*.md` files are upgraded in place; new files are created. Raw transcripts in `docs/` are reference-only and are not edited.

**Tech Stack (of the product being specified):** Backend Node.js 20 LTS + TypeScript 5.4 (strict), Express/Fastify, PostgreSQL 16+, Redis 7.2+. Client React Native + TypeScript. Local open-weights LLM (self-hosted via Ollama/vLLM). MoMo via aggregator (Paystack/Flutterwave/Hubtel). Docs are GitHub-flavored Markdown with Mermaid diagrams.

## Global Constraints

Every task's output must obey these, copied verbatim from the blueprint:

- **Product name:** the app is **Croe**. All branding, deep-links, identifiers, and copy use it. No generic `escrow.co` placeholders survive.
- **Client stack:** **React Native + TypeScript**. No Flutter/Dart references survive the upgrade.
- **Money:** always `NUMERIC(15,2)` + explicit currency code (`GHS`, `NGN`, `KES`); never floats/`DOUBLE PRECISION`; never cross-currency arithmetic without an audited conversion entry.
- **Custody is phased:** P0 aggregator sandbox → P1 aggregator live pilot → P2 partner-held trust account → P3 own EPSP/DEMI license. Any money-touching behavior states which phase(s) it applies to. The `transaction_ledger` is the authoritative sub-ledger across all phases.
- **Market:** global architecture, **Ghana first**. Money movement sits behind `CustodyProvider` / `PaymentRail` abstractions; Ghana/MoMo is the first concrete implementation.
- **Ledger is append-only:** never `UPDATE`/`DELETE` historical rows; every state change appends to `transaction_ledger`. App DB role has `UPDATE`/`DELETE` revoked on it.
- **Not legal advice:** exact BoG license tiers, minimum-capital figures, and KYC/AML thresholds are marked "verify" rather than asserted with false precision. No real secrets/keys in any doc.
- **Authoring standard (§8 of blueprint):** every subsystem/API doc contains — Purpose & boundaries · Data contracts (exact schemas) · State & transitions · All error/edge cases · Acceptance criteria · Cross-references · Custody-phase awareness.
- **Terminology:** defined once in `45-Glossary.md`, referenced everywhere; one canonical name per state/event/actor/phase (no synonym drift).

## How to read a task

Each task authors one document. Steps are: **(1)** draft the listed sections with the specified content, **(2)** self-check against `45-Glossary.md` + `44-Engineering-Rules.md` for naming/rule consistency, **(3)** verify the acceptance criteria are all met, **(4)** checkpoint (commit if git initialized — see Task 0). "Consumes/Produces" lists the shared terms or interfaces the doc relies on or establishes, so out-of-order authoring stays consistent.

---

## File Structure

All canonical specs live in `for_agents/`. Prefix = reading order (00s foundation, 10s architecture/money, 20s subsystems, 30s API/client, 40s ops, 90s delivery).

```
for_agents/
  00-Overview.md              (new, written last)
  01-PRD.md                   (upgrade of PRD.md)
  02-Market-and-Regulatory.md (new)
  03-Business-Model-and-Costs.md (new)
  10-Architecture.md          (upgrade of Architecture.md)
  11-Data-Model.md            (upgrade of Schema.md)
  12-Money-Custody-and-Settlement.md (new)
  13-Escrow-Lifecycle.md      (upgrade of AppFlow.md)
  20-Identity-Auth.md         (new)
  21-KYC-and-AML.md           (new)
  22-Payments-Collection.md   (new)
  23-Payouts-Refunds.md       (new)
  24-Webhooks-and-Idempotency.md (new; absorbs webhook parts of Security.md)
  25-Disputes-and-AI-Triage.md (upgrade; absorbs AI/heuristic parts)
  26-Evidence-and-Forensics.md (new; absorbs evidence parts)
  27-Notifications.md         (new)
  28-Admin-Console.md         (new)
  29-Trust-Score-and-Anti-Fraud.md (new)
  30-API-Reference.md         (new)
  31-Frontend-React-Native.md (new; replaces Flutter content)
  32-Design-System.md         (upgrade of Design.md → React Native)
  40-Security-Threat-Model.md (upgrade of Security.md)
  41-Infra-and-Deployment.md  (new; absorbs Techstack.md backend/infra)
  42-Observability-and-Reconciliation.md (new)
  43-Testing-Strategy.md      (new)
  44-Engineering-Rules.md     (upgrade of Rules.md)
  45-Glossary.md              (new)
  90-Roadmap.md               (upgrade of Progress.md)
```

Legacy files to remove/replace once superseded: `Techstack.md` (split into 31/10/41), `PRD.md`→`01`, `Architecture.md`→`10`, `Schema.md`→`11`, `AppFlow.md`→`13`, `Design.md`→`32`, `Security.md`→`40`+`24`, `Rules.md`→`44`, `Progress.md`→`90`. Handle renames within each relevant task.

---

## Task 0: Repo & workspace setup

**Files:** `.gitignore` (create), `for_agents/` (existing)

- [ ] **Step 1:** If the user has approved git, run `git init` in the project root and add a `.gitignore` (ignore `node_modules/`, `.env`, `.remember/`, OS files). If git is declined, skip commits throughout and treat each "checkpoint" as "save file."
- [ ] **Step 2:** Confirm `for_agents/` contains the 9 legacy files; confirm the blueprint exists at `docs/superpowers/specs/2026-07-16-escrow-spec-package-design.md`.
- [ ] **Step 3 (checkpoint):** `git add -A && git commit -m "chore: initialize Croe spec package workspace"` (if git enabled).

---

## WAVE 1 — Vocabulary & Spine

### Task 1: `45-Glossary.md` (authored first — everything references it)

**Files:** Create `for_agents/45-Glossary.md`
**Produces:** the canonical term set every other doc uses.

- [ ] **Step 1 — draft these sections:**
  - **Actors:** Vendor, Buyer, Platform (Croe), Human Reviewer (L3), System/AI, Custody Partner, Payment Aggregator.
  - **Escrow states (canonical, single set):** `LINK_CREATED`, `AWAITING_DEPOSIT`, `FUNDS_SECURED`, `SHIPPED`, `DELIVERED_CONFIRMED`, `FUNDS_RELEASED`, `DISPUTE_OPENED`, `AI_PROCESSING`, `UNDER_HUMAN_REVIEW`, `RESOLVED_AUTO`, `FUNDS_REFUNDED`, `FRAUD_LOCKOUT`, `EXPIRED`, `CANCELLED`. Define each in one line. (Resolve the legacy `READY_TO_SHIP`/`DISPATCHED` drift here — collapse to `SHIPPED`.)
  - **Ledger event types:** `LINK_CREATED`, `BUYER_CLAIMED`, `FUNDS_DEPOSITED`, `SHIPPED`, `DELIVERY_CONFIRMED`, `FUNDS_RELEASED`, `DISPUTE_OPENED`, `EVIDENCE_ADDED`, `FRAUD_FLAGGED`, `REFUND_ISSUED`, `PAYOUT_INITIATED`, `PAYOUT_FAILED`.
  - **Custody phases:** P0/P1/P2/P3 one-liners (from Global Constraints).
  - **Reason codes:** `ITEM_NOT_RECEIVED`, `ITEM_DAMAGED`, `WRONG_ITEM`, `ITEM_NOT_AS_DESCRIBED`.
  - **AI actions:** `REFUND_BUYER`, `RELEASE_VENDOR`, `ESCALATE_HUMAN`.
  - **KYC tiers:** Tier 0/1/2 one-liners.
  - **Money terms:** float, pooled trust account, sub-ledger, settlement, disbursement, reconciliation.
- [ ] **Step 2 — self-check:** every term is lowercase-defined once; no synonyms.
- [ ] **Acceptance:** ≥ all states/events used anywhere in the blueprint appear here; legacy state drift resolved.
- [ ] **Step 3 — checkpoint.**

### Task 2: `01-PRD.md` (upgrade of `PRD.md`)

**Files:** Modify/rename `for_agents/PRD.md` → `for_agents/01-PRD.md`
**Consumes:** glossary states, custody phases.

- [ ] **Step 1 — draft sections:** Executive summary (name it **Croe**); 3 personas (Vendor, Buyer, L3 Reviewer); functional requirements (link gen, deposit, ship, confirm, dispute, payout, refund, notifications, admin); **non-goals** (no in-app chat v1, no delivery-rider integration v1, no own-license v1); NFRs (idempotency, latency, auditability); **KPIs** (≥80% auto-triage, 0 double-spends, <10s median auto-resolution, <0.5% false fraud lockouts); user-journey diagrams (happy path + dispute) as Mermaid.
- [ ] **Step 2 — self-check** against glossary; replace all Flutter/`escrow.co` references.
- [ ] **Acceptance:** every functional requirement traces to a later subsystem doc; no MoMo-holds-money-directly language (re-grounded in custody phases).
- [ ] **Step 3 — checkpoint.**

### Task 3: `02-Market-and-Regulatory.md` (new)

**Files:** Create `for_agents/02-Market-and-Regulatory.md`
**Consumes:** custody phases.

- [ ] **Step 1 — draft sections:** Ghana market context (MoMo dominance: MTN/Telecel/AirtelTigo); Bank of Ghana / Payment Systems & Services Act 2019 overview; **why holding escrow funds is regulated**; the 4 custody phases as the legal path; KYC/AML obligations (customer due diligence, record-keeping, suspicious-activity reporting) — figures marked "verify"; data-protection (Ghana Data Protection Act) note for forensic logging; global-expansion notes (Kenya/M-Pesa, Nigeria/CBN) as future `PaymentRail`s; **explicit "get a Ghanaian fintech lawyer" callout**.
- [ ] **Step 2 — self-check:** all uncertain figures marked "verify"; no legal-advice framing.
- [ ] **Acceptance:** each custody phase has its legal standing stated; no invented capital numbers.
- [ ] **Step 3 — checkpoint.**

### Task 4: `03-Business-Model-and-Costs.md` (new)

**Files:** Create `for_agents/03-Business-Model-and-Costs.md`
**Consumes:** custody phases, market doc.

- [ ] **Step 1 — draft sections:** Revenue model (commission % on release; who pays — buyer/vendor/split); **cost realities table per phase** (P0 ≈ 0 GHS; P1 pay-as-you-go ~1.5–2%/txn + company reg; P2 partner deal + due diligence; P3 millions GHS min-capital "verify"); unit economics worked example (e.g., 450 GHS order, X% commission, aggregator fee, net); **student-budget path** (build free on sandbox + local LLM, pilot small, migrate when traction); break-even sketch.
- [ ] **Step 2 — self-check:** money as `NUMERIC(15,2)`; percentages sourced/"verify".
- [ ] **Acceptance:** cost of each phase explicit; a reader knows what launching actually costs.
- [ ] **Step 3 — checkpoint.**

---

## WAVE 2 — Architecture & Money Core

### Task 5: `10-Architecture.md` (upgrade of `Architecture.md`)

**Files:** Modify/rename → `for_agents/10-Architecture.md`
**Produces:** `CustodyProvider` / `PaymentRail` interface names consumed by 12/22/23.

- [ ] **Step 1 — draft sections:** Architectural principles (zero-trust ingestion, fail-fast security, DB-enforced ACID, immutable ledger, **provider abstraction**); high-level system diagram (Mermaid) with RN client, API tier, data tier, local AI, aggregator, custody partner; service boundaries (Escrow, Custody/Settlement, Payments, Evidence, Dispute/Triage, Identity, Notifications, Admin); the **`CustodyProvider` interface** (methods: `collect()`, `hold()`, `releaseTo()`, `refundTo()`, `getBalance()`, `reconcile()`) and **`PaymentRail` interface**; concurrency/double-spend engine (Mermaid sequence); global-vs-Ghana mapping.
- [ ] **Step 2 — self-check:** interface method names are exact and reused verbatim by tasks 6/7/10/11.
- [ ] **Acceptance:** every service in 20s–40s has a boundary here; abstractions named.
- [ ] **Step 3 — checkpoint.**

### Task 6: `11-Data-Model.md` (upgrade of `Schema.md`)

**Files:** Modify/rename → `for_agents/11-Data-Model.md`
**Consumes:** glossary states/events. **Produces:** table/column names for all subsystem docs.

- [ ] **Step 1 — draft sections:** Full PostgreSQL DDL for existing 5 tables (`users`, `escrow_transactions`, `transaction_ledger`, `evidence_artifacts`, `dispute_cases`) **plus new tables**: `custody_accounts`, `payouts`, `kyc_records`, `auth_sessions`, `otp_challenges`, `idempotency_keys`, `webhook_inbox`, `notifications`; add **`CHECK` constraints / lookup tables** for all enum-like columns (states, event types, reason codes, KYC tiers); all indexes (incl. `idx_evidence_sha256`, `idx_ledger_forensics`, `idx_single_deposit_per_transaction` partial unique, GIN on AI payload); triggers (`updated_at`); permissions (`REVOKE UPDATE, DELETE ON transaction_ledger`); a **migrations** note (tool: e.g. node-pg-migrate / Prisma — pin in 41).
- [ ] **Step 2 — self-check:** every column referenced by later docs exists; states match glossary exactly.
- [ ] **Acceptance:** no enum column without a constraint; sub-ledger balance derivation documented.
- [ ] **Step 3 — checkpoint.**

### Task 7: `12-Money-Custody-and-Settlement.md` (new — the backbone)

**Files:** Create `for_agents/12-Money-Custody-and-Settlement.md`
**Consumes:** `CustodyProvider` (task 5), `custody_accounts`/`transaction_ledger`/`payouts` (task 6).

- [ ] **Step 1 — draft sections:** Pooled trust account model; **per-transaction sub-ledger** (how `transaction_ledger` derives each transaction's owned balance); float management; deposit→hold→release/refund money flow (Mermaid); **reconciliation** against partner/aggregator statements (daily job, mismatch handling); the concrete `CustodyProvider` implementations per phase (P0 sandbox, P1 aggregator-live, P2 partner-held); invariants (sum of sub-ledger balances == pooled balance); failure modes (partial payout, stuck float).
- [ ] **Step 2 — self-check:** every method from the task-5 interface has behavior defined per phase.
- [ ] **Acceptance:** a reader can explain where money physically sits at each state; reconciliation is defined, not hand-waved.
- [ ] **Step 3 — checkpoint.**

### Task 8: `13-Escrow-Lifecycle.md` (upgrade of `AppFlow.md`)

**Files:** Modify/rename → `for_agents/13-Escrow-Lifecycle.md`
**Consumes:** glossary states/events, custody flows.

- [ ] **Step 1 — draft sections:** Canonical state machine (Mermaid `stateDiagram-v2`) using ONLY glossary states; **transition table** (from-state, event, guard, to-state, side-effects, ledger event, notification); timeouts (dispute window default 24h → auto-release; deposit expiry); auto-release job; cancellation path; every sequence flow (link creation, deposit, confirm, dispute) as Mermaid.
- [ ] **Step 2 — self-check:** no state outside glossary; each transition names its ledger event + custody action.
- [ ] **Acceptance:** every state reachable and terminal states defined; matches `11` constraints.
- [ ] **Step 3 — checkpoint.**

---

## WAVE 3 — Subsystems

> Each subsystem doc follows the §8 standard: Purpose & boundaries · Data contracts · State/transitions · **All error/edge cases** · Acceptance criteria · Cross-refs · Custody phase.

### Task 9: `20-Identity-Auth.md` (new)
**Files:** Create. **Consumes:** `users`, `auth_sessions`, `otp_challenges`.
- [ ] **Draft:** phone-number-first signup/login; **OTP challenge** flow (send, verify, rate-limit, lockout); session/token model (JWT or opaque + refresh; expiry); device binding (`X-Device-Fingerprint`); logout/revocation; edge cases (OTP reuse, expired OTP, SIM-swap risk note). **Acceptance:** every endpoint has request/response + error codes; no password storage (OTP-based). **Checkpoint.**

### Task 10: `21-KYC-and-AML.md` (new)
**Files:** Create. **Consumes:** `kyc_records`, custody phases.
- [ ] **Draft:** KYC tiers (Tier 0 phone-only → low limits; Tier 1 name+ID → higher; Tier 2 enhanced); per-tier transaction/velocity limits (values "verify"); ID verification flow (manual v1, provider later); AML: sanctions/PEP screening (manual v1, automated later), suspicious-activity handling & record-keeping; how limits gate escrow creation/deposit. **Acceptance:** limits map to tiers; escalation path defined; figures marked "verify". **Checkpoint.**

### Task 11: `22-Payments-Collection.md` (new)
**Files:** Create. **Consumes:** `PaymentRail`, `CustodyProvider.collect()`, `webhook_inbox`.
- [ ] **Draft:** MoMo deposit via aggregator (USSD push); `POST /v1/escrow/:id/deposit` flow; provider selection (MTN/Telecel/AirtelTigo via Paystack/Flutterwave/Hubtel); pending→confirmed via webhook (cross-ref 24); failure/timeout/user-cancelled paths; sandbox vs live (P0/P1); retries with idempotency. **Acceptance:** every deposit outcome mapped to a ledger event + state; phase-annotated. **Checkpoint.**

### Task 12: `23-Payouts-Refunds.md` (new)
**Files:** Create. **Consumes:** `CustodyProvider.releaseTo()/refundTo()`, `payouts`.
- [ ] **Draft:** B2C disbursement to vendor on release; refund to buyer on `REFUND_BUYER`; commission deduction (`NUMERIC(15,2)`); payout states (`INITIATED`/`SUCCESS`/`FAILED`/`RETRYING`); failure handling (invalid wallet, insufficient float, provider error); reversal/idempotency; reconciliation hook (cross-ref 12/42). **Acceptance:** no float leaves without a ledger entry; failed-payout recovery defined. **Checkpoint.**

### Task 13: `24-Webhooks-and-Idempotency.md` (new; absorbs webhook parts of `Security.md`)
**Files:** Create. **Consumes:** `webhook_inbox`, `idempotency_keys`.
- [ ] **Draft:** inbound webhook security (HMAC-SHA256 over raw buffer, `crypto.timingSafeEqual`, 300s replay window); fast-200 rule (<500ms) + async processing; Redis `SETNX` + durable `webhook_inbox` for cross-restart replay; client `Idempotency-Key` semantics on mutating endpoints; the `SELECT FOR UPDATE` + partial-unique-index double-spend defense (verbatim reference TS from Security.md, de-duplicated); error 23505 handling. **Acceptance:** every webhook path idempotent; replay defended durably. **Checkpoint.**

### Task 14: `25-Disputes-and-AI-Triage.md` (upgrade)
**Files:** Modify/rename from dispute content. **Consumes:** `dispute_cases`, glossary AI actions.
- [ ] **Draft:** dispute lifecycle; the 3 deterministic SQL heuristics (Query A recycled-hash, B Sybil velocity, C trust/age) + cascading rule engine (auto-ban / freeze / human-route / pass); local LLM arbitrator — **pin model as placeholder** (self-hosted open-weights via Ollama/vLLM), exact system prompt, strict JSON schema (`reasoning_steps`, float `confidence_score` 0.000–1.000, `recommended_action`, `summary_for_users`), no-markdown rule; confidence gate (≥0.900 auto-execute else human review); prompt-injection hardening. **Acceptance:** every dispute outcome maps to a state; JSON schema validated; model naming corrected. **Checkpoint.**

### Task 15: `26-Evidence-and-Forensics.md` (new)
**Files:** Create. **Consumes:** `evidence_artifacts`, `idx_evidence_sha256`.
- [ ] **Draft:** media upload (`POST /v1/evidence/upload`, multipart); on-the-fly SHA-256; object storage (S3/R2) + hashed key; recycled-photo check (`sha256 = $1 AND transaction_id != $2`); silent forensic capture (IP `INET`, device id, network type) via headers; append-only logging; edge cases (huge files, unsupported types, hash collision handling). **Acceptance:** every upload hashed + logged before AI sees it. **Checkpoint.**

### Task 16: `27-Notifications.md` (new)
**Files:** Create. **Consumes:** `notifications`, glossary events.
- [ ] **Draft:** channels (push + SMS; email later); **per-event notification matrix** (event → recipient(s) → channel → template); providers (SMS aggregator, FCM/APNs); delivery tracking & retries; opt-out/quiet-hours note; templates with micro-empathy copy (cross-ref 32). **Acceptance:** every state transition in 13 that needs a notice has a matrix row. **Checkpoint.**

### Task 17: `28-Admin-Console.md` (new)
**Files:** Create. **Consumes:** `dispute_cases`, `transaction_ledger`.
- [ ] **Draft:** L3 reviewer dashboard scope; human-review queue (from `UNDER_HUMAN_REVIEW`); case view (forensic timeline, hashed evidence, AI payload JSON, IP/device); adjudication actions (refund/release + reason) with append-only audit; access control/roles; ops tooling (manual freeze/unfreeze, reconciliation view). **Acceptance:** every admin action writes a ledger/audit row; RBAC defined. **Checkpoint.**

### Task 18: `29-Trust-Score-and-Anti-Fraud.md` (new)
**Files:** Create. **Consumes:** `users.trust_score`, ledger forensics.
- [ ] **Draft:** trust-score model (0–100, `NUMERIC(5,2)`); events that adjust it (−50 recycled photo, disputes lost, etc.); freeze/ban thresholds; the fraud rules engine (Sybil velocity, burner-account, device-linkage); how score gates escrow usage; appeals note; ML scoring as future work. **Acceptance:** every score change is deterministic + logged; thresholds explicit. **Checkpoint.**

---

## WAVE 4 — API, Client & Ops

### Task 19: `30-API-Reference.md` (new)
**Files:** Create. **Consumes:** all subsystem contracts.
- [ ] **Draft:** REST conventions (versioning `/v1`, auth header, `Idempotency-Key`, forensic `X-` headers, pagination, error envelope); **every endpoint** grouped by domain (escrow, evidence, disputes, webhooks, identity, payouts, admin) with method, path, actor, request schema, response schema, status codes; **global error catalog** (code → meaning → HTTP status). **Acceptance:** every endpoint referenced elsewhere appears here with full schemas; no endpoint undocumented. **Checkpoint.**

### Task 20: `31-Frontend-React-Native.md` (new — replaces Flutter)
**Files:** Create. **Consumes:** API reference, design system.
- [ ] **Draft:** **React Native + TypeScript** app architecture; Expo-dev-client vs bare RN decision (recommend + rationale); navigation (React Navigation); state (Redux Toolkit / Zustand + React Query for server state); **HTTP forensic interceptor** (Axios/fetch) injecting `X-Device-Fingerprint`/`X-Network-Type`/`X-App-Version`/`X-Client-Timestamp` + auto `Idempotency-Key` UUIDv4 on POST/PUT/DELETE; native modules (`react-native-device-info`, `@react-native-community/netinfo`, secure storage, `expo-crypto`/`react-native-quick-crypto`); offline/retry on flaky cellular; screen list. **Acceptance:** no Dart/Flutter; interceptor headers match backend expectations exactly. **Checkpoint.**

### Task 21: `32-Design-System.md` (upgrade of `Design.md` → RN)
**Files:** Modify/rename → `for_agents/32-Design-System.md`.
- [ ] **Draft:** "calm over confrontation" psychology; design tokens (colors, typography Inter/Outfit, radius, 8pt spacing) as **framework-agnostic tokens + a React Native theme object** (replace Dart `AppColors`); core component blueprints (e.g. `DisputeStatusCard`) as **RN/TSX**; screen layouts; micro-empathy copy table. **Acceptance:** all code samples are RN/TSX; tokens match 27/31 usage. **Checkpoint.**

### Task 22: `40-Security-Threat-Model.md` (upgrade of `Security.md`)
**Files:** Modify/rename → `for_agents/40-Security-Threat-Model.md`.
- [ ] **Draft:** STRIDE matrix (keep, expand); secrets management (`.env`, no secrets in code/docs, vault later); encryption at rest/in transit; key management for HMAC secrets; auth/session security; rate limiting; **prompt-injection defense** (deterministic pre-filter); pen-test scope; move the webhook HMAC code to cross-ref 24 (don't duplicate). **Acceptance:** every STRIDE row has a mitigation + owning doc; no secret literals. **Checkpoint.**

### Task 23: `41-Infra-and-Deployment.md` (new; absorbs `Techstack.md` backend/infra)
**Files:** Create. Remove legacy `Techstack.md` after migrating content.
- [ ] **Draft:** environments (dev/staging/prod); **student-cheap hosting → scale** path (e.g. Railway/Fly/Render free tiers → managed); containers (docker-compose for Postgres 16 + Redis 7.2 + API + local LLM); **LLM hosting** (Ollama/vLLM, model pin, resource needs); migrations tool pin; CI/CD outline; secrets injection; backups. **Acceptance:** a reader can stand up the full stack locally for free; prod path costed (cross-ref 03). **Checkpoint.**

### Task 24: `42-Observability-and-Reconciliation.md` (new)
**Files:** Create. **Consumes:** ledger, custody.
- [ ] **Draft:** structured logging; metrics (latency SLOs from PRD, dispute auto-rate); alerting; **daily settlement reconciliation job** (pooled balance vs sub-ledger vs partner statement, mismatch alerts); ledger-integrity checks (append-only verification, hash-chain option); audit exports for compliance. **Acceptance:** reconciliation mismatch has a defined runbook; key metrics enumerated. **Checkpoint.**

### Task 25: `43-Testing-Strategy.md` (new)
**Files:** Create.
- [ ] **Draft:** test pyramid (unit/integration/e2e); **concurrency race test** (50 simultaneous webhooks on one `transaction_id` → exactly one deposit, clean 23505 traps); idempotency tests; SHA-256 recycled-photo test; Sybil-velocity test; money-precision tests (no float drift); sandbox test data; contract tests against aggregator sandbox. **Acceptance:** every NFR in PRD has a corresponding test described. **Checkpoint.**

### Task 26: `44-Engineering-Rules.md` (upgrade of `Rules.md`)
**Files:** Modify/rename → `for_agents/44-Engineering-Rules.md`.
- [ ] **Draft:** all existing rules (financial precision, ACID/`FOR UPDATE`, `finally` release, 23505 trap, webhook HMAC/replay/timing, append-only, silent forensics, SHA-256, AI pre-filter, strict JSON, confidence gate, no-alarmist-UI, idempotency headers) **plus new**: React-Native/TS rule (no Flutter), Croe branding rule, custody-phase-annotation rule, glossary-term rule (no synonym drift), no-secrets rule. **Acceptance:** every Global Constraint has a matching enforceable rule. **Checkpoint.**

---

## WAVE 5 — Delivery

### Task 27: `90-Roadmap.md` (upgrade of `Progress.md`)
**Files:** Modify/rename → `for_agents/90-Roadmap.md`.
- [ ] **Draft:** implementation phases mapped to **custody phases** (P0 build → P1 pilot → P2 partner → P3 license); per-subsystem build order (mirror this plan's waves); checkbox progress tracker for the *code* implementation; dependency notes; "definition of done" per phase. **Acceptance:** every subsystem doc has a corresponding implementation milestone; custody phases threaded. **Checkpoint.**

### Task 28: `00-Overview.md` (new — written last)
**Files:** Create `for_agents/00-Overview.md`.
- [ ] **Draft:** what Croe is (one page); the document map (linked index of all 28 docs with one-line purpose); how to read the package (reading order, glossary-first); custody-phase summary; status. **Acceptance:** links resolve to every doc; a new agent can navigate the whole package from here. **Checkpoint.**

---

## Final Self-Review (run after all tasks)

- [ ] **Spec coverage:** every doc in blueprint §7 has a task (28/28). Every Global Constraint enforced by a rule in Task 26.
- [ ] **Placeholder scan:** no "TBD" except intentional "verify" regulatory figures; no un-authored sections.
- [ ] **Naming consistency:** states/events/actions used across docs match `45-Glossary.md` verbatim; interface method names (`collect`/`hold`/`releaseTo`/`refundTo`/`getBalance`/`reconcile`) identical in 10/12/22/23.
- [ ] **De-Flutter check:** grep for "Flutter"/"Dart"/"Dio"/"pubspec"/"Riverpod" → zero in `for_agents/` (except historical mention in reconciliation notes).
- [ ] **Legacy cleanup:** old un-prefixed files removed/renamed; `Techstack.md` split done.
