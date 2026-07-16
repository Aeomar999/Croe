# Croe — Data Model & PostgreSQL Schema (`11-Data-Model.md`)

> States, events, reason codes, AI actions, and KYC tiers are the canonical sets from [`45-Glossary.md`](45-Glossary.md) and are enforced here with `CHECK` constraints. Money is `NUMERIC(15,2)`. This DDL targets **PostgreSQL 16+**.

## 1. Design Principles

1. **Immutability & auditability** — state history lives in append-only `transaction_ledger`, never overwritten.
2. **Strict fintech typing** — `NUMERIC(15,2)` money, `INET` addresses, `JSONB` (GIN-indexed) AI payloads, `UUID` non-enumerable keys.
3. **DB-enforced anti-fraud** — partial unique indexes and SHA-256 indexes block double-deposits and recycled media at the storage-engine level.
4. **Enum discipline** — every status/type column has a `CHECK` against the glossary set (no free-text drift).

## 2. Extensions & Enum Domains

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Canonical value sets enforced via CHECK constraints (kept inline for clarity;
-- may be migrated to lookup tables if the admin console needs to manage them).
-- Escrow states, ledger events, reason codes, AI actions, KYC tiers: see 45-Glossary.md.
```

## 3. Core Tables

### 3.1 `users`
```sql
CREATE TABLE users (
    user_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number  VARCHAR(20) UNIQUE NOT NULL,           -- E.164, primary MoMo identifier
    full_name     VARCHAR(100),                          -- NULL until KYC Tier 1
    email         VARCHAR(255) UNIQUE,
    kyc_tier      SMALLINT NOT NULL DEFAULT 0 CHECK (kyc_tier IN (0,1,2)),
    trust_score   NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (trust_score >= 0 AND trust_score <= 100),
    is_frozen     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 `escrow_transactions` (cached contract state)
```sql
CREATE TABLE escrow_transactions (
    transaction_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    buyer_id         UUID REFERENCES users(user_id) ON DELETE RESTRICT,   -- NULL until BUYER_CLAIMED
    amount           NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency         VARCHAR(3) NOT NULL DEFAULT 'GHS' CHECK (currency IN ('GHS','NGN','KES')),
    commission       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (commission >= 0),
    item_description TEXT NOT NULL,
    current_status   VARCHAR(30) NOT NULL DEFAULT 'LINK_CREATED'
                     CHECK (current_status IN (
                       'LINK_CREATED','AWAITING_DEPOSIT','FUNDS_SECURED','SHIPPED',
                       'DELIVERED_CONFIRMED','FUNDS_RELEASED','DISPUTE_OPENED','AI_PROCESSING',
                       'UNDER_HUMAN_REVIEW','RESOLVED_AUTO','FUNDS_REFUNDED','FRAUD_LOCKOUT',
                       'EXPIRED','CANCELLED')),
    deposit_expires_at TIMESTAMPTZ,                       -- deposit window
    dispute_closes_at  TIMESTAMPTZ,                       -- auto-release deadline
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 `transaction_ledger` (append-only audit + sub-ledger)
```sql
-- CRITICAL: application DB role has UPDATE/DELETE REVOKED (see §7).
CREATE TABLE transaction_ledger (
    ledger_id       BIGSERIAL PRIMARY KEY,
    transaction_id  UUID NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,
    actor_id        UUID REFERENCES users(user_id) ON DELETE SET NULL,     -- NULL = System/AI
    event_type      VARCHAR(50) NOT NULL
                    CHECK (event_type IN (
                      'LINK_CREATED','BUYER_CLAIMED','FUNDS_DEPOSITED','SHIPPED','DELIVERY_CONFIRMED',
                      'FUNDS_RELEASED','DISPUTE_OPENED','EVIDENCE_ADDED','FRAUD_FLAGGED','REFUND_ISSUED',
                      'PAYOUT_INITIATED','PAYOUT_FAILED')),
    previous_status VARCHAR(30),
    new_status      VARCHAR(30) NOT NULL,
    amount_delta    NUMERIC(15,2),                        -- signed effect on this transaction's sub-ledger balance (nullable for non-money events)
    currency        VARCHAR(3) CHECK (currency IN ('GHS','NGN','KES')),
    -- Silent forensic artifacts (from request headers, never body)
    ip_address      INET,
    device_id       VARCHAR(100),
    network_type    VARCHAR(20),
    device_metadata JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 `evidence_artifacts`
```sql
CREATE TABLE evidence_artifacts (
    artifact_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id  UUID NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,
    uploader_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    file_url        VARCHAR(512) NOT NULL,
    sha256_hash     CHAR(64) NOT NULL,                    -- lowercase hex
    artifact_type   VARCHAR(50) NOT NULL,                 -- e.g. PACKAGING_PHOTO, DAMAGED_BOX, COURIER_RECEIPT
    ip_address      INET NOT NULL,
    device_id       VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 `dispute_cases`
```sql
CREATE TABLE dispute_cases (
    dispute_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id        UUID UNIQUE NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,
    initiated_by          UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    reason_code           VARCHAR(50) NOT NULL
                          CHECK (reason_code IN ('ITEM_NOT_RECEIVED','ITEM_DAMAGED','WRONG_ITEM','ITEM_NOT_AS_DESCRIBED')),
    buyer_claim           TEXT NOT NULL,
    ai_model_version      VARCHAR(50),
    ai_confidence_score   NUMERIC(4,3) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
    ai_recommended_action VARCHAR(50) CHECK (ai_recommended_action IN ('REFUND_BUYER','RELEASE_VENDOR','ESCALATE_HUMAN')),
    ai_reasoning_payload  JSONB,
    status                VARCHAR(30) NOT NULL DEFAULT 'AI_PROCESSING'
                          CHECK (status IN ('AI_PROCESSING','UNDER_HUMAN_REVIEW','RESOLVED_AUTO','FRAUD_LOCKOUT')),
    final_resolution      VARCHAR(50) CHECK (final_resolution IN ('REFUND_BUYER','RELEASE_VENDOR')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at           TIMESTAMPTZ
);
```

## 4. New Subsystem Tables

### 4.1 `custody_accounts` — the pooled float per currency/phase
```sql
CREATE TABLE custody_accounts (
    custody_account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider           VARCHAR(50) NOT NULL,             -- e.g. 'PAYSTACK_SANDBOX','PAYSTACK_LIVE','PARTNER_BANK_X'
    custody_phase      VARCHAR(4) NOT NULL CHECK (custody_phase IN ('P0','P1','P2','P3')),
    currency           VARCHAR(3) NOT NULL CHECK (currency IN ('GHS','NGN','KES')),
    external_ref       VARCHAR(128),                     -- partner/aggregator account identifier
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, currency)
);
```

### 4.2 `payouts` — disbursements (release + refund)
```sql
CREATE TABLE payouts (
    payout_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id  UUID NOT NULL REFERENCES escrow_transactions(transaction_id) ON DELETE RESTRICT,
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('RELEASE','REFUND')),
    recipient_msisdn VARCHAR(20) NOT NULL,
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) NOT NULL CHECK (currency IN ('GHS','NGN','KES')),
    provider_ref    VARCHAR(128),
    status          VARCHAR(20) NOT NULL DEFAULT 'INITIATED'
                    CHECK (status IN ('INITIATED','SUCCESS','FAILED','RETRYING')),
    failure_reason  TEXT,
    attempts        SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- One successful disbursement per direction per transaction:
CREATE UNIQUE INDEX idx_single_success_payout
  ON payouts(transaction_id, direction) WHERE status = 'SUCCESS';
```

### 4.3 `kyc_records`
```sql
CREATE TABLE kyc_records (
    kyc_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    tier          SMALLINT NOT NULL CHECK (tier IN (0,1,2)),
    id_type       VARCHAR(30),                            -- e.g. 'GHANA_CARD','PASSPORT'
    id_number_hash CHAR(64),                              -- store a hash, not the raw ID
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    reviewed_by   UUID REFERENCES users(user_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at   TIMESTAMPTZ
);
```

### 4.4 `auth_sessions` & `otp_challenges`
```sql
CREATE TABLE otp_challenges (
    challenge_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number  VARCHAR(20) NOT NULL,
    code_hash     CHAR(64) NOT NULL,                      -- hash of the OTP, never plaintext
    expires_at    TIMESTAMPTZ NOT NULL,
    consumed_at   TIMESTAMPTZ,
    attempts      SMALLINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_sessions (
    session_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_id     VARCHAR(100),
    refresh_token_hash CHAR(64) NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    revoked_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 4.5 `idempotency_keys` & `webhook_inbox` (durable replay defense)
```sql
CREATE TABLE idempotency_keys (
    idempotency_key UUID PRIMARY KEY,                     -- client-supplied UUIDv4
    user_id         UUID REFERENCES users(user_id),
    method          VARCHAR(10) NOT NULL,
    path            VARCHAR(255) NOT NULL,
    response_status SMALLINT,
    response_body   JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMPTZ NOT NULL                  -- 24h TTL; purged by job
);

CREATE TABLE webhook_inbox (
    webhook_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider        VARCHAR(50) NOT NULL,
    provider_ref    VARCHAR(128) NOT NULL,                -- aggregator's event id
    signature_valid BOOLEAN NOT NULL,
    payload         JSONB NOT NULL,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_ref)                       -- durable dedup across restarts
);
```

### 4.6 `notifications`
```sql
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    transaction_id  UUID REFERENCES escrow_transactions(transaction_id) ON DELETE SET NULL,
    channel         VARCHAR(10) NOT NULL CHECK (channel IN ('PUSH','SMS')),
    template_key    VARCHAR(64) NOT NULL,                 -- see 27-Notifications.md matrix
    status          VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','FAILED')),
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## 5. Sub-Ledger Balance Derivation

Each transaction's escrow balance is **derived**, not stored (single source of truth = the ledger):

```sql
-- Held balance for one transaction:
SELECT COALESCE(SUM(amount_delta), 0) AS held_balance
FROM transaction_ledger
WHERE transaction_id = $1;
```
`FUNDS_DEPOSITED` writes `+amount`; `FUNDS_RELEASED`/`REFUND_ISSUED` write `−amount`. Invariant (checked in [`42`](42-Observability-and-Reconciliation.md)): `SUM(held_balance across all transactions) == custody pooled balance`.

## 6. Indexes

```sql
CREATE INDEX idx_evidence_sha256 ON evidence_artifacts(sha256_hash);                       -- recycled-photo trap
CREATE INDEX idx_ledger_transaction_time ON transaction_ledger(transaction_id, created_at); -- temporal reconstruction
CREATE INDEX idx_ledger_forensics ON transaction_ledger(ip_address, device_id);            -- Sybil velocity
CREATE INDEX idx_disputes_ai_payload ON dispute_cases USING GIN (ai_reasoning_payload);    -- JSONB analytics
-- The double-spend backstop:
CREATE UNIQUE INDEX idx_single_deposit_per_transaction
  ON transaction_ledger(transaction_id) WHERE event_type = 'FUNDS_DEPOSITED';
CREATE INDEX idx_webhook_unprocessed ON webhook_inbox(processed_at) WHERE processed_at IS NULL;
```

## 7. Triggers & Permissions

```sql
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_escrow_updated BEFORE UPDATE ON escrow_transactions
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- Append-only enforcement: application role cannot mutate history.
REVOKE UPDATE, DELETE ON TABLE transaction_ledger FROM app_user;
```

## 8. Migrations

- Managed with a migration tool (pinned in [`41-Infra-and-Deployment.md`](41-Infra-and-Deployment.md); recommended: `node-pg-migrate` or Prisma Migrate).
- One migration per logical change; never edit a shipped migration. Seed `custody_accounts` (P0 sandbox row) in a seed script, not a migration.
- The `REVOKE` and any role setup run in a dedicated migration after `app_user` exists.
