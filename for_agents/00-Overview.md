# Croe — Spec Package Overview (`00-Overview.md`)

> **Start here.** This is the master index for the Croe specification package. Read [`45-Glossary.md`](45-Glossary.md) first (it defines every term), then follow the numeric order.

## What Croe Is

**Croe** is a mobile-first trust & escrow service for social commerce (WhatsApp / Instagram / TikTok) in emerging markets, launching **Ghana-first** with a globally-extensible architecture. A vendor shares a payment link; the buyer pays via **Mobile Money**; funds are held in escrow until delivery is confirmed; the vendor is then paid out (less commission). Disputes are resolved by a three-tier pipeline — immutable forensic logging → sub-second SQL fraud heuristics → a **self-hosted** LLM arbitrator — escalating to a human only when genuinely ambiguous.

## How to Read This Package

1. **Vocabulary first:** [`45-Glossary.md`](45-Glossary.md).
2. **Foundation:** PRD, market/regulatory, business/costs.
3. **Architecture & money:** the provider abstractions, data model, custody, lifecycle.
4. **Subsystems → API/client → ops.**
5. **Roadmap** for the build sequence.

Every money-touching behavior is annotated with a **custody phase** (P0–P3). Naming is canonical — one term per concept, defined in the glossary.

## Custody Phases (summary)

| Phase | Custody | Cost | Legal standing |
| :--- | :--- | :--- | :--- |
| **P0 Build** | aggregator sandbox + local LLM | ~0 GHS | dev only |
| **P1 Pilot** | aggregator settlement, delayed payout | pay-as-you-go % | interim, low volume |
| **P2 Partner-held** | licensed partner trust account | partner deal | compliant scale |
| **P3 Own licence** | Croe (EPSP/DEMI) | millions GHS **[verify]** | fully licensed, later |

## Document Map

### Foundation & Product
- [`00-Overview.md`](00-Overview.md) — this index
- [`01-PRD.md`](01-PRD.md) — product requirements, personas, non-goals, KPIs
- [`02-Market-and-Regulatory.md`](02-Market-and-Regulatory.md) — Ghana/BoG, KYC/AML, the legal custody path
- [`03-Business-Model-and-Costs.md`](03-Business-Model-and-Costs.md) — commission, per-phase costs, unit economics

### Architecture & Money
- [`10-Architecture.md`](10-Architecture.md) — services + `CustodyProvider`/`PaymentRail`
- [`11-Data-Model.md`](11-Data-Model.md) — full PostgreSQL DDL, indexes, constraints
- [`12-Money-Custody-and-Settlement.md`](12-Money-Custody-and-Settlement.md) — pooled account, sub-ledger, reconciliation
- [`13-Escrow-Lifecycle.md`](13-Escrow-Lifecycle.md) — state machine & transitions

### Subsystems
- [`20-Identity-Auth.md`](20-Identity-Auth.md) · [`21-KYC-and-AML.md`](21-KYC-and-AML.md) · [`22-Payments-Collection.md`](22-Payments-Collection.md) · [`23-Payouts-Refunds.md`](23-Payouts-Refunds.md) · [`24-Webhooks-and-Idempotency.md`](24-Webhooks-and-Idempotency.md) · [`25-Disputes-and-AI-Triage.md`](25-Disputes-and-AI-Triage.md) · [`26-Evidence-and-Forensics.md`](26-Evidence-and-Forensics.md) · [`27-Notifications.md`](27-Notifications.md) · [`28-Admin-Console.md`](28-Admin-Console.md) · [`29-Trust-Score-and-Anti-Fraud.md`](29-Trust-Score-and-Anti-Fraud.md)

### API, Client & Ops
- [`30-API-Reference.md`](30-API-Reference.md) · [`31-Frontend-React-Native.md`](31-Frontend-React-Native.md) · [`32-Design-System.md`](32-Design-System.md) · [`40-Security-Threat-Model.md`](40-Security-Threat-Model.md) · [`41-Infra-and-Deployment.md`](41-Infra-and-Deployment.md) · [`42-Observability-and-Reconciliation.md`](42-Observability-and-Reconciliation.md) · [`43-Testing-Strategy.md`](43-Testing-Strategy.md) · [`44-Engineering-Rules.md`](44-Engineering-Rules.md)

### Reference & Delivery
- [`45-Glossary.md`](45-Glossary.md) — canonical vocabulary
- [`90-Roadmap.md`](90-Roadmap.md) — build sequence & progress

## Status

Specification package **complete** (28 documents). Blueprint: [`../docs/superpowers/specs/2026-07-16-escrow-spec-package-design.md`](../docs/superpowers/specs/2026-07-16-escrow-spec-package-design.md). Next: implementation per [`90-Roadmap.md`](90-Roadmap.md). Regulatory figures marked **[verify]** require confirmation with a Ghanaian fintech lawyer / Bank of Ghana before real-money launch.
