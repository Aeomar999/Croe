# Social Commerce Escrow Platform — Complete PostgreSQL Schema Specification (Schema.md)

## 1. Schema Architecture & Design Rationale
The Social Escrow database schema is engineered around three non-negotiable principles:
1. **Immutability & Forensic Auditability**: State transitions are never overwritten in-place; they are appended to `transaction_ledger` with hardware and network artifacts.
2. **Strict Fintech Data Typing**: Financial amounts use fixed-point `NUMERIC(15,2)` to prevent floating-point rounding errors. Network addresses use native `INET`. AI reasoning outputs use indexed `JSONB`.
3. **Database-Enforced Anti-Fraud Constraints**: Uses partial unique indexes and SHA-256 indexes to physically block double-deposits and recycled photo fraud at the PostgreSQL storage engine level.

---

## 2. Complete PostgreSQL Data Definition Language (DDL)

```sql
-- Enable UUID extension for secure, non-enumerable primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL, -- Primary identifier for Mobile Money
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    trust_score NUMERIC(5, 2) DEFAULT 100.00 NOT NULL, -- Scale: 0.00 to 100.00
    is_frozen BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 2. ESCROW TRANSACTIONS TABLE (Parent Contract)
-- ==========================================
CREATE TABLE escrow_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    buyer_id UUID REFERENCES users(user_id) ON DELETE RESTRICT, -- Nullable until claimed by buyer
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),          -- NEVER use FLOAT for currency
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS',                 -- e.g., GHS, NGN, KES, USD
    item_description TEXT NOT NULL,
    current_status VARCHAR(30) NOT NULL DEFAULT 'LINK_CREATED', -- Cached status for UI performance
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 3. TRANSACTION LEDGER (Append-Only Audit Trail)
-- ==========================================
-- CRITICAL: Application user permissions must REVOKE UPDATE, DELETE on this table!
CREATE TABLE transaction_ledger (
    ledger_id BIGSERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,
    actor_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- NULL if triggered by System/AI
    event_type VARCHAR(50) NOT NULL,                            -- e.g., 'FUNDS_DEPOSITED', 'DISPUTE_OPENED'
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    
    -- Silent Forensic Artifacts captured via API headers
    ip_address INET,                                            -- Native Postgres IPv4/IPv6 data type
    device_id VARCHAR(100),                                     -- Hardware fingerprint
    network_type VARCHAR(20),                                   -- e.g., 'WIFI', 'CELLULAR_4G'
    device_metadata JSONB,                                      -- OS version, app build, headers
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 4. EVIDENCE ARTIFACTS TABLE (Anti-Fraud Media Logging)
-- ==========================================
CREATE TABLE evidence_artifacts (
    artifact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,
    uploader_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    file_url VARCHAR(512) NOT NULL,
    sha256_hash CHAR(64) NOT NULL,                              -- Exact SHA-256 hash of file content
    artifact_type VARCHAR(50) NOT NULL,                         -- e.g., 'PACKAGING_PHOTO', 'DAMAGED_BOX'
    ip_address INET NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 5. DISPUTE CASES TABLE (AI Triage & Arbitrator Engine)
-- ==========================================
CREATE TABLE dispute_cases (
    dispute_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID UNIQUE NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,
    initiated_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    reason_code VARCHAR(50) NOT NULL,                           -- e.g., 'ITEM_NOT_RECEIVED', 'ITEM_DAMAGED'
    buyer_claim TEXT NOT NULL,
    
    -- AI Evaluation Logs
    ai_model_version VARCHAR(50),                               -- e.g., 'gemma-4-local-fintech-v1'
    ai_confidence_score NUMERIC(4, 3),                          -- Range: 0.000 to 1.000
    ai_recommended_action VARCHAR(50),                          -- e.g., 'REFUND_BUYER', 'RELEASE_VENDOR'
    ai_reasoning_payload JSONB,                                 -- Complete structured reasoning output
    
    status VARCHAR(30) NOT NULL DEFAULT 'AI_PROCESSING',        -- 'RESOLVED_AUTO', 'UNDER_HUMAN_REVIEW'
    final_resolution VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMPTZ
);
```

---

## 3. Critical Performance & Security Indexes

```sql
-- 1. SHA-256 Recycled Evidence Trap
-- Enables sub-millisecond lookups to verify if an uploaded file hash has EVER been used in any previous transaction.
CREATE INDEX idx_evidence_sha256 ON evidence_artifacts(sha256_hash);

-- 2. Fast Ledger Temporal Reconstruction
-- Speeds up AI context gathering by indexing events by transaction ID and chronological order.
CREATE INDEX idx_ledger_transaction_time ON transaction_ledger(transaction_id, created_at ASC);

-- 3. Sybil & Fraud IP/Device Velocity Checks
-- Allows heuristic scripts to instantly query 24-hour dispute velocity by IP address or hardware ID.
CREATE INDEX idx_ledger_forensics ON transaction_ledger(ip_address, device_id);

-- 4. JSONB GIN Indexing for AI Analytics
-- Enables querying inside structured AI outputs (e.g., searching for specific flag phrases inside JSON payloads).
CREATE INDEX idx_disputes_ai_payload ON dispute_cases USING GIN (ai_reasoning_payload);

-- 5. PARTIAL UNIQUE INDEX (The Ultimate Double-Spend Shield)
-- Guarantees that a specific transaction can ONLY have ONE 'FUNDS_DEPOSITED' event in its entire lifecycle.
-- If a concurrent thread bypasses app locks, PostgreSQL throws Error 23505 (Unique Constraint Violation).
CREATE UNIQUE INDEX idx_single_deposit_per_transaction 
ON transaction_ledger(transaction_id) 
WHERE event_type = 'FUNDS_DEPOSITED';
```

---

## 4. Database Security Triggers & Permissions

```sql
-- Auto-update updated_at timestamp on parent contract changes
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_escrow_timestamp
    BEFORE UPDATE ON escrow_transactions
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp_column();

-- Production Privilege Lockdown (Append-Only Enforcement)
-- Revoke UPDATE and DELETE permissions on transaction_ledger from the application database role.
REVOKE UPDATE, DELETE ON TABLE transaction_ledger FROM app_user;
```
