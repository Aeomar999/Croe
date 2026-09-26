# AGENTS.md - Croe

> Read this file before writing any code. This is the single onboarding document for every AI coding agent and human developer working on Croe. It distills the rules, conventions, and architecture from the full spec package into actionable instructions.

---

## 1. What Croe Is

Croe is a **mobile-first trust and escrow service** for social commerce (WhatsApp, Instagram, TikTok) in emerging markets, launching **Ghana-first**. A vendor shares a payment link; the buyer pays via Mobile Money (MoMo); funds are held in escrow until delivery is confirmed; the vendor is paid out less commission. Disputes flow through a three-tier pipeline: immutable forensic logging, sub-second SQL fraud heuristics, self-hosted LLM arbitrator, and human reviewer (L3) when ambiguous.

**The product is named "Croe."** Never "escrow.co" or any other placeholder (rule BRAND-01).

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language | TypeScript 5.4 (strict) | noImplicitAny, strictNullChecks everywhere |
| Runtime | Node.js 20 LTS | Backend API |
| Framework | Express or Fastify | Raw-body capture required for webhook HMAC |
| Database | PostgreSQL 16+ | uuid-ossp extension, append-only ledger |
| Cache/Queue | Redis 7.2+ | Rate limiting, idempotency fast gate, session cache |
| Migrations | node-pg-migrate (pinned) | One migration per change; never edit shipped migrations |
| Object Storage | S3 / Cloudflare R2 | Content-addressed evidence media |
| AI/LLM | Ollama (dev) / vLLM (prod) | Self-hosted open-weights model only; data never leaves |
| Frontend | React Native 0.74+ (Expo) | TypeScript strict; no Flutter/Dart anywhere |
| State | TanStack Query + Zustand | Server state + local state |
| HTTP Client | Axios | Forensic interceptor for headers |
| Navigation | React Navigation | Standard RN stack |
| Testing | Jest / Vitest, Testcontainers, Detox, k6 | See 24-Testing-Strategy.md |
| Logging | Winston or Pino | Structured JSON; no console.log in prod |

---

## 3. Project Structure

```
Croe/
  AGENTS.md                  <- YOU ARE HERE
  Progress.md                <- Living implementation tracker (keep updated)
  Production_manual.md       <- Go-live checklist (keep updated per PROC-03)
  GO-TO-MARKET.md            <- Business/GTM tracker: entity, licensing, ops, pilot (keep updated)
  PRODUCTION_READINESS_PLAN.md <- Deep production readiness plan with phased task list
  task.md                    <- Engineering task list and launch gates (keep updated per PROC-03)
  .env.example               <- All required env vars with comments
  .gitignore
  for_agents/                <- THE SPEC PACKAGE (28 docs, sequential numbering)
    00-Overview.md           <- Start here for project understanding
    01-PRD.md                <- Product requirements, personas, KPIs
    02-Market-and-Regulatory.md
    03-Business-Model-and-Costs.md
    04-Architecture.md       <- CustodyProvider/PaymentRail interfaces
    05-Data-Model.md         <- Full PostgreSQL DDL (13 tables)
    06-Money-Custody-and-Settlement.md
    07-Escrow-Lifecycle.md   <- State machine (14 states)
    08-Identity-Auth.md
    09-KYC-and-AML.md
    10-Payments-Collection.md
    11-Payouts-Refunds.md
    12-Webhooks-and-Idempotency.md
    13-Disputes-and-AI-Triage.md
    14-Evidence-and-Forensics.md
    15-Notifications.md
    16-Admin-Console.md
    17-Trust-Score-and-Anti-Fraud.md
    18-API-Reference.md      <- Full REST contract + validation schemas
    19-Frontend-React-Native.md
    20-Design-System.md      <- "Calm over confrontation" design language
    21-Security-Threat-Model.md
    22-Infra-and-Deployment.md
    23-Observability-and-Reconciliation.md
    24-Testing-Strategy.md
    25-Engineering-Rules.md  <- MANDATORY rules for all code
    26-Glossary.md           <- Single source of truth for naming
    27-Roadmap.md            <- 8-phase build sequence
  design/                    <- UI/UX design system (HTML/CSS mockups)
  docs/
    superpowers/             <- Planning artifacts
    archive/                 <- Superseded brainstorm docs (do not reference)
```

---

## 4. How to Read the Specs

Read in this order:

1. **26-Glossary.md** - defines every canonical term (states, events, actors, actions)
2. **25-Engineering-Rules.md** - mandatory rules; any violation is rejected
3. **00-Overview.md** - master index with document map
4. **01-PRD.md** - what we are building and why
5. **04-Architecture.md** - system boundaries and provider abstractions
6. **05-Data-Model.md** - the database schema everything depends on
7. **07-Escrow-Lifecycle.md** - the state machine that drives all transitions
8. **18-API-Reference.md** - the REST contract
9. **27-Roadmap.md** - the build sequence

