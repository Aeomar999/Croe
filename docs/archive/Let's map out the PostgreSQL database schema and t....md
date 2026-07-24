To build a fintech platform capable of automated forensics and AI dispute triage, the database architecture must prioritize **immutability**, **auditability**, and **strict data typing**.  
In PostgreSQL, we achieve this by combining traditional relational modeling with specialized financial and forensic data types—like NUMERIC for currency, INET for network routing, and JSONB for AI payloads and device metadata.  
Here is the production-ready PostgreSQL database schema designed for the Social Commerce Escrow platform.

### **1\. Entity-Relationship Overview**

The schema is built around five core tables:

1. users: Holds core identities, phone numbers (for Mobile Money), and dynamic Trust Scores.  
2. escrow\_transactions: The root contract tracking the financial agreement between buyer and vendor.  
3. transaction\_ledger **(The Core Forensic Table)**: An append-only log that captures every single state change alongside network and device artifacts.  
4. evidence\_artifacts: Tracks uploaded media (photos/receipts) and their cryptographic hashes to prevent fraud.  
5. dispute\_cases: Stores AI triage evaluations, confidence scores, and automated resolutions.

### **2\. PostgreSQL DDL (Data Definition Language)**

`-- Enable UUID extension for secure, non-sequential primary keys`  
`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

`-- 1. USERS TABLE`  
`CREATE TABLE users (`  
    `user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),`  
    `phone_number VARCHAR(20) UNIQUE NOT NULL, -- Core identifier for Mobile Money`  
    `full_name VARCHAR(100) NOT NULL,`  
    `email VARCHAR(255) UNIQUE,`  
    `trust_score NUMERIC(5, 2) DEFAULT 100.00 NOT NULL, -- Scale: 0.00 to 100.00`  
    `is_frozen BOOLEAN DEFAULT FALSE NOT NULL,`  
    `created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,`  
    `updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL`  
`);`

`-- 2. ESCROW TRANSACTIONS TABLE (The overarching contract)`  
`CREATE TABLE escrow_transactions (`  
    `transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),`  
    `vendor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,`  
    `buyer_id UUID REFERENCES users(user_id) ON DELETE RESTRICT, -- Nullable until link is claimed`  
    `amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0), -- NEVER use FLOAT for currency`  
    `currency VARCHAR(3) NOT NULL DEFAULT 'GHS', -- e.g., GHS, NGN, KES, USD`  
    `item_description TEXT NOT NULL,`  
    `-- Cached current state for fast UI querying; actual history is in the ledger`  
    `current_status VARCHAR(30) NOT NULL DEFAULT 'LINK_CREATED',`   
    `created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,`  
    `updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL`  
`);`

`-- 3. TRANSACTION LEDGER (Append-Only Forensic Audit Trail)`  
`-- CRITICAL: Revoke UPDATE and DELETE permissions on this table in production!`  
`CREATE TABLE transaction_ledger (`  
    `ledger_id BIGSERIAL PRIMARY KEY,`  
    `transaction_id UUID NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,`  
    `actor_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- NULL if triggered by System/AI`  
    `event_type VARCHAR(50) NOT NULL, -- e.g., 'FUNDS_DEPOSITED', 'DISPUTE_OPENED', 'AUTO_RELEASED'`  
    `previous_status VARCHAR(30),`  
    `new_status VARCHAR(30) NOT NULL,`  
      
    `-- Silent Forensic Artifacts`  
    `ip_address INET, -- Native Postgres IPv4/IPv6 data type`  
    `device_id VARCHAR(100), -- Unique hardware fingerprint`  
    `network_type VARCHAR(20), -- e.g., 'WIFI', '4G', '5G'`  
    `device_metadata JSONB, -- Flexible store for OS version, GPS coordinates, browser headers`  
      
    `created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL`  
`);`

`-- 4. EVIDENCE ARTIFACTS TABLE (Anti-Fraud Media Logging)`  
`CREATE TABLE evidence_artifacts (`  
    `artifact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),`  
    `transaction_id UUID NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,`  
    `uploader_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,`  
    `file_url VARCHAR(512) NOT NULL,`  
      
    `-- Cryptographic hash of the actual file content to catch recycled scam photos`  
    `sha256_hash CHAR(64) NOT NULL,`   
    `artifact_type VARCHAR(50) NOT NULL, -- e.g., 'PACKAGING_PHOTO', 'DAMAGED_BOX', 'COURIER_RECEIPT'`  
      
    `-- Forensic capture at the exact moment of upload`  
    `ip_address INET NOT NULL,`  
    `device_id VARCHAR(100) NOT NULL,`  
    `created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL`  
`);`

`-- 5. DISPUTE CASES TABLE (AI Triage & Resolution Engine)`  
`CREATE TABLE dispute_cases (`  
    `dispute_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),`  
    `transaction_id UUID UNIQUE NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,`  
    `initiated_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,`  
    `reason_code VARCHAR(50) NOT NULL, -- e.g., 'ITEM_NOT_RECEIVED', 'ITEM_DAMAGED', 'WRONG_ITEM'`  
    `buyer_claim TEXT NOT NULL,`  
      
    `-- AI Evaluation Logs`  
    `ai_model_version VARCHAR(50), -- e.g., 'gemma-4-local-fintech-v1'`  
    `ai_confidence_score NUMERIC(4, 3), -- Range: 0.000 to 1.000 (e.g., 0.945)`  
    `ai_recommended_action VARCHAR(50), -- e.g., 'REFUND_BUYER', 'RELEASE_VENDOR', 'ESCALATE_HUMAN'`  
    `ai_reasoning_payload JSONB, -- Stores the full structured reasoning output from the LLM`  
      
    `status VARCHAR(30) NOT NULL DEFAULT 'AI_PROCESSING', -- 'RESOLVED_AUTO', 'UNDER_HUMAN_REVIEW'`  
    `final_resolution VARCHAR(50),`  
    `created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,`  
    `resolved_at TIMESTAMPTZ`  
`);`

### **3\. Critical Database Performance & Security Indexes**

To ensure the automated forensic checks happen in under a second (Step 2 of your triage flow), you must implement these specialized PostgreSQL indexes:  
`-- 1. Catch Photo Recycling Instantly`  
`-- This index allows the backend to check if a uploaded SHA-256 hash has EVER been used`   
`-- in any previous transaction in milliseconds.`  
`CREATE INDEX idx_evidence_sha256 ON evidence_artifacts(sha256_hash);`

`-- 2. Fast Ledger Reconstruction`  
`-- Speeds up AI context gathering by indexing ledger events by transaction and time.`  
`CREATE INDEX idx_ledger_transaction_time ON transaction_ledger(transaction_id, created_at ASC);`

`-- 3. Rapid Fraud/IP Velocity Checks`  
`-- Allows heuristic scripts to instantly query how many times an IP or Device ID`   
`-- has triggered a state change across different accounts within the last 24 hours.`  
`CREATE INDEX idx_ledger_forensics ON transaction_ledger(ip_address, device_id);`

`-- 4. JSONB Indexing for AI Analytics`  
`-- Allows querying inside the JSONB payload (e.g., finding all disputes where Gemma flagged "blurry photo")`  
`CREATE INDEX idx_disputes_ai_payload ON dispute_cases USING GIN (ai_reasoning_payload);`

### **4\. How This Schema Powers the Platform**

* **The Append-Only Guarantee:** When a buyer deposits money, you do not update escrow\_transactions.current\_status in isolation. A PostgreSQL database trigger (or application transaction block) ensures that a new row is explicitly added to transaction\_ledger. If an admin or bad actor attempts to alter the ledger, database permissions should reject UPDATE or DELETE commands entirely.  
* **The Zero-Day Fraud Trap:** Notice the sha256\_hash CHAR(64) in the evidence\_artifacts table. When a buyer uploads a photo claiming a box arrived damaged, the backend computes the SHA-256 hash of that image. Before the AI even looks at it, a SELECT EXISTS(SELECT 1 FROM evidence\_artifacts WHERE sha256\_hash \= $1 AND transaction\_id \!= $2) query runs. If it returns true, the user is attempting to reuse an old photo from a different dispute; the system immediately auto-resolves the dispute in favor of the vendor and drops the buyer's trust\_score.  
* **Full Context for the LLM:** When dispute\_cases is generated, your backend queries evidence\_artifacts and transaction\_ledger by transaction\_id, packages the timestamps, IPs, and image URLs into a single structured prompt, and passes it to your local Gemma model. The model's structured decision is then saved permanently into ai\_reasoning\_payload (JSONB) for regulatory compliance and auditability.