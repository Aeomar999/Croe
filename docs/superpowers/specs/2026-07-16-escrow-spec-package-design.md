# Croe — Social Commerce Escrow Platform: Comprehensive Spec Package (Design & Blueprint)

- **Date:** 2026-07-16
- **Status:** Approved (design) — pending user review of this document
- **Type:** Meta-spec. This document governs the authoring of the full `for_agents/` spec package. It is the source of truth for *what documents exist, what each covers, and the decisions they must all obey.*

---

## 1. Purpose & Context

An initial planning package already exists (9 files in `for_agents/`, 12 raw Q&A transcripts in `docs/`). It is **broad but thin**: it covers the happy path and the "impressive" subsystems (double-spend defense, AI dispute triage, forensic ledger) well, but a large part of a real escrow platform is simply absent — and the parts that exist are not deep enough to build from without an agent inventing details.

This effort produces a **comprehensive, ship-ready spec package**: broader (missing subsystems added), deeper (existing topics fully specified), airtight (unambiguous, internally consistent, build-ready for AI coding agents), and complete on the ops/business layer.

**The consumer of these docs is an AI coding agent.** Every document must be specific enough that an agent can implement it without guessing.

---

## 2. Decisions locked during brainstorming

| Decision | Choice |
| :--- | :--- |
| **Product name** | The app is **"Croe."** All branding, deep-links, package/bundle identifiers, and copy use this name (replacing the generic "escrow.co" placeholders in the current docs). |
| **Client stack** | **React Native (TypeScript)** — replaces the earlier Flutter/Dart choice. Native modules for device info, secure storage, and crypto. Expo-dev-client vs. bare RN is pinned in `31-Frontend-React-Native.md`. |
| **End goal** | Ship a **real product** to real users — highest bar (real MoMo APIs, KYC, AML, real-money safety). |
| **Market** | **Global architecture, Ghana first.** Money-movement and compliance sit behind abstractions; the first concrete implementation targets Ghana + MoMo. |
| **Fund custody** | **Phased custody** (see §4). Start on a free aggregator sandbox, pilot on aggregator live, migrate to a partner-held trust account, and only pursue an own license much later. |
| **Cost posture** | Author is a **student**. Cost realities are written into the docs. Build cost ≈ zero (sandbox + local tooling); real cost only appears when real money flows at scale. |
| **Scope** | **No MVP carve-out.** The whole platform, every subsystem, all phases, documented comprehensively. Phasing lives in the roadmap as *implementation sequencing*, not as a reason to omit any document. |

---

## 3. The product in one paragraph

**Croe** is a lightweight, mobile-first **trust and escrow service** for informal social commerce (WhatsApp / Instagram / TikTok / Facebook Marketplace) in emerging markets. A vendor generates a payment link and drops it into a chat; the buyer pays via **Mobile Money (MoMo)**; funds are held in escrow until delivery is confirmed; on confirmation the vendor is paid out (less commission). Disputes are resolved by a **three-tier automated pipeline** — immutable forensic logging → sub-second deterministic SQL fraud heuristics → a locally-hosted open-weights LLM arbitrator — escalating to a human reviewer only for genuinely ambiguous cases.

---

## 4. The phased-custody model (architectural backbone)

Holding a buyer's money between deposit and release is **custody of third-party funds** — a regulated activity under Bank of Ghana's Payment Systems & Services Act 2019. The platform is designed so the *escrow logic never changes* while the *custody implementation* evolves through four phases behind a single `CustodyProvider` abstraction.

