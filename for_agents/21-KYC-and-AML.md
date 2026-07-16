# Croe — KYC & AML (`21-KYC-and-AML.md`)

> Tables: `kyc_records`, `users.kyc_tier` ([`11-Data-Model.md`](11-Data-Model.md)). Regulatory context: [`02-Market-and-Regulatory.md`](02-Market-and-Regulatory.md). All thresholds marked **[verify]** against BoG/partner rules. Custody phase: gating matters from P1 (real money).

## 1. Purpose & Boundaries

Verify user identity proportionate to transaction risk, enforce per-tier limits, and support AML obligations (record-keeping, suspicious-activity handling). **Does not** move money or authenticate sessions ([`20`](20-Identity-Auth.md)).

## 2. KYC Tiers & Limits

| Tier | Requirement | Per-transaction cap | Daily cap | Typical user |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0** | Phone verified (OTP) | low (e.g. `500.00 GHS`) **[verify]** | low (e.g. `1,000.00`) **[verify]** | new buyer |
| **Tier 1** | + full name + government ID (Ghana Card / passport) | mid (e.g. `5,000.00`) **[verify]** | mid **[verify]** | active vendor |
| **Tier 2** | + enhanced due diligence | high **[verify]** | high **[verify]** | high-volume vendor |

Limits are enforced when creating an escrow (vendor side) and depositing (buyer side): if the amount would exceed the actor's tier cap, block with `403 KYC_LIMIT_EXCEEDED` and prompt an upgrade.

## 3. Verification Flow

```mermaid
sequenceDiagram
    actor U as User
    participant API as Croe API
    participant Rev as Reviewer / Provider
    U->>API: POST /v1/kyc/submit {id_type, id_image}
    API->>API: hash ID number; store kyc_records (PENDING); store image (hashed key)
    API->>Rev: Queue for review (manual v1 / provider later)
    Rev->>API: approve/reject
    API->>API: on approve -> users.kyc_tier = tier; kyc_records APPROVED
    API-->>U: notification (tier upgraded / rejected reason)
```

- **v1:** manual review via the admin console ([`28`](28-Admin-Console.md)).
- **Later:** integrate an identity provider (Smile ID, Dojah, etc.) — behind an interface so v1 manual and later automated share the same `kyc_records` contract.
- **Privacy:** store a **hash** of the ID number (`id_number_hash`), not the raw value; ID images in access-restricted storage; retention per [`02`](02-Market-and-Regulatory.md)/[`40`](40-Security-Threat-Model.md).

## 4. AML Controls

| Control | v1 approach | Future |
| :--- | :--- | :--- |
| **Customer due diligence** | Tiered KYC above | Automated ID verification |
| **Sanctions / PEP screening** | Manual check at Tier 2 onboarding | Automated screening API |
| **Suspicious-activity detection** | Deterministic flags (velocity, structuring near caps) surfaced to L3 | ML anomaly detection |
| **Suspicious-activity reporting** | L3 files with the FIC **[verify process]** | Assisted workflow |
| **Record-keeping** | Append-only ledger + `kyc_records`, retained **[verify duration]** | — |

**Structuring watch:** repeated transactions just under a tier cap from one user/device → flag to L3 (links to [`29-Trust-Score-and-Anti-Fraud.md`](29-Trust-Score-and-Anti-Fraud.md)).

## 5. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| Amount over tier cap | `403 KYC_LIMIT_EXCEEDED` + upgrade prompt. |
| Duplicate ID across accounts | Flag potential multi-accounting to L3; do not auto-approve. |
| Rejected KYC | Store reason; allow re-submit; keep tier unchanged. |
| ID image unreadable | `422 KYC_IMAGE_INVALID`; request re-upload. |
| Frozen user submits KYC | Accept submission but keep money actions blocked until unfrozen. |

## 6. Acceptance Criteria

- Every money action checks the actor's tier cap before proceeding.
- Raw government-ID numbers are never stored in plaintext.
- A tier upgrade requires an explicit approval event (audit-logged).
- Suspicious patterns produce an L3-visible flag; nothing is silently dropped.
- All thresholds are configurable and marked **[verify]** until confirmed.
