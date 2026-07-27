# Croe — Trust Score & Anti-Fraud (`17-Trust-Score-and-Anti-Fraud.md`)

> Fields: `users.trust_score` (`NUMERIC(5,2)`, 0–100), `users.is_frozen`. Works with the dispute heuristics ([`25`](13-Disputes-and-AI-Triage.md)) and forensic ledger ([`26`](14-Evidence-and-Forensics.md)). v1 is **deterministic** (ML is future work). Custody phase: all.

## 1. Purpose & Boundaries

Quantify each user's trustworthiness and gate risky behavior, deterministically and auditably. **Does not** replace the per-dispute heuristics — it's the longer-lived reputation signal they feed into.

## 2. Trust Score Model

- Range `0.00`–`100.00`, default `100.00`. Higher = more trusted.
- **Deterministic adjustments** (each writes a ledger/audit entry with the reason):

| Event | Δ trust | Source |
| :--- | :--- | :--- |
| Recycled evidence detected | −50 | [`25`](13-Disputes-and-AI-Triage.md) Rule 1 |
| Dispute lost (ruled against user) | −10 **[verify]** | dispute resolution |
| Sybil/velocity tripwire | −50 + freeze | [`25`](13-Disputes-and-AI-Triage.md) Rule 2 |
| Successful released transaction | +1 (cap 100) **[verify]** | lifecycle |
| Chargeback/refund fraud pattern | −25 **[verify]** | fraud review |

Scores are clamped to `[0,100]` by the `CHECK` constraint.

## 3. Freeze / Ban Thresholds

| Condition | Action |
| :--- | :--- |
| `trust_score < 20` **[verify]** | Auto-freeze (`is_frozen=TRUE`); block new escrows/deposits; existing escrows continue to safe resolution. |
| Sybil tripwire | Immediate freeze of all device-linked accounts. |
| Repeated recycled evidence | Device-level ban (block by `device_id`). |

Freezing never seizes in-escrow funds — those resolve through the normal lifecycle/dispute path.

## 4. Fraud Rules Engine (deterministic)

Runs on dispute open and (lightweight) on escrow create/deposit:
- **Recycled media** — SHA-256 match across transactions ([`26`](14-Evidence-and-Forensics.md)).
- **Sybil / velocity** — distinct accounts or disputes per IP/device in 24h over threshold ([`25`](13-Disputes-and-AI-Triage.md) Query B).
- **Burner account** — age < 48h + trust < 50 → human review.
- **Device linkage** — many accounts sharing one `device_id` → flag to L3.
- **Structuring** — repeated amounts just under KYC caps ([`21`](09-KYC-and-AML.md)).

All thresholds are config values, marked **[verify]**, tuned to keep false-positive lockouts < 0.5% (KPI, [`01`](01-PRD.md)).

## 5. Gating Effects

| Score / flag | Effect |
| :--- | :--- |
| Normal (≥ 50) | Full access. |
| Low (20–50) | Reduced caps; extra scrutiny on disputes. |
| Frozen (< 20 or tripwire) | No new money actions; calm in-app explanation. |

## 6. Appeals

A frozen/penalized user can request review via the app; routed to L3 ([`28`](16-Admin-Console.md)), who can restore score/unfreeze with an audited reason.

## 7. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| Score would go below 0 / above 100 | Clamp (DB `CHECK`). |
| Shared device (family) false positive | L3 can whitelist; linkage is a flag, not an auto-ban, except for confirmed recycled-media abuse. |
| Race on concurrent adjustments | Apply deltas under row lock; each delta separately audited. |

## 8. Acceptance Criteria

- Every trust-score change is deterministic and audit-logged with a reason.
- Freezing blocks new money actions but never seizes in-escrow funds.
- All thresholds are configurable and documented as **[verify]**.
- Fraud rules keep false-positive lockouts within the < 0.5% KPI target.