| Phase | Custody implementation | Who legally holds the float | Cost to author | Legal standing |
| :--- | :--- | :--- | :--- | :--- |
| **P0 — Build** | Aggregator **sandbox** (Paystack / Flutterwave / Hubtel test keys) + local Postgres + local LLM (Ollama) | Nobody (test money) | **~0 GHS** | N/A — development only |
| **P1 — Pilot** | Aggregator **live**, funds rest in the platform's aggregator settlement account; payout delayed until release | Aggregator settlement account | Pay-as-you-go ~1.5–2% per real transaction; company registration (a few hundred GHS) | Thin at scale — keep pilot volumes low and supervised; explicitly flagged as interim |
| **P2 — Partner-held** | Pooled **trust/settlement account** at a licensed bank / EPSP / DEMI partner; platform orchestrates via partner API | Licensed partner | Commercial deal, due diligence, registered company; low cash but high access friction | Compliant — the "real and legal" milestone |
| **P3 — Own license** | Platform is a BoG-licensed **EPSP / DEMI** and custodies directly | The platform | Minimum paid-up capital in the **millions of GHS** (exact tier to be verified); long approval; heavy ongoing compliance | Fully licensed — only if volume ever justifies it |

**Invariant across all phases:** the append-only `transaction_ledger` is the **authoritative sub-ledger** that records how much of the pooled float belongs to which transaction/vendor at any instant. Release = disbursement (B2C payout) from the pool to the vendor; refund = disbursement back to the buyer. The float never legally belongs to the platform until P3.

> **Cost realities must be written into `03-Business-Model-and-Costs.md` and `02-Market-and-Regulatory.md`, not buried.** Every doc that touches money references its phase.

---

## 5. Global-first, Ghana-first principle

- All money movement goes through a `CustodyProvider` + `PaymentRail` abstraction. Ghana/MoMo is the first concrete implementation; Kenya/M-Pesa, Nigeria/cards+transfer, etc. are future implementations of the same interfaces.
- Currency is never assumed. `NUMERIC(15,2)` + explicit currency codes (`GHS`, `NGN`, `KES`) everywhere; no cross-currency arithmetic without an audited conversion entry.
- Regulatory content is written as **Ghana-concrete now, expansion-noted later** — no hand-waving that pretends the platform can legally hold money without a defined custody phase.

---

## 6. Scope: comprehensive, no MVP carve-out

Every document in §7 gets authored. Nothing is deferred out of the package. The **roadmap** (`90-Roadmap.md`) sequences *implementation* into phases (including the custody phases above), but the *specification* of every subsystem — including partner-held custody, KYC tiers, and the own-license path — is written now.

---

## 7. The document map

The package lives in `for_agents/`. Existing files are upgraded in place; new files are added. Numeric prefixes give reading order.

### Foundation & Product
| Doc | Purpose | Status |
| :--- | :--- | :--- |
| `00-Overview.md` | Master index; how to read the package; glossary pointer | New |
| `01-PRD.md` | Personas, functional requirements, **non-goals**, KPIs | Upgrade |
| `02-Market-and-Regulatory.md` | Ghana BoG / PSSP Act reality, KYC/AML obligations, phased-custody legal framing, global-expansion notes | New |
| `03-Business-Model-and-Costs.md` | Fees/commission, unit economics, **cost realities** (aggregator %, company reg, partner deals), per-phase cost timeline | New |

### Architecture & Money
| Doc | Purpose | Status |
| :--- | :--- | :--- |
| `10-Architecture.md` | Service boundaries, `CustodyProvider` / `PaymentRail` abstractions, global-vs-Ghana | Upgrade |
| `11-Data-Model.md` | Full DDL incl. new tables; migrations; constraints; indexes | Upgrade (of Schema.md) |
| `12-Money-Custody-and-Settlement.md` | Pooled trust account, per-transaction sub-ledger, float, reconciliation, phased custody, `CustodyProvider` interface | New |
| `13-Escrow-Lifecycle.md` | Complete state machine, every transition, timeouts, auto-release | Upgrade (of AppFlow.md) |

