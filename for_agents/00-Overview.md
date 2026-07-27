# Croe — Spec Package Overview (`00-Overview.md`)

> **Start here.** This is the master index for the Croe specification package. Read [`26-Glossary.md`](26-Glossary.md) first (it defines every term), then follow the numeric order.

## What Croe Is

**Croe** is a mobile-first trust & escrow service for social commerce (WhatsApp / Instagram / TikTok) in emerging markets, launching **Ghana-first** with a globally-extensible architecture. A vendor shares a payment link; the buyer pays via **Mobile Money**; funds are held in escrow until delivery is confirmed; the vendor is then paid out (less commission). Disputes are resolved by a three-tier pipeline — immutable forensic logging → sub-second SQL fraud heuristics → a **self-hosted** LLM arbitrator — escalating to a human only when genuinely ambiguous.

## How to Read This Package

1. **Vocabulary first:** [`26-Glossary.md`](26-Glossary.md).
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
- [`04-Architecture.md`](04-Architecture.md) — services + `CustodyProvider`/`PaymentRail`
- [`05-Data-Model.md`](05-Data-Model.md) — full PostgreSQL DDL, indexes, constraints
- [`06-Money-Custody-and-Settlement.md`](06-Money-Custody-and-Settlement.md) — pooled account, sub-ledger, reconciliation
- [`07-Escrow-Lifecycle.md`](07-Escrow-Lifecycle.md) — state machine & transitions

### Subsystems
- [`08-Identity-Auth.md`](08-Identity-Auth.md) · [`09-KYC-and-AML.md`](09-KYC-and-AML.md) · [`10-Payments-Collection.md`](10-Payments-Collection.md) · [`11-Payouts-Refunds.md`](11-Payouts-Refunds.md) · [`12-Webhooks-and-Idempotency.md`](12-Webhooks-and-Idempotency.md) · [`13-Disputes-and-AI-Triage.md`](13-Disputes-and-AI-Triage.md) · [`14-Evidence-and-Forensics.md`](14-Evidence-and-Forensics.md) · [`15-Notifications.md`](15-Notifications.md) · [`16-Admin-Console.md`](16-Admin-Console.md) · [`17-Trust-Score-and-Anti-Fraud.md`](17-Trust-Score-and-Anti-Fraud.md)

### API, Client & Ops
- [`18-API-Reference.md`](18-API-Reference.md) · [`19-Frontend-React-Native.md`](19-Frontend-React-Native.md) · [`20-Design-System.md`](20-Design-System.md) · [`21-Security-Threat-Model.md`](21-Security-Threat-Model.md) · [`22-Infra-and-Deployment.md`](22-Infra-and-Deployment.md) · [`23-Observability-and-Reconciliation.md`](23-Observability-and-Reconciliation.md) · [`24-Testing-Strategy.md`](24-Testing-Strategy.md) · [`25-Engineering-Rules.md`](25-Engineering-Rules.md)

### Reference & Delivery
- [`26-Glossary.md`](26-Glossary.md) — canonical vocabulary
- [`27-Roadmap.md`](27-Roadmap.md) — build sequence & progress

## Status

Specification package **complete** (28 documents). Blueprint: [`../docs/superpowers/specs/2026-07-16-escrow-spec-package-design.md`](../docs/superpowers/specs/2026-07-16-escrow-spec-package-design.md). Next: implementation per [`27-Roadmap.md`](27-Roadmap.md). Regulatory figures marked **[verify]** require confirmation with a Ghanaian fintech lawyer / Bank of Ghana before real-money launch.
