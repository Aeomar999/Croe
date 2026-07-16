# Croe — Payments: Collection & Deposits (`22-Payments-Collection.md`)

> Uses `CustodyProvider.collect()` and `PaymentRail.initiateDeposit()`/`parseWebhook()` ([`10-Architecture.md`](10-Architecture.md)). Webhook security in [`24`](24-Webhooks-and-Idempotency.md). Custody phase: P0 sandbox / P1 live / P2 partner.

## 1. Purpose & Boundaries

Move a buyer's MoMo funds **into** escrow. Owns the deposit request and the confirmation path. **Does not** own disbursements ([`23`](23-Payouts-Refunds.md)) or webhook signature verification ([`24`](24-Webhooks-and-Idempotency.md)).

## 2. Deposit Flow

```mermaid
sequenceDiagram
    actor B as Buyer (RN app)
    participant API as Croe API
    participant Custody as CustodyProvider
    participant Rail as PaymentRail (MoMo)
    participant Agg as Aggregator
    B->>API: POST /v1/escrow/:id/deposit {msisdn, carrier}
    API->>API: check KYC cap; state AWAITING_DEPOSIT
    API->>Custody: collect({transactionId, buyerMsisdn, amount, rail})
    Custody->>Rail: initiateDeposit(...)
    Rail->>Agg: create charge (USSD push)
    Agg-->>B: Handset PIN prompt ("Authorize X GHS to Croe?")
    API-->>B: 202 Accepted {collectionRef, status: PENDING}
    Note over Agg,API: later, asynchronously
    Agg->>API: webhook PAID (see 24 for verify/lock)
    API->>Custody: hold(transactionId, amount)  --> FUNDS_SECURED
```

## 3. Endpoint

`POST /v1/escrow/:transaction_id/deposit`
- **Actor:** Buyer. **Requires:** `Idempotency-Key`, session, KYC within cap.
- **Body:** `{ "msisdn": "+233...", "carrier": "MTN" | "TELECEL" | "AIRTELTIGO" }`
- **Response:** `202 { collectionRef, status: "PENDING" }`. The actual `FUNDS_SECURED` transition happens on the webhook, not here.

## 4. Provider / Carrier Selection

- Carrier (`MTN`/`TELECEL`/`AIRTELTIGO`) chosen by the buyer, matched to the aggregator's channel.
- Aggregator selection (Paystack/Flutterwave/Hubtel) is config-driven behind `PaymentRail`; can differ per carrier/currency.
- P0 uses the aggregator **sandbox**; P1/P2 use live.

## 5. Confirmation & State

The deposit becomes real only when a **verified** webhook with `outcome = PAID` arrives:
1. Webhook verified + deduped ([`24`](24-Webhooks-and-Idempotency.md)).
2. `SELECT FOR UPDATE` the transaction row.
3. `hold()` → append `FUNDS_DEPOSITED` (partial unique index guarantees one), set `FUNDS_SECURED`.
4. Notify both parties ([`27`](27-Notifications.md)).

## 6. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| USSD not authorized / timeout | Webhook `outcome = CANCELLED`/`FAILED`; stay `AWAITING_DEPOSIT`; buyer may retry (new `collectionRef`). |
| Buyer double-taps deposit | `Idempotency-Key` returns the first `collectionRef`; no duplicate charge. |
| Duplicate `PAID` webhooks | Deduped by `webhook_inbox` + partial unique index → exactly one `FUNDS_DEPOSITED`. |
| Amount mismatch (paid ≠ contract amount) | Reject the hold; flag to L3; do not mark `FUNDS_SECURED`. |
| Deposit after window (`EXPIRED`) | Reject/hold for manual refund; never fund an expired contract silently. |
| Wrong currency | Reject; `422 CURRENCY_MISMATCH`. |
| Settled-but-not-held (missed webhook) | Reconciliation sweep ([`12`](12-Money-Custody-and-Settlement.md)/[`42`](42-Observability-and-Reconciliation.md)) completes the hold. |

## 7. Acceptance Criteria

- A deposit never marks `FUNDS_SECURED` without a verified `PAID` webhook.
- Exactly one `FUNDS_DEPOSITED` per transaction, even under concurrent/duplicate webhooks.
- Retries and double-taps never double-charge (idempotent).
- Every deposit outcome maps to a defined state and (where money moved) a ledger event.
- Works identically against sandbox (P0) and live (P1+) via config only.
