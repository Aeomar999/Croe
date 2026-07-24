# Croe — Implementation Roadmap & Progress (`27-Roadmap.md`)

> The build sequence, mapped to custody phases ([`26-Glossary.md`](26-Glossary.md)). Agents update statuses: `[ ]` todo, `[/]` in-progress, `[x]` done. "No MVP carve-out" means every spec is written; this roadmap sequences the *code*.

## ⛔ Phase Gate (mandatory — rule PROC-01)

**No phase begins until the previous phase is production-grade, complete, and tested.** A phase passes the gate only when ALL hold:
- [ ] every item implemented to spec — no stubs, leftover mocks, `TODO`s, or "wire up later"
- [ ] all relevant **acceptance criteria** met
- [ ] tests written and passing per [`24-Testing-Strategy.md`](24-Testing-Strategy.md) (concurrency, money-precision, fraud where relevant)
- [ ] [`25-Engineering-Rules.md`](25-Engineering-Rules.md) satisfied
- [ ] observability + reconciliation wired wherever money is touched
- [ ] **verified end-to-end** (actually run, not just unit-green)

This gate is checked at the end of every phase below, not only at go-live.

## Custody phases as delivery milestones
- **P0 Build** — full product on aggregator sandbox + local LLM; no real money.
- **P1 Pilot** — go live small on aggregator settlement; register company; supervised volumes.
- **P2 Partner-held** — migrate custody to a licensed partner trust account (compliant scale).
- **P3 Own licence** — later, volume-justified only.

---

## Phase 1 — Data & Ledger (spec: [`11`](05-Data-Model.md), [`45`](26-Glossary.md))
- [ ] Postgres 16 container + `uuid-ossp`; all tables (5 core + 8 new) with `CHECK` constraints.
- [ ] All indexes incl. `idx_single_deposit_per_transaction` (partial unique) and `idx_evidence_sha256`.
- [ ] `updated_at` triggers; `REVOKE UPDATE, DELETE ON transaction_ledger FROM app_user`.
- [ ] Migrations tooling + seed `custody_accounts` (P0 sandbox row).

## Phase 2 — Core API & ACID (spec: [`10`](04-Architecture.md), [`13`](07-Escrow-Lifecycle.md))
- [ ] Node/TS scaffold, strict tsconfig, `pg.Pool`, graceful shutdown.
- [ ] `CustodyProvider` + `PaymentRail` interfaces; P0 sandbox implementation.
- [ ] Escrow endpoints (create/get/ship/confirm/cancel) + state-machine guards.
- [ ] `processDepositWebhook` with `SELECT FOR UPDATE` + `23505` trap.

## Phase 3 — Webhooks & Payments (spec: [`22`](10-Payments-Collection.md), [`23`](11-Payouts-Refunds.md), [`24`](12-Webhooks-and-Idempotency.md))
- [x] Raw-body HMAC middleware; replay + timing defenses; fast-200.
- [x] Redis `SETNX` + durable `webhook_inbox`; client `Idempotency-Key`.
- [x] Collection (deposit) flow; payout/refund with pay-then-ledger ordering.

## Phase 4 — Evidence & Heuristics (spec: [`26`](14-Evidence-and-Forensics.md), [`25`](13-Disputes-and-AI-Triage.md))
- [ ] Upload + streaming SHA-256 + object storage; recycled-photo trap.
- [ ] Query A/B/C heuristics + cascading rule engine.

## Phase 5 — AI Triage (spec: [`25`](13-Disputes-and-AI-Triage.md), [`41`](22-Infra-and-Deployment.md))
- [ ] Local LLM (Ollama/vLLM); pin model id → `ai_model_version`.
- [ ] System prompt + strict JSON validation; confidence gate + auto-execution.

## Phase 6 — Identity, KYC, Notifications, Admin (spec: [`20`](08-Identity-Auth.md), [`21`](09-KYC-and-AML.md), [`27`](15-Notifications.md), [`28`](16-Admin-Console.md), [`29`](17-Trust-Score-and-Anti-Fraud.md))
- [ ] Phone-OTP auth + sessions; KYC tiers + limits.
- [ ] Notifications (SMS/push) per matrix; trust-score engine.
- [ ] Admin/L3 console: review queue, adjudication, RBAC, reconciliation view.

## Phase 7 — Frontend (spec: [`31`](19-Frontend-React-Native.md), [`32`](20-Design-System.md), [`30`](18-API-Reference.md))
- [ ] RN app scaffold; Axios forensic interceptor; navigation/state.
- [ ] Core screens; design-system theme; empathetic copy.

## Phase 8 — Ops, Reconciliation, Hardening (spec: [`42`](23-Observability-and-Reconciliation.md), [`43`](24-Testing-Strategy.md), [`40`](21-Security-Threat-Model.md))
- [ ] Daily reconciliation job + mismatch runbook + alerts.
- [ ] Test suite incl. 50-webhook race, money-precision, fraud, idempotency.
- [ ] Pen-test scope executed; secrets/observability finalized.

## Go-Live Gates
- [ ] **P0→P1:** all Phase 1–8 tests green on sandbox; company registered; legal sign-off on interim custody.
- [ ] **P1→P2:** partner trust-account agreement signed; custody swapped via `CUSTODY_PHASE`; reconciliation clean for N days.

## Definition of Done (per subsystem)
Spec followed · data contracts + error cases implemented · tests per [`43`](24-Testing-Strategy.md) pass · rules in [`44`](25-Engineering-Rules.md) satisfied · observability wired.