Then read whichever subsystem doc is relevant to your current task.

---

## 5. Mandatory Engineering Rules

Every rule in 25-Engineering-Rules.md is enforced. Here is the critical subset:

### Financial (non-negotiable)

- **FIN-01:** Money is always NUMERIC(15,2) / decimal strings. Never JS number floats or SQL FLOAT/DOUBLE PRECISION.
- **FIN-02:** Every amount carries an explicit currency code (GHS, NGN, KES). Never cross-currency arithmetic without an audited conversion entry.

### Database

- **DB-01:** Dedicated pg.Pool client for every transaction. Use `await pool.connect()` and run all of BEGIN...COMMIT on that one client. Never `pool.query()` inside a transaction.
- **DB-22:** Always `SELECT ... FOR UPDATE` before any money mutation on `escrow_transactions`.
- **DB-03:** Always `finally { client.release() }`.
- **DB-04:** Catch PostgreSQL error 23505 (unique violation) and treat it as a safe duplicate.

### Money Movement

- **MONEY-01:** Pay then ledger. Write the minus-amount ledger event only after the provider confirms SUCCESS, in one DB transaction.
- **MONEY-02:** Annotate every money-touching feature with its custody phase (P0-P3).
- **MONEY-03:** Call CustodyProvider / PaymentRail interfaces only. Never call an aggregator SDK directly.

### Webhooks and Security

- **WH-01:** HMAC over req.rawBody (raw buffer), never parsed JSON.
- **WH-02:** Reject if `|now - x-momo-timestamp| > 300s`.
- **WH-03:** `crypto.timingSafeEqual` with length check. Never `===`.
- **WH-04:** ACK 200 in less than 500ms, then process asynchronously.
- **SEC-01:** No secrets in code, docs, or logs. All secrets from env or secret store.

### Forensics and Audit

- **AUD-01:** Never UPDATE/DELETE `transaction_ledger`. Append a new row per transition. The app DB role lacks those grants.
- **AUD-02:** Persist X-Device-Fingerprint, X-Network-Type, and req.ip from headers on every mutating action.
- **AUD-03:** Hash every upload with SHA-256 on the fly. Check for cross-transaction reuse.

### AI Arbitrator

- **AI-01:** Never send a claim to the LLM before the three SQL heuristics pass.
- **AI-02:** Enforce strict raw-JSON output matching the schema. Discard invalid output.
- **AI-03:** Autonomous REFUND_BUYER/RELEASE_VENDOR only at confidence >= 0.900. Otherwise UNDER_HUMAN_REVIEW.
- **AI-04:** Dispute/user data never leaves for a third-party LLM API. Local only.

### Frontend

- **UI-01:** React Native + TypeScript only. No Flutter/Dart anywhere.
- **UI-02:** Every mutating request injects a UUIDv4 Idempotency-Key via the interceptor.
- **UI-03:** No alarmist visuals. No crimson for dispute/hold screens. Calm blues, slate, amber.
- **UI-04:** No backend enums or stack traces shown to users. Empathetic copy only.

### Product and Consistency

- **BRAND-01:** Product/app is "Croe". No escrow.co placeholders.
- **TERM-01:** Use the canonical state/event/action names from 26-Glossary.md. No synonyms.
- **COST-01:** Prefer free/local in P0/P1. Do not provision paid infra before its phase.

### Delivery and Process

- **PROC-01:** Phase gate. No phase starts until the previous is production-grade, complete, and tested.
- **PROC-02:** No Claude co-authorship in commits. No Co-Authored-By: Claude trailers.
- **GIT-01:** Branch per phase, commit per unit. See section 8 below.
- **PROC-03:** Production_manual.md is a living document. Update it in the same commit as any production-readiness change.

---

## 6. Canonical Vocabulary

You MUST use these exact terms. No synonyms. No drift. (Full list in 26-Glossary.md.)

### Escrow States (the only valid values for escrow_transactions.current_status)

LINK_CREATED, AWAITING_DEPOSIT, FUNDS_SECURED, SHIPPED, DELIVERED_CONFIRMED, FUNDS_RELEASED, DISPUTE_OPENED, AI_PROCESSING, UNDER_HUMAN_REVIEW, RESOLVED_AUTO, FUNDS_REFUNDED, FRAUD_LOCKOUT, EXPIRED, CANCELLED

### Ledger Event Types

