# Social Commerce Escrow Platform — Application State Machine & User Flows (AppFlow.md)

## 1. Escrow Contract Lifecycle State Machine
Every escrow transaction progresses through strict, mathematically verifiable states. State transitions are governed by PostgreSQL ACID transactions and recorded in `transaction_ledger`.

```mermaid
stateDiagram-v2
    [*] --> LINK_CREATED : Vendor generates link
    LINK_CREATED --> AWAITING_DEPOSIT : Buyer opens & enters MoMo details
    AWAITING_DEPOSIT --> FUNDS_SECURED : MoMo Webhook confirms cash deposit
    
    state FUNDS_SECURED {
        [*] --> READY_TO_SHIP
        READY_TO_SHIP --> DISPATCHED : Vendor ships order
    }
    
    FUNDS_SECURED --> DELIVERED_CONFIRMED : Buyer taps "Confirm Delivery"
    DELIVERED_CONFIRMED --> FUNDS_RELEASED : Platform disburses MoMo to Vendor
    FUNDS_RELEASED --> [*]

    FUNDS_SECURED --> DISPUTE_OPENED : Buyer/Vendor files dispute
    DISPUTE_OPENED --> AI_PROCESSING : Passes SQL Security Heuristics
    DISPUTE_OPENED --> FRAUD_LOCKOUT : Fails SQL Security Tripwire
    
    AI_PROCESSING --> RESOLVED_AUTO : AI Confidence >= 0.900
    AI_PROCESSING --> UNDER_HUMAN_REVIEW : AI Confidence < 0.900 / Inconclusive
    
    RESOLVED_AUTO --> FUNDS_REFUNDED : Recommended Action = REFUND_BUYER
    RESOLVED_AUTO --> FUNDS_RELEASED : Recommended Action = RELEASE_VENDOR
    
    UNDER_HUMAN_REVIEW --> FUNDS_REFUNDED : Admin Adjudication
    UNDER_HUMAN_REVIEW --> FUNDS_RELEASED : Admin Adjudication
    
    FUNDS_REFUNDED --> [*]
    FRAUD_LOCKOUT --> [*]
```

---

## 2. Detailed Sequence Flows

### 2.1 Flow 1: Escrow Link Creation & Social DM Handshake
```mermaid
sequenceDiagram
    autonumber
    actor V as Vendor (Flutter App)
    participant API as API (/v1/escrow)
    participant PG as PostgreSQL DB
    actor B as Buyer (WhatsApp/IG DM)

    V->>API: POST /v1/escrow (item, amount=450.00 GHS, currency='GHS')
    Note over V,API: Dio injects X-Device-Fingerprint & Idempotency-Key
    API->>PG: INSERT INTO escrow_transactions (status='LINK_CREATED')
    API->>PG: INSERT INTO transaction_ledger (event_type='LINK_CREATED')
    PG-->>API: transaction_id (UUIDv4)
    API-->>V: 201 Created (URL: https://app.escrow.co/pay/trx_89201)
    V->>B: Paste deep-link inside WhatsApp / Instagram DM
```

---

### 2.2 Flow 2: Mobile Money Deposit & Concurrency-Safe Escrow Locking
```mermaid
sequenceDiagram
    autonumber
    actor B as Buyer (Flutter App / Web)
    participant API as API Gateway
    participant Redis as Redis Cache
    participant MoMo as Mobile Money Gateway (MTN/Telecel)
    participant Worker as Backend Worker
    participant PG as PostgreSQL DB

    B->>API: POST /v1/escrow/trx_89201/deposit (phone: '+233540000000')
    API->>MoMo: Initiate Carrier USSD Push Prompt
    MoMo-->>B: Handset PIN Prompt ("Authorize 450 GHS to Escrow?")
    B->>MoMo: User enters MoMo PIN & confirms
    
    Note over MoMo,API: Asynchronous Webhook Arrival
    MoMo->>API: POST /v1/webhooks/momo-callback (x-momo-signature, timestamp)
    API->>API: Verify HMAC over rawBody & check replay timestamp (<300s)
    API->>Redis: SETNX momo_idemp:trx_89201 (24h TTL)
    API-->>MoMo: 200 OK (Fast-Response Acknowledgment < 500ms)
    
    API->>Worker: Enqueue background deposit job
    Worker->>PG: BEGIN
    Worker->>PG: SELECT current_status FROM escrow_transactions WHERE id='trx_89201' FOR UPDATE
    Worker->>PG: INSERT INTO transaction_ledger (event_type='FUNDS_DEPOSITED')
    Note over PG: Enforces Partial Unique Index idx_single_deposit_per_transaction
    Worker->>PG: UPDATE escrow_transactions SET current_status='FUNDS_SECURED'
    Worker->>PG: COMMIT
    Worker-->>V: Push Notification ("Funds Secured! Dispatch Order #89201")
```

---

### 2.3 Flow 3: Sub-Second Heuristic Tripwire & Local AI Dispute Triage
```mermaid
sequenceDiagram
    autonumber
    actor B as Buyer / Vendor
    participant API as API (/v1/disputes)
    participant PG as PostgreSQL DB
    participant AI as Local Gemma 4 AI Arbitrator

    B->>API: POST /v1/disputes (reason='ITEM_DAMAGED', claim, photo_sha256)
    Note over API,PG: Step 1: Execute Deterministic SQL Heuristics (< 50ms)
    
    par Query A (Recycled Photo Check)
        API->>PG: SELECT EXISTS(sha256_hash=$1 AND transaction_id!=$2)
    and Query B (Sybil Velocity Check)
        API->>PG: SELECT COUNT(DISTINCT actor_id) FROM ledger WHERE ip/device in 24h
    and Query C (Trust Profile Check)
        API->>PG: SELECT trust_score, account_age_hours FROM users
    end

    alt Query A == TRUE (Recycled Photo Detected)
        API->>PG: UPDATE users SET trust_score = trust_score - 50
        API->>PG: UPDATE dispute_cases SET status='FRAUD_LOCKOUT'
        API-->>B: 403 Forbidden ("Photo matches previous transaction. Claim rejected.")
    else All SQL Checks Pass
        API->>PG: INSERT INTO dispute_cases (status='AI_PROCESSING')
        API-->>B: 202 Accepted ("Under Automated Review")
        
        Note over API,AI: Step 2: Invoke Local Open-Weights LLM (< 5s)
        API->>AI: POST /v1/infer (System Prompt + Forensic Payload JSON)
        AI-->>API: JSON Output (reasoning_steps, confidence_score, recommended_action)
        
        API->>PG: UPDATE dispute_cases SET ai_reasoning_payload = $1
        alt confidence_score >= 0.900
            API->>PG: Execute Autonomous Resolution (REFUND_BUYER / RELEASE_VENDOR)
        else confidence_score < 0.900
            API->>PG: UPDATE dispute_cases SET status='UNDER_HUMAN_REVIEW'
        end
    end
```
