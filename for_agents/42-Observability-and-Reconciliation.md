# Croe — Observability & Reconciliation (`42-Observability-and-Reconciliation.md`)

> The financial-integrity safety net. Reconciliation uses `CustodyProvider.reconcile()` ([`10`](10-Architecture.md)/[`12`](12-Money-Custody-and-Settlement.md)). Custody phase: P1+.

## 1. Purpose & Boundaries

Make the system's behavior — especially money — observable, and prove the float is always accounted for. **Does not** move money; it detects and alerts.

## 2. Structured Logging

- JSON logs with correlation ids (request id, `transaction_id`, `dispute_id`).
- **Never log secrets, OTP codes, tokens, raw ID numbers, or full card/wallet data.**
- Log every state transition, payout attempt/result, heuristic outcome, and webhook receipt.

## 3. Metrics & SLOs

| Metric | Target (from [`01`](01-PRD.md)) |
| :--- | :--- |
| SQL heuristic latency | < 50 ms |
| LLM inference latency | < 5 s |
| Webhook ACK latency | < 500 ms |
| Dispute auto-resolution rate | ≥ 80% |
| Double-spend incidents | 0 |
| False-positive fraud lockouts | < 0.5% |

Plus operational: payout success rate, webhook retry rate, queue depth (human review), reconciliation status.

## 4. Alerting

| Alert | Trigger |
| :--- | :--- |
| **Reconciliation mismatch** | pooled ≠ sub-ledger ≠ statement (any) → **page** |
| Payout failure spike | failed/total over threshold |
| Webhook signature failures | possible spoofing campaign |
| LLM down / timeout spike | disputes backing up to human review |
| Deposit-without-hold | settled funds not earmarked (missed webhook) |

## 5. Daily Reconciliation Job

Runs per currency (detail in [`12`](12-Money-Custody-and-Settlement.md) §4):
1. `pooled = getBalance(currency)`.
2. `subLedgerSum = SELECT SUM(amount_delta) FROM transaction_ledger WHERE currency=$1`.
3. `statementSum` = partner/aggregator statement total for the window.
4. Compare; produce `ReconciliationReport { matched, discrepancies[] }`.

### Runbook on mismatch (P1 incident)
1. **Freeze new disbursements** for the affected currency.
2. Drill into `discrepancies[]` (per-transaction deltas); pull the ledger + statement lines.
3. Classify: missed webhook (settled-not-held) → complete the `hold`; provider timing → re-run after settlement; genuine loss → escalate to founder/partner + L3.
4. Resume disbursements only after `matched = true`.

## 6. Ledger Integrity

- Verify append-only: assert the app role cannot `UPDATE`/`DELETE` `transaction_ledger` (a scheduled check + a failed-attempt alert).
- Optional hardening: hash-chain rows (`prev_hash`) for tamper-evidence.
- Invariant check I1 ([`12`](12-Money-Custody-and-Settlement.md)) runs with reconciliation.

## 7. Retention/Deletion Enforcement

A scheduled job enforces the data-protection retention policy ([`40`](40-Security-Threat-Model.md)/[`02`](02-Market-and-Regulatory.md)) — purge/anonymize beyond the required window **[verify duration]**, preserving what regulation requires to keep.

## 8. Acceptance Criteria

- Every money movement and state change is logged (no secrets).
- Reconciliation runs daily and pages on any mismatch, with a defined runbook.
- Append-only enforcement is continuously verified.
- All PRD SLOs are measured and alertable.
