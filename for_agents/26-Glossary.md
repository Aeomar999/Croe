# Croe — Glossary & Canonical Vocabulary (`26-Glossary.md`)

> **This document is the single source of truth for naming.** Every other spec in `for_agents/` must use these exact terms — one canonical name per state, event, actor, action, and phase. No synonyms, no drift. If a term is missing, add it here first, then use it elsewhere.

---

## 1. Actors

| Term | Definition |
| :--- | :--- |
| **Vendor** | A social-commerce seller who creates an escrow contract (payment link) and receives payout on release. |
| **Buyer** | The consumer who pays into escrow and confirms delivery (or disputes). |
| **Croe** / **Platform** | The escrow orchestration service itself. Never legally holds funds directly until custody phase P3. |
| **Human Reviewer (L3)** | Trust-and-safety officer who adjudicates disputes the AI escalates. "L3" = third/final tier. |
| **System / AI** | Automated actor; the deterministic engine or the LLM arbitrator. Recorded as `actor_id = NULL` in the ledger. |
| **Custody Partner** | A licensed bank / EPSP / DEMI that holds the pooled float on Croe's behalf (custody phase P2+). |
| **Payment Aggregator** | A third party (Paystack / Flutterwave / Hubtel) that moves MoMo funds and sends webhooks (custody phase P0/P1). |

---

## 2. Escrow states (canonical set)

The **only** valid values for `escrow_transactions.current_status`. (This resolves the legacy `READY_TO_SHIP` / `DISPATCHED` drift — both collapse to `SHIPPED`.)

| State | Meaning |
| :--- | :--- |
| `LINK_CREATED` | Vendor generated the contract/link; no buyer or funds yet. |
| `AWAITING_DEPOSIT` | Buyer opened the link and entered MoMo details; awaiting payment confirmation. |
| `FUNDS_SECURED` | MoMo deposit confirmed; funds held in escrow; vendor cleared to ship. |
| `SHIPPED` | Vendor marked the order dispatched. |
| `DELIVERED_CONFIRMED` | Buyer tapped "Confirm Delivery". |
| `FUNDS_RELEASED` | Payout to vendor completed (terminal, success). |
| `DISPUTE_OPENED` | A party filed a dispute; funds frozen. |
| `AI_PROCESSING` | Dispute passed SQL heuristics; LLM arbitrator evaluating. |
| `UNDER_HUMAN_REVIEW` | Dispute routed to an L3 reviewer (low AI confidence or heuristic escalation). |
| `RESOLVED_AUTO` | AI auto-resolved at confidence ≥ 0.900 (transitions to `FUNDS_RELEASED` or `FUNDS_REFUNDED`). |
| `FUNDS_REFUNDED` | Refund to buyer completed (terminal). |
| `FRAUD_LOCKOUT` | A deterministic fraud tripwire fired; accounts/funds frozen (terminal). |
| `EXPIRED` | Deposit window elapsed with no payment (terminal). |
| `CANCELLED` | Vendor/buyer cancelled before funding (terminal). |

---

## 3. Ledger event types

The **only** valid values for `transaction_ledger.event_type`. Every state change appends exactly one.

| Event | Emitted when |
| :--- | :--- |
| `LINK_CREATED` | Contract created. |
| `BUYER_CLAIMED` | Buyer associates themself with the link. |
| `FUNDS_DEPOSITED` | MoMo deposit confirmed (subject to the single-deposit partial unique index). |
| `SHIPPED` | Vendor marks dispatched. |
| `DELIVERY_CONFIRMED` | Buyer confirms delivery. |
| `FUNDS_RELEASED` | Payout to vendor completed. |
| `DISPUTE_OPENED` | Dispute filed. |
| `EVIDENCE_ADDED` | Media artifact uploaded and hashed. |
| `FRAUD_FLAGGED` | Deterministic heuristic tripped. |
| `REFUND_ISSUED` | Refund to buyer completed. |
| `PAYOUT_INITIATED` | Disbursement instruction sent to custody provider. |
| `PAYOUT_FAILED` | Disbursement rejected/failed. |

---

## 4. Custody phases

The staged path for who legally holds escrow funds. Any money-touching behavior must annotate which phase(s) it applies to.

| Phase | Custody implementation | Legal holder of float |
| :--- | :--- | :--- |
| **P0 — Build** | Aggregator sandbox + local Postgres + local LLM | Nobody (test money) |
| **P1 — Pilot** | Aggregator live; funds in Croe's aggregator settlement account; payout delayed until release | Aggregator settlement account |
| **P2 — Partner-held** | Pooled trust account at a licensed bank / EPSP / DEMI partner | Licensed partner |
| **P3 — Own license** | Croe is a BoG-licensed EPSP / DEMI | Croe |

---

## 5. Dispute reason codes

Valid values for `dispute_cases.reason_code`.

| Code | Meaning |
| :--- | :--- |
| `ITEM_NOT_RECEIVED` | Buyer never received the goods. |
| `ITEM_DAMAGED` | Goods arrived damaged. |
| `WRONG_ITEM` | A different item than ordered arrived. |
| `ITEM_NOT_AS_DESCRIBED` | Item materially deviates from the listing (color/spec/quality). |

---

## 6. AI arbitrator actions

Valid values for `dispute_cases.ai_recommended_action` and the LLM output field `recommended_action`.

| Action | Effect |
| :--- | :--- |
| `REFUND_BUYER` | Refund the buyer (→ `FUNDS_REFUNDED`). |
| `RELEASE_VENDOR` | Release to the vendor (→ `FUNDS_RELEASED`). |
| `ESCALATE_HUMAN` | Route to L3 (→ `UNDER_HUMAN_REVIEW`). |

**Confidence gate:** autonomous execution of `REFUND_BUYER` / `RELEASE_VENDOR` requires `ai_confidence_score ≥ 0.900`; anything lower routes to `UNDER_HUMAN_REVIEW`.

---

## 7. KYC tiers

| Tier | Requirement | Effect |
| :--- | :--- | :--- |
| **Tier 0** | Phone number verified (OTP) only | Low per-transaction / daily limits (values in `09-KYC-and-AML.md`, marked "verify"). |
| **Tier 1** | + Full name + government ID | Higher limits. |
| **Tier 2** | + Enhanced due diligence | Highest limits; required above threshold amounts. |

---

## 8. Money & settlement terms

| Term | Definition |
| :--- | :--- |
| **Float** | The total pool of buyer funds currently held in escrow across all live transactions. |
| **Pooled trust account** | A single partner-held account containing the float (P2+). |
| **Sub-ledger** | `transaction_ledger` acting as the authoritative per-transaction accounting of who owns what within the pool. |
| **Settlement** | Funds landing in Croe's (or the partner's) account from the aggregator. |
| **Disbursement / Payout** | Moving funds out to a vendor (release) or buyer (refund) MoMo wallet. |
| **Reconciliation** | Verifying that pooled balance == sum of sub-ledger balances == partner/aggregator statement. |
| **Commission** | Croe's percentage fee deducted on release, in `NUMERIC(15,2)`. |
| **Buyer protection fee** | Croe's percentage fee paid by the buyer, added to the amount collected at deposit and returned with the refund on `FUNDS_REFUNDED`. Together with the commission it makes up the all-in fee ([`03-Business-Model-and-Costs.md`](03-Business-Model-and-Costs.md) §1). |

---

## 9. Money & currency rule (reference)

All monetary amounts are `NUMERIC(15,2)` with an explicit ISO currency code (`GHS`, `NGN`, `KES`). Never floats. Never cross-currency arithmetic without an audited conversion entry. (Enforced in `25-Engineering-Rules.md`.)
