# Croe — Notifications (`15-Notifications.md`)

> Table: `notifications` ([`05-Data-Model.md`](05-Data-Model.md)). Triggered by lifecycle transitions ([`13`](07-Escrow-Lifecycle.md)). Copy tone from [`20-Design-System.md`](20-Design-System.md). Custody phase: all.

## 1. Purpose & Boundaries

Keep both parties informed at every meaningful state change, calmly and reliably, over SMS and push. **Does not** drive state — it reacts to it.

## 2. Channels & Providers

| Channel | Use | Provider |
| :--- | :--- | :--- |
| **SMS** | critical money events; users without the app | SMS aggregator (e.g. Hubtel/Twilio) **[decide]** |
| **Push** | in-app, real-time | FCM (Android) / APNs (iOS) via the RN app |
| Email | later | — |

Every notification is queued as a `notifications` row (`QUEUED`) and dispatched by a worker (`SENT`/`FAILED`).

## 3. Per-Event Notification Matrix

| Trigger (ledger event / state) | Recipient(s) | Channel | `template_key` |
| :--- | :--- | :--- | :--- |
| `FUNDS_DEPOSITED` → `FUNDS_SECURED` | Vendor + Buyer | Push + SMS | `funds_secured` |
| `SHIPPED` | Buyer | Push | `order_shipped` |
| `DELIVERY_CONFIRMED` | Vendor | Push | `delivery_confirmed` |
| `FUNDS_RELEASED` | Vendor + Buyer | Push + SMS | `funds_released` |
| `DISPUTE_OPENED` | Both | Push + SMS | `dispute_opened` |
| `UNDER_HUMAN_REVIEW` | Both | Push | `dispute_review` |
| `FUNDS_REFUNDED` | Buyer + Vendor | Push + SMS | `funds_refunded` |
| `FRAUD_LOCKOUT` | Offender | Push | `account_flagged` |
| `EXPIRED` | Both | Push | `deposit_expired` |
| Payout `FAILED` | Recipient | Push + SMS | `payout_failed` |
| KYC approved/rejected | User | Push | `kyc_result` |

Any state transition in [`13`](07-Escrow-Lifecycle.md) marked "notify" has a row here.

## 4. Templates (micro-empathy)

Templates live with the design system copy ([`32`](20-Design-System.md)); calm, non-clinical. Example:
- `funds_secured` (Vendor): "Good news — the buyer's payment for Order #{{ref}} is safely secured in Croe. You're cleared to ship. 📦"
- `dispute_opened` (Both): "We've safely paused Order #{{ref}} while our review checks the details. The funds stay protected for both of you."

Templates support variables (`{{ref}}`, `{{amount}}`, `{{currency}}`) and are localized-ready.

## 5. Delivery, Retries, Preferences

- Worker retries `FAILED` sends with backoff (max attempts, then give up + log).
- SMS is the fallback if push isn't registered/deliverable for critical money events.
- Quiet-hours/opt-out: non-critical (e.g. marketing) respect preferences; **money/dispute events always send**.

## 6. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| No push token | Fall back to SMS for critical events. |
| SMS provider error | Retry; if exhausted, mark `FAILED`, surface in ops. |
| Duplicate trigger | Dedup by `(transaction_id, template_key, event)` to avoid spamming. |
| User frozen | Still send account/security notices. |

## 7. Acceptance Criteria

- Every "notify" transition in the lifecycle produces at least one queued notification.
- Critical money/dispute events are never suppressed by preferences.
- Failed sends are retried and observable; no silent drops.
- Copy matches the calm tone in [`32`](20-Design-System.md).