LINK_CREATED, BUYER_CLAIMED, FUNDS_DEPOSITED, SHIPPED, DELIVERY_CONFIRMED, FUNDS_RELEASED, DISPUTE_OPENED, EVIDENCE_ADDED, FRAUD_FLAGGED, REFUND_ISSUED, PAYOUT_INITIATED, PAYOUT_FAILED

### Custody Phases

- **P0 Build:** Aggregator sandbox + local LLM. No real money. ~0 GHS.
- **P1 Pilot:** Aggregator live, delayed payout. Pay-as-you-go.
- **P2 Partner-held:** Licensed partner trust account. Compliant scale.
- **P3 Own licence:** Croe is a BoG-licensed EPSP/DEMI. Later.

### Actors

Vendor, Buyer, Croe/Platform, Human Reviewer (L3), System/AI, Custody Partner, Payment Aggregator

### Dispute Reason Codes

ITEM_NOT_RECEIVED, ITEM_DAMAGED, WRONG_ITEM, ITEM_NOT_AS_DESCRIBED

### AI Actions

REFUND_BUYER, RELEASE_VENDOR, ESCALATE_HUMAN

---

## 7. Key Architecture Patterns

### The Double-Spend Defense (three layered gates)

1. **Redis SETNX** fast dedup: `SETNX idemp:<provider_ref>` with 24h TTL. Duplicate = short-circuit.
2. **SELECT FOR UPDATE** row lock: serialize concurrent webhooks on the same transaction.
3. **Partial unique index** `idx_single_deposit_per_transaction`: structural backstop. Error 23505 = safe duplicate.

### The CustodyProvider Abstraction

All money movement goes through this interface. Escrow/dispute logic never touches an aggregator SDK directly. The concrete implementation depends on the custody phase:

- `collect()` - begin collecting funds from a buyer
- `hold()` - earmark confirmed funds to a transaction
- `releaseTo()` - disburse to vendor (net of commission)
- `refundTo()` - disburse back to buyer
- `getBalance()` - current pooled balance
- `reconcile()` - verify pooled balance vs sub-ledger vs statement

### The PaymentRail Abstraction

Physical money-movement mechanism for a country/network. Ghana/MoMo via aggregator is the first implementation:

- `initiateDeposit()` - trigger USSD push on buyer handset
- `verifyWebhook()` - HMAC verification
- `parseWebhook()` - normalize to rail-agnostic event
- `initiateDisbursement()` - B2C payout to wallet

### Money Transaction Pattern (canonical)

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const { rows } = await client.query(
    'SELECT current_status FROM escrow_transactions WHERE transaction_id=$1 FOR UPDATE',
    [txId]
  );
  // ... check status, write ledger, update state ...
  await client.query('COMMIT');
} catch (e: any) {
  await client.query('ROLLBACK');
  if (e.code === '23505') return; // safe duplicate
  throw e;
} finally {
  client.release();
}
```

### Webhook Handler Pattern (canonical)

```typescript
app.post('/v1/webhooks/momo-callback', verifyMoMoWebhook, async (req, res) => {
  res.status(200).send('OK');                 // ack immediately (<500ms)
  await enqueueWebhook(req.body, req.headers); // durable inbox + background worker
});
```

---

## 8. Git Workflow (rule GIT-01)

### Branch per phase

Every implementation phase MUST be developed on a dedicated branch created from main:

```
git checkout main && git pull
git checkout -b phase/1-data-ledger
```

Branch names are defined in Progress.md:

| Phase | Branch |
|-------|--------|
| 1 - Data and Ledger | phase/1-data-ledger |
| 2 - Core API and ACID | phase/2-core-api |
| 3 - Webhooks and Payments | phase/3-webhooks-payments |
| 4 - Evidence and Heuristics | phase/4-evidence-heuristics |
| 5 - AI Triage | phase/5-ai-triage |
| 6 - Identity, KYC, Notif, Admin | phase/6-identity-kyc-notif-admin |
| 7 - Frontend | phase/7-frontend |
| 8 - Ops, Reconciliation, Hardening | phase/8-ops-hardening |

### Commit per unit

Commit after each self-contained unit of work. A "unit" is one logical change that passes lint, typecheck, and tests independently. Never commit broken code.

### Commit message format

```
<type>(<scope>): <description>

