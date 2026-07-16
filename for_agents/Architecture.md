# Social Commerce Escrow Platform — System Architecture Blueprint (Architecture.md)

## 1. Architectural Principles
1. **Zero-Trust Client Ingestion**: Never trust client request bodies for security metadata. Capture device hardware IDs, IP addresses, and timestamps via middleware header injection.
2. **Fail-Fast Deterministic Security**: Execute lightweight, sub-second SQL heuristic checks before allocating expensive compute or human review.
3. **Database-Enforced ACID Isolation**: Push race-condition prevention down to PostgreSQL row-level locks (`SELECT FOR UPDATE`) and structural partial unique indexes.
4. **Immutable Forensic Ledgers**: Separate current UI status caching (`escrow_transactions`) from historical audit logs (`transaction_ledger`).

---

## 2. High-Level System Architecture Diagram

```mermaid
graph TD
    subgraph Client ["Mobile App Tier (Flutter)"]
        UI["Flutter App UI/UX"]
        Interceptor["FintechForensicInterceptor (Dio)"]
        UI --> Interceptor
    end

    subgraph Edge ["API Gateway & Middleware"]
        Auth["HMAC & Security Verifier"]
        RateLimit["Redis Rate Limiter & SETNX Gate"]
    end

    subgraph API ["Core Backend API Tier (Node.js/TypeScript)"]
        EscrowSvc["Escrow Contract Service"]
        EvidenceSvc["Evidence & Media Service (SHA-256 Hash)"]
        DisputeSvc["Dispute & Triage Router"]
        WebhookSvc["MoMo Webhook Worker"]
    end

    subgraph Data ["Data & Storage Layer"]
        PG["PostgreSQL 16+ (ACID & Row Locks)"]
        S3["Object Storage (Hashed Photos/Receipts)"]
    end

    subgraph AI ["Local AI Arbitrator Engine"]
        SQLHeuristics["SQL Deterministic Security Engine (< 50ms)"]
        GemmaLLM["Self-Hosted Gemma 4 LLM Container"]
    end

    subgraph External ["Payment Gateway"]
        MoMo["Mobile Money Network (MTN/Telecel/Paystack)"]
    end

    Interceptor -- "HTTPS REST + X-Forensic Headers" --> Auth
    Auth --> RateLimit
    RateLimit --> EscrowSvc
    RateLimit --> EvidenceSvc
    RateLimit --> DisputeSvc

    EscrowSvc <--> PG
    EvidenceSvc --> S3
    EvidenceSvc --> PG
    WebhookSvc <--> PG

    MoMo -- "POST /v1/webhooks/momo-callback (HMAC Signed)" --> Auth
    EscrowSvc -- "Trigger MoMo USSD Prompt" --> MoMo

    DisputeSvc --> SQLHeuristics
    SQLHeuristics -- "Passes Security Checks" --> GemmaLLM
    SQLHeuristics -- "Fails Tripwire" --> PG
    GemmaLLM -- "Structured JSON Decision" --> PG
```

---

## 3. Subsystem Architectural Deep Dives

### 3.1 The Concurrency & Double-Spend Defense Engine
When asynchronous Mobile Money payment webhooks hit the backend, network retries or duplicate callbacks create severe double-spend hazards. The backend enforces three layered gates:

```mermaid
sequenceDiagram
    participant MoMo as Mobile Money Gateway
    participant API as Webhook Endpoint
    participant Redis as Redis Cache
    participant PG as PostgreSQL Engine

    MoMo->>API: POST /v1/webhooks/momo-callback
    API->>API: Verify HMAC-SHA256 (Raw Buffer) & Replay Timestamp (<300s)
    API->>Redis: SETNX momo_idemp:trx_89201 (TTL: 24h)
    alt Key Already Exists in Redis
        Redis-->>API: 0 (Duplicate Request)
        API-->>MoMo: 200 OK (Short-circuit immediately)
    else New Request
        Redis-->>API: 1 (Acquired)
        API-->>MoMo: 200 OK (Fast Response Rule - <500ms)
        Note over API,PG: Asynchronous Worker Background Processing
        API->>PG: BEGIN
        API->>PG: SELECT current_status FROM escrow_transactions WHERE transaction_id = $1 FOR UPDATE
        Note over PG: Primary Key Index Scan places exclusive row lock
        alt current_status == 'FUNDS_SECURED'
            API->>PG: ROLLBACK (Already processed by concurrent thread)
        else Safe to Fund
            API->>PG: INSERT INTO transaction_ledger (event_type = 'FUNDS_DEPOSITED')
            Note over PG: Enforces Partial Unique Index constraint on FUNDS_DEPOSITED
            API->>PG: UPDATE escrow_transactions SET current_status = 'FUNDS_SECURED'
            API->>PG: COMMIT
        end
    end
```

### 3.2 Automated Forensic & Triage Architecture
When a dispute is initiated (`POST /v1/disputes`), the backend avoids invoking the LLM until deterministic SQL checks pass:

```
+-----------------------------------------------------------------------------------+
|                        DISPUTE INITIATION (POST /v1/disputes)                     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                   STEP 1: DETERMINISTIC SQL HEURISTICS (< 50ms)                   |
|                                                                                   |
|  Query A: SELECT EXISTS (sha256_hash = $1 AND transaction_id != $2)               |
|  Query B: SELECT COUNT(DISTINCT actor_id) FROM ledger WHERE ip/device in 24h      |
|  Query C: SELECT trust_score, account_age_hours FROM users WHERE user_id = $1     |
+-----------------------------------------------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         | (Tripped Fraud Rule)                                          | (All Passed)
         v                                                               v
+-----------------------------------+               +-------------------------------+
|     INSTANT SECURITY LOCKOUT      |               | STEP 2: GEMMA 4 LOCAL INFER   |
| - Ban / Freeze Device ID          |               | - Build prompt from artifacts |
| - Deduct -50 Trust Score          |               | - Parse JSON reasoning        |
| - Auto-resolve against bad actor  |               +-------------------------------+
+-----------------------------------+                                |
                                            +------------------------+------------------------+
                                            | (Confidence >= 0.90)                            | (Confidence < 0.90)
                                            v                                                 v
                              +---------------------------+                     +---------------------------+
                              |   AUTONOMOUS EXECUTION    |                     |    HUMAN REVIEW QUEUE     |
                              | - Smart Contract Payout   |                     | - Route to Admin Panel    |
                              | - Notify users via Push   |                     | - Attach AI Payload JSON  |
                              +---------------------------+                     +---------------------------+
```

---

## 4. API Domain Segmentation
The REST API is organized into four clean domains:
1. **`/v1/escrow`**: Lifecycle management (create contract, query status, trigger deposit, confirm delivery).
2. **`/v1/evidence`**: Media upload with on-the-fly SHA-256 computation and secure S3/R2 storage.
3. **`/v1/disputes`**: Dispute submission, status polling, and AI triage payload management.
4. **`/v1/webhooks`**: Cryptographically hardened callback receivers for Mobile Money gateways.
