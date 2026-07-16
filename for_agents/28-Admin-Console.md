# Croe — Admin & Reviewer Console (`28-Admin-Console.md`)

> Reads across `dispute_cases`, `transaction_ledger`, `evidence_artifacts`, `users`. The `Human Reviewer (L3)` surface. Custody phase: all.

## 1. Purpose & Boundaries

Give L3 reviewers everything needed to adjudicate escalated disputes in minutes, and give ops the tools to manage fraud/reconciliation — all with a full audit trail. **Does not** make automated decisions ([`25`](25-Disputes-and-AI-Triage.md)); it's the human-in-the-loop.

## 2. Human-Review Queue

- Source: transactions in `UNDER_HUMAN_REVIEW` (AI confidence < 0.900 or heuristic Rule 3).
- Ordered by priority (amount, age, trust risk). Each item shows reason, amount, and why it escalated.

## 3. Case View

For one dispute, the reviewer sees:
- **Forensic timeline:** the full `transaction_ledger` for the transaction (events, timestamps, IP, device, network).
- **Evidence:** each `evidence_artifacts` item with its `SHA-256` and a "verified/recycled" badge, image preview.
- **AI payload:** the stored `ai_reasoning_payload` JSON (reasoning steps, confidence, recommended action).
- **Parties:** buyer/vendor trust scores, KYC tier, account age, freeze status.

## 4. Adjudication Actions

| Action | Effect |
| :--- | :--- |
| **Release to vendor** | Executes `RELEASE_VENDOR` via [`23`](23-Payouts-Refunds.md) → `FUNDS_RELEASED`; writes an audit ledger entry with `reviewer_id` and reason. |
| **Refund buyer** | Executes `REFUND_BUYER` → `FUNDS_REFUNDED`; audited. |
| **Freeze / unfreeze user** | Toggles `users.is_frozen`; audited. |
| **Adjust trust score** | Manual correction with reason; audited. |

Every action requires a reason string and appends to the ledger/audit — **no silent admin mutations**.

## 5. Access Control (RBAC)

| Role | Capabilities |
| :--- | :--- |
| **Reviewer (L3)** | View queue/cases; release/refund; freeze; add notes. |
| **Ops** | Reconciliation view; manage `custody_accounts`; KYC review. |
| **Admin** | User/role management; config. |

Console auth is separate from the consumer app (admin session, stronger auth, IP allow-list **[verify]**). Least privilege; all access logged.

## 6. Ops Tooling

- **Reconciliation view:** daily `ReconciliationReport` ([`12`](12-Money-Custody-and-Settlement.md)/[`42`](42-Observability-and-Reconciliation.md)); mismatch drill-down.
- **KYC review:** approve/reject `kyc_records`, set tier.
- **Fraud review:** device/IP linkage graph, frozen-account list.
- **Manual payout retry:** re-trigger a `FAILED` payout after correcting the MSISDN.

## 7. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| Concurrent reviewers on one case | Row lock / claim mechanism; second reviewer sees "in review". |
| Action on an already-terminal case | Blocked; show current state. |
| Payout fails during adjudication | Surface the `payouts.FAILED`; allow retry; case stays open. |

## 8. Acceptance Criteria

- Every escalated dispute is actionable with full forensic context in one view.
- Every admin action is authenticated, authorized, reasoned, and audit-logged.
- No admin action bypasses the payout-ordering rules of [`23`](23-Payouts-Refunds.md).
- Reconciliation mismatches are visible and drillable.