type: feat | fix | test | refactor | docs | chore
scope: module or component name
description: imperative, present tense, no period, max 72 chars
```

Examples:
- `feat(db): add escrow_transactions table with CHECK constraints`
- `feat(webhook): implement HMAC middleware with replay defense`
- `test(race): add 50-concurrent-deposit webhook race test`
- `fix(api): handle 23505 trap in processDepositWebhook`

### Merge

Squash-merge to main only after the phase gate (PROC-01) is satisfied:

```
feat(phase-N): <short description>
```

Delete the branch after merge.

### Never

- Never commit secrets, API keys, or tokens
- Never commit with Co-Authored-By: Claude (PROC-02)
- Never force-push to main
- Never skip CI checks

---

## 9. File Numbering Convention

The for_agents/ spec package uses sequential numbering (00-27). When referencing specs in code comments, commit messages, or docs, use the format:

- In markdown: `[25-Engineering-Rules.md](25-Engineering-Rules.md)`
- In code comments: `// See 12-Webhooks-and-Idempotency.md for idempotency rules`
- In commit messages: `See 05-Data-Model.md`

If you add a new spec, append it at the end of the current sequence and update 00-Overview.md.

---

## 10. Living Documents (keep updated)

These files MUST be updated as development progresses:

| File | When to update | Rule |
|------|---------------|------|
| Progress.md | Every phase gate, test result, or deployment change | PROC-01 |
| Production_manual.md | Any change affecting production readiness (new secret, endpoint, service, migration, dependency) | PROC-03 |
| PRODUCTION_READINESS_PLAN.md | When production readiness milestones change, gaps are closed, or timeline shifts | PROC-03 |
| 27-Roadmap.md | When phase status changes ([ ] to [/] to [x]) | PROC-01 |
| task.md | Every engineering task completion, milestone gate, or production-readiness change | PROC-03 |

---

## 11. What NOT to Do

- Do NOT use floats for money. Ever.
- Do NOT use UPDATE or DELETE on transaction_ledger. Ever.
- Do NOT call an aggregator SDK directly from business logic. Use CustodyProvider/PaymentRail.
- Do NOT send user data to a third-party LLM. Local only.
- Do NOT show backend enums, stack traces, or error codes to users.
- Do NOT use crimson/red for dispute or hold UI. Calm blues, slate, amber.
- Do NOT hardcode secrets. All from env or secret store.
- Do NOT use Flutter/Dart. React Native only.
- Do NOT skip the SELECT FOR UPDATE before money mutations.
- Do NOT commit code that does not pass typecheck and lint.
- Do NOT start a phase before the previous phase passes its gate.
- Do NOT use console.log/console.error in production code. Structured logger only.
- Do NOT add Co-Authored-By: Claude to commit messages.
- Do NOT reference docs/archive/ files. They are superseded.

---

## 12. Quick Reference - Where to Find Things

| I need to... | Read this |
|-------------|-----------|
| Understand the product | 01-PRD.md |
| Find a canonical term | 26-Glossary.md |
| Check if a code pattern is allowed | 25-Engineering-Rules.md |
| See the database schema | 05-Data-Model.md |
| Understand state transitions | 07-Escrow-Lifecycle.md |
| Find an API endpoint contract | 18-API-Reference.md |
| Check validation rules for an endpoint | 18-API-Reference.md section 4 |
| See the rate limit table | 21-Security-Threat-Model.md section 4 |
| Understand webhook security | 12-Webhooks-and-Idempotency.md |
| Find the CustodyProvider interface | 04-Architecture.md section 4 |
| Find the PaymentRail interface | 04-Architecture.md section 5 |
| Understand the dispute pipeline | 13-Disputes-and-AI-Triage.md |
| Check the LLM system prompt | 13-Disputes-and-AI-Triage.md section 4 |
| Find notification templates | 15-Notifications.md |
| See the design tokens | 20-Design-System.md |
| Check what phase we are on | 27-Roadmap.md |
| See implementation progress | Progress.md |
| Find production readiness items | Production_manual.md |
| See deep production readiness plan | PRODUCTION_READINESS_PLAN.md |
| Check what env vars are needed | .env.example |
| Understand the test strategy | 24-Testing-Strategy.md |
| Find the 50-webhook race test spec | 24-Testing-Strategy.md section 2.1 |
| See the reconciliation job spec | 23-Observability-and-Reconciliation.md |
| Check security threats | 21-Security-Threat-Model.md |
| Find infrastructure details | 22-Infra-and-Deployment.md |
| Find the current engineering task list and launch gates | task.md |
| See what blocks M1/M2/M3 milestones | task.md §19 |
| Check if a security finding has a tracked fix | task.md §7 |

---

## 13. Current Project Status

| Item | Status |
|------|--------|
| Specification phase | Complete (28 docs) |
| Implementation phase | **Complete (Phases 1–8)** |
| Test suite | 275 passing (backend) + 79 frontend |
| Custody phase | P0 (sandbox) — code ready for P1 Pilot gate |
| Active branch | `main` |
| Git commits | 5 (`ffc1fad` → `6d30444`) |
| Remote | None configured |

The next step is to begin Phase 1 (Data and Ledger) on branch `phase/1-data-ledger`.