### Subsystems
| Doc | Purpose | Status |
| :--- | :--- | :--- |
| `20-Identity-Auth.md` | Phone-OTP signup/login, sessions/tokens, device binding | New |
| `21-KYC-and-AML.md` | KYC tiers, verification, transaction limits, sanctions/PEP screening, suspicious-activity handling | New |
| `22-Payments-Collection.md` | MoMo USSD deposit via aggregator, collection flow, failure paths | New |
| `23-Payouts-Refunds.md` | B2C disbursement, refunds, reversals, retries, failed-payout handling | New |
| `24-Webhooks-and-Idempotency.md` | Inbound webhook security (HMAC/replay), idempotency, reconciliation | Upgrade |
| `25-Disputes-and-AI-Triage.md` | Dispute lifecycle, SQL heuristics, AI arbitrator, human review | Upgrade |
| `26-Evidence-and-Forensics.md` | Media upload, SHA-256, object storage, forensic logging | Upgrade |
| `27-Notifications.md` | Push/SMS, templates, per-event notification matrix, delivery | New |
| `28-Admin-Console.md` | L3 reviewer dashboard, manual adjudication, ops tooling | New |
| `29-Trust-Score-and-Anti-Fraud.md` | Trust-scoring model, fraud rules engine, freezes/bans | New |

### API, Client & Ops
| Doc | Purpose | Status |
| :--- | :--- | :--- |
| `30-API-Reference.md` | Full REST contract: every endpoint, request/response schemas, **error catalog**, status codes, auth, versioning | New/expanded |
| `31-Frontend-React-Native.md` | React Native (TS) app architecture, navigation, state management, offline/retry, HTTP forensic interceptor (Axios/fetch), native device modules; Expo-vs-bare decision | New |
| `32-Design-System.md` | Framework-agnostic design tokens + **React Native** components, screens, empathetic copy | Upgrade (of Design.md) |
| `40-Security-Threat-Model.md` | STRIDE, secrets, encryption, key management, pen-test scope | Upgrade (of Security.md) |
| `41-Infra-and-Deployment.md` | Environments, student-cheap → scale hosting, containers, DB/Redis/LLM hosting, CI/CD | New |
| `42-Observability-and-Reconciliation.md` | Logging, metrics, alerts, **daily settlement reconciliation**, ledger-integrity checks | New |
| `43-Testing-Strategy.md` | Unit/integration/load; **concurrency race test** (50 webhooks, one transaction); sandbox test data | New |
| `44-Engineering-Rules.md` | The hard rules, expanded | Upgrade (of Rules.md) |
| `45-Glossary.md` | Shared vocabulary — states, event types, actor types; fixes naming drift | New |

### Delivery
| Doc | Purpose | Status |
| :--- | :--- | :--- |
| `90-Roadmap.md` | Phased implementation plan incl. custody phases; per-doc build order; progress tracker | Upgrade (of Progress.md) |

**New database tables introduced by the added subsystems** (detailed in `11-Data-Model.md`): `custody_accounts`, `ledger_balances` (or derived from `transaction_ledger`), `payouts`, `kyc_records`, `auth_sessions` / `otp_challenges`, `idempotency_keys`, `webhook_inbox`, `notifications`. Existing 5 tables (`users`, `escrow_transactions`, `transaction_ledger`, `evidence_artifacts`, `dispute_cases`) are retained and extended.

---

## 8. Authoring standard (the "airtight / build-ready" requirement)

Every subsystem/API document must contain, at minimum:

1. **Purpose & boundaries** — what it does, what it explicitly does not do, what it depends on.
2. **Data contracts** — exact request/response schemas, DB columns touched, JSON shapes.
3. **State & transitions** — where relevant, the exact states and legal transitions.
4. **Error & edge cases** — every failure path, status code, retry/timeout behavior, idempotency semantics.
5. **Acceptance criteria** — how an implementer knows it's correct (testable statements).
6. **Cross-references** — links to related docs (custody phase, glossary terms, rules invoked).
7. **Custody-phase awareness** — any money-touching behavior states which phase(s) it applies to.

---

## 9. Inconsistencies in the existing docs to reconcile

Captured now so the upgrade fixes them rather than propagating them:

- **State-machine drift:** `AppFlow.md` references `READY_TO_SHIP` / `DISPATCHED` sub-states that are not in `escrow_transactions.current_status` defaults or any enum. The glossary + `13-Escrow-Lifecycle.md` must define one canonical state set.
- **Model naming:** "Gemma 4" is treated as a concrete model (`gemma-4-local-fintech-v1`) but that release does not exist. Treat as a **placeholder** for a self-hosted open-weights model; pin the real choice in `25-Disputes-and-AI-Triage.md` / `41-Infra-and-Deployment.md`.
- **Missing constraints:** enum-like `VARCHAR` columns (statuses, reason codes, event types) lack `CHECK` constraints or lookup tables. `11-Data-Model.md` must add them.
- **"Platform holds funds" framing:** current PRD/flows imply the platform directly holds money, which is not legal as written. All money language must be re-grounded in the custody phases.
- **Idempotency store:** referenced (Redis `SETNX`, `Idempotency-Key`) but never modeled as a durable table for replay across restarts — add `idempotency_keys` / `webhook_inbox`.
- **Client-stack migration:** the current docs are Flutter/Dart throughout (Dio interceptor, Riverpod/BLoC, `pubspec.yaml`, Dart widgets). All of this is replaced by **React Native / TypeScript** equivalents during the upgrade — Axios/fetch interceptor, React state (Redux Toolkit / Zustand / React Query), `package.json`, RN components; native plugins map `device_info_plus`→`react-native-device-info`, `connectivity_plus`→`@react-native-community/netinfo`, `crypto`→`expo-crypto`/`react-native-quick-crypto`.
- **Techstack.md is split & de-Fluttered:** the existing `Techstack.md` is superseded — client stack → `31-Frontend-React-Native.md`, backend/DB → `10-Architecture.md`, infra/hosting/LLM → `41-Infra-and-Deployment.md`. Its Flutter/Dio content is removed, not carried forward.
- **Branding & placeholders:** the app is **Croe**; generic `escrow.co` / `app.escrow.co` / `api.escrow.co` domains and `trx_` deep-links in the current docs become **Croe-branded placeholders** (final domain TBD). No real domain is invented.

---

## 10. Conventions

- **File location:** all canonical specs in `for_agents/`; raw research transcripts stay in `docs/` (reference only).
- **Numeric prefixes** define reading order and grouping (00s foundation, 10s architecture/money, 20s subsystems, 30s API/client, 40s ops, 90s delivery).
- **Terminology** is defined once in `45-Glossary.md` and referenced everywhere; no synonym drift (one name per state, event, actor, phase).
- **Money** is always `NUMERIC(15,2)` + explicit currency; never floats; never cross-currency without audited conversion.
- **Branding:** the product/app is **Croe**; all user-facing copy, deep-links, and identifiers use it; placeholder domains reflect the Croe brand (final domain TBD).
- **Client stack:** **React Native + TypeScript**; no Flutter/Dart references survive the upgrade.

---

## 11. Non-goals & caveats

- **This package is not legal advice.** Exact BoG license tiers, minimum-capital figures, and KYC/AML thresholds must be verified with a Ghanaian fintech lawyer or Bank of Ghana before real-money launch. Docs will state figures as "verify" where uncertain rather than assert false precision.
- **No real credentials, keys, or production secrets** are written into specs.
- The package specifies the system; it does not itself implement code. Implementation follows via the writing-plans → execution cycle.

---

## 12. Implementation approach

Because the package is large, authoring proceeds in a sequence that respects dependencies (this feeds the writing-plans step):

1. **Vocabulary & spine first:** `45-Glossary.md` → `01-PRD.md` → `02-Market-and-Regulatory.md` → `03-Business-Model-and-Costs.md`.
2. **Architecture & money core:** `10-Architecture.md` → `11-Data-Model.md` → `12-Money-Custody-and-Settlement.md` → `13-Escrow-Lifecycle.md`.
3. **Subsystems (20s):** identity → KYC → collection → payouts → webhooks → disputes → evidence → notifications → admin → trust/fraud.
4. **API, client, ops (30s/40s):** API reference → Flutter → design system → security → infra → observability → testing → rules.
5. **Delivery:** `00-Overview.md` (written last, indexes everything) + `90-Roadmap.md`.

Each document is authored to the §8 standard and cross-checked against §9 reconciliations.
