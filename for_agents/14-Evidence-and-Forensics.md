# Croe — Evidence & Forensics (`14-Evidence-and-Forensics.md`)

> Table: `evidence_artifacts` + `idx_evidence_sha256` ([`05-Data-Model.md`](05-Data-Model.md)). Feeds the recycled-photo heuristic in [`25`](13-Disputes-and-AI-Triage.md). Custody phase: all.

## 1. Purpose & Boundaries

Capture tamper-evident media (packaging photos, damaged goods, receipts) and silent forensic artifacts, so disputes can be adjudicated on hard evidence. **Does not** decide disputes ([`25`](13-Disputes-and-AI-Triage.md)).

## 2. Upload Flow

```mermaid
sequenceDiagram
    actor U as Uploader (RN app)
    participant API as Croe API
    participant S3 as Object Storage
    participant PG as PostgreSQL
    U->>API: POST /v1/evidence/upload (multipart: file, transaction_id, artifact_type)
    API->>API: stream file; compute SHA-256 on the fly
    API->>PG: recycled check (sha256=$1 AND transaction_id!=$2)
    alt recycled
        API-->>U: 409 EVIDENCE_RECYCLED (calm copy)
    else new
        API->>S3: store at key derived from hash
        API->>PG: INSERT evidence_artifacts (hash, url, ip, device_id)
        API->>PG: ledger EVIDENCE_ADDED
        API-->>U: 201 {artifact_id, sha256}
    end
```

## 3. On-the-Fly Hashing

- Compute `SHA-256` while streaming (Node `crypto.createHash('sha256')`), never buffering the whole file in memory.
- Store lowercase hex in `evidence_artifacts.sha256_hash` (indexed).
- Object-storage key incorporates the hash for content-addressing and dedup.

## 4. Recycled-Evidence Trap

Before storing, run:
```sql
SELECT EXISTS (SELECT 1 FROM evidence_artifacts WHERE sha256_hash=$1 AND transaction_id!=$2);
```
If TRUE, the exact file was used in another transaction → reject upload with `409 EVIDENCE_RECYCLED`, and if it's attached to a dispute, feed Rule 1 in [`25`](13-Disputes-and-AI-Triage.md) (trust −50). Same file within the *same* transaction is allowed (re-upload).

## 5. Silent Forensic Capture

On every upload (and every mutating action generally), capture from **headers, not body**:
- `ip_address` (`INET`, from `req.ip` / trusted proxy header)
- `device_id` (`X-Device-Fingerprint`)
- `network_type` (`X-Network-Type`)
- client timestamp + `device_metadata` (OS, app build) into the ledger's `device_metadata JSONB`.

These support the repudiation defense ("my account was hacked") — if device/IP match the user's history, the claim is weak.

## 6. Error & Edge Cases

| Case | Handling |
| :--- | :--- |
| File too large | `413 FILE_TOO_LARGE` (limit configurable, e.g. 10 MB **[verify]**). |
| Unsupported type | `415 UNSUPPORTED_MEDIA_TYPE` (allow-list images/PDF). |
| Recycled hash | `409 EVIDENCE_RECYCLED`; fraud signal if in a dispute. |
| Storage failure after hash | Do not write the DB row; return `502`; client retries (idempotent by content hash). |
| Missing forensic headers | Store what's available; flag `X-Forensic-Error` internally; never block the upload solely for missing metadata. |

## 7. Retention & Privacy

Media and forensic data are retained per [`02-Market-and-Regulatory.md`](02-Market-and-Regulatory.md)/[`21-Security-Threat-Model.md`](21-Security-Threat-Model.md); access restricted to L3 review and reconciliation; deletion policy honors data-protection duties **[verify duration]**.

## 8. Acceptance Criteria

- Every uploaded file is SHA-256-hashed and checked for recycling **before** it can influence a dispute.
- Forensic artifacts are captured from headers on every mutating action.
- A recycled file across transactions is rejected and flagged.
- No file is recorded in the DB unless it was successfully stored.
