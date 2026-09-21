import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // gen_random_uuid() is built into PostgreSQL 13+, no extension needed

  // ── 3.1 users ──
  pgm.createTable(
    "users",
    {
      user_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      phone_number: { type: "VARCHAR(20)", unique: true, notNull: true },
      full_name: { type: "VARCHAR(100)" },
      email: { type: "VARCHAR(255)", unique: true },
      kyc_tier: {
        type: "SMALLINT",
        notNull: true,
        default: 0,
      },
      trust_score: {
        type: "NUMERIC(5,2)",
        notNull: true,
        default: 100.0,
      },
      is_frozen: { type: "BOOLEAN", notNull: true, default: false },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "users",
    "chk_users_kyc_tier",
    "CHECK (kyc_tier IN (0,1,2))",
  );
  pgm.addConstraint(
    "users",
    "chk_users_trust_score",
    "CHECK (trust_score >= 0 AND trust_score <= 100)",
  );

  // ── 3.2 escrow_transactions ──
  pgm.createTable(
    "escrow_transactions",
    {
      transaction_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      vendor_id: {
        type: "UUID",
        notNull: true,
        references: "users(user_id)",
        onDelete: "RESTRICT",
      },
      buyer_id: {
        type: "UUID",
        references: "users(user_id)",
        onDelete: "RESTRICT",
      },
      amount: { type: "NUMERIC(15,2)", notNull: true },
      currency: { type: "VARCHAR(3)", notNull: true, default: "GHS" },
      commission: {
        type: "NUMERIC(15,2)",
        notNull: true,
        default: 0,
      },
      item_description: { type: "TEXT", notNull: true },
      current_status: {
        type: "VARCHAR(30)",
        notNull: true,
        default: "LINK_CREATED",
      },
      deposit_expires_at: { type: "TIMESTAMPTZ" },
      dispute_closes_at: { type: "TIMESTAMPTZ" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "escrow_transactions",
    "chk_escrow_amount_positive",
    "CHECK (amount > 0)",
  );
  pgm.addConstraint(
    "escrow_transactions",
    "chk_escrow_currency",
    "CHECK (currency IN ('GHS','NGN','KES'))",
  );
  pgm.addConstraint(
    "escrow_transactions",
    "chk_escrow_commission_non_negative",
    "CHECK (commission >= 0)",
  );
  pgm.addConstraint(
    "escrow_transactions",
    "chk_escrow_current_status",
    `CHECK (current_status IN (
      'LINK_CREATED','AWAITING_DEPOSIT','FUNDS_SECURED','SHIPPED',
      'DELIVERED_CONFIRMED','FUNDS_RELEASED','DISPUTE_OPENED','AI_PROCESSING',
      'UNDER_HUMAN_REVIEW','RESOLVED_AUTO','FUNDS_REFUNDED','FRAUD_LOCKOUT',
      'EXPIRED','CANCELLED'
    ))`,
  );

  // ── 3.3 transaction_ledger (append-only) ──
  pgm.createTable(
    "transaction_ledger",
    {
      ledger_id: { type: "BIGSERIAL", primaryKey: true },
      transaction_id: {
        type: "UUID",
        notNull: true,
        references: "escrow_transactions(transaction_id)",
        onDelete: "RESTRICT",
      },
      actor_id: {
        type: "UUID",
        references: "users(user_id)",
        onDelete: "SET NULL",
      },
      event_type: { type: "VARCHAR(50)", notNull: true },
      previous_status: { type: "VARCHAR(30)" },
      new_status: { type: "VARCHAR(30)", notNull: true },
      amount_delta: { type: "NUMERIC(15,2)" },
      currency: { type: "VARCHAR(3)" },
      ip_address: { type: "INET" },
      device_id: { type: "VARCHAR(100)" },
      network_type: { type: "VARCHAR(20)" },
      device_metadata: { type: "JSONB" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "transaction_ledger",
    "chk_ledger_event_type",
    `CHECK (event_type IN (
      'LINK_CREATED','BUYER_CLAIMED','FUNDS_DEPOSITED','SHIPPED','DELIVERY_CONFIRMED',
      'FUNDS_RELEASED','DISPUTE_OPENED','EVIDENCE_ADDED','FRAUD_FLAGGED','REFUND_ISSUED',
      'PAYOUT_INITIATED','PAYOUT_FAILED'
    ))`,
  );
  pgm.addConstraint(
    "transaction_ledger",
    "chk_ledger_currency",
    "CHECK (currency IN ('GHS','NGN','KES'))",
  );

  // ── 3.4 evidence_artifacts ──
  pgm.createTable(
    "evidence_artifacts",
    {
      artifact_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      transaction_id: {
        type: "UUID",
        notNull: true,
        references: "escrow_transactions(transaction_id)",
        onDelete: "RESTRICT",
      },
      uploader_id: {
        type: "UUID",
        notNull: true,
        references: "users(user_id)",
        onDelete: "RESTRICT",
      },
      file_url: { type: "VARCHAR(512)", notNull: true },
      sha256_hash: { type: "CHAR(64)", notNull: true },
      artifact_type: { type: "VARCHAR(50)", notNull: true },
      ip_address: { type: "INET", notNull: true },
      device_id: { type: "VARCHAR(100)", notNull: true },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  // ── 3.5 dispute_cases ──
  pgm.createTable(
    "dispute_cases",
    {
      dispute_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      transaction_id: {
        type: "UUID",
        unique: true,
        notNull: true,
        references: "escrow_transactions(transaction_id)",
        onDelete: "RESTRICT",
      },
      initiated_by: {
        type: "UUID",
        notNull: true,
        references: "users(user_id)",
        onDelete: "RESTRICT",
      },
      reason_code: { type: "VARCHAR(50)", notNull: true },
      buyer_claim: { type: "TEXT", notNull: true },
      ai_model_version: { type: "VARCHAR(50)" },
      ai_confidence_score: { type: "NUMERIC(4,3)" },
      ai_recommended_action: { type: "VARCHAR(50)" },
      ai_reasoning_payload: { type: "JSONB" },
      status: {
        type: "VARCHAR(30)",
        notNull: true,
        default: "AI_PROCESSING",
      },
      final_resolution: { type: "VARCHAR(50)" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
      resolved_at: { type: "TIMESTAMPTZ" },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "dispute_cases",
    "chk_dispute_reason_code",
    "CHECK (reason_code IN ('ITEM_NOT_RECEIVED','ITEM_DAMAGED','WRONG_ITEM','ITEM_NOT_AS_DESCRIBED'))",
  );
  pgm.addConstraint(
    "dispute_cases",
    "chk_dispute_ai_confidence",
    "CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1)",
  );
  pgm.addConstraint(
    "dispute_cases",
    "chk_dispute_ai_action",
    "CHECK (ai_recommended_action IN ('REFUND_BUYER','RELEASE_VENDOR','ESCALATE_HUMAN'))",
  );
  pgm.addConstraint(
    "dispute_cases",
    "chk_dispute_status",
    "CHECK (status IN ('AI_PROCESSING','UNDER_HUMAN_REVIEW','RESOLVED_AUTO','FRAUD_LOCKOUT'))",
  );
  pgm.addConstraint(
    "dispute_cases",
    "chk_dispute_final_resolution",
    "CHECK (final_resolution IN ('REFUND_BUYER','RELEASE_VENDOR'))",
  );

  // ── 4.1 custody_accounts ──
  pgm.createTable(
    "custody_accounts",
    {
      custody_account_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      provider: { type: "VARCHAR(50)", notNull: true },
      custody_phase: { type: "VARCHAR(4)", notNull: true },
      currency: { type: "VARCHAR(3)", notNull: true },
      external_ref: { type: "VARCHAR(128)" },
      is_active: { type: "BOOLEAN", notNull: true, default: true },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "custody_accounts",
    "chk_custody_phase",
    "CHECK (custody_phase IN ('P0','P1','P2','P3'))",
  );
  pgm.addConstraint(
    "custody_accounts",
    "chk_custody_currency",
    "CHECK (currency IN ('GHS','NGN','KES'))",
  );
  pgm.addConstraint(
    "custody_accounts",
    "uq_custody_provider_currency",
    "UNIQUE (provider, currency)",
  );

  // ── 4.2 payouts ──
  pgm.createTable(
    "payouts",
    {
      payout_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      transaction_id: {
        type: "UUID",
        notNull: true,
        references: "escrow_transactions(transaction_id)",
        onDelete: "RESTRICT",
      },
      direction: { type: "VARCHAR(10)", notNull: true },
      recipient_msisdn: { type: "VARCHAR(20)", notNull: true },
      amount: { type: "NUMERIC(15,2)", notNull: true },
      currency: { type: "VARCHAR(3)", notNull: true },
      provider_ref: { type: "VARCHAR(128)" },
      status: { type: "VARCHAR(20)", notNull: true, default: "INITIATED" },
      failure_reason: { type: "TEXT" },
      attempts: { type: "SMALLINT", notNull: true, default: 0 },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "payouts",
    "chk_payout_direction",
    "CHECK (direction IN ('RELEASE','REFUND'))",
  );
  pgm.addConstraint(
    "payouts",
    "chk_payout_amount_positive",
    "CHECK (amount > 0)",
  );
  pgm.addConstraint(
    "payouts",
    "chk_payout_currency",
    "CHECK (currency IN ('GHS','NGN','KES'))",
  );
  pgm.addConstraint(
    "payouts",
    "chk_payout_status",
    "CHECK (status IN ('INITIATED','SUCCESS','FAILED','RETRYING'))",
  );

  // ── 4.3 kyc_records ──
  pgm.createTable(
    "kyc_records",
    {
      kyc_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      user_id: {
        type: "UUID",
        notNull: true,
        references: "users(user_id)",
        onDelete: "RESTRICT",
      },
      tier: { type: "SMALLINT", notNull: true },
      id_type: { type: "VARCHAR(30)" },
      id_number_hash: { type: "CHAR(64)" },
      status: { type: "VARCHAR(20)", notNull: true, default: "PENDING" },
      reviewed_by: { type: "UUID", references: "users(user_id)" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
      reviewed_at: { type: "TIMESTAMPTZ" },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "kyc_records",
    "chk_kyc_tier",
    "CHECK (tier IN (0,1,2))",
  );
  pgm.addConstraint(
    "kyc_records",
    "chk_kyc_status",
    "CHECK (status IN ('PENDING','APPROVED','REJECTED'))",
  );

  // ── 4.4 otp_challenges ──
  pgm.createTable(
    "otp_challenges",
    {
      challenge_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      phone_number: { type: "VARCHAR(20)", notNull: true },
      code_hash: { type: "CHAR(64)", notNull: true },
      expires_at: { type: "TIMESTAMPTZ", notNull: true },
      consumed_at: { type: "TIMESTAMPTZ" },
      attempts: { type: "SMALLINT", notNull: true, default: 0 },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  // ── 4.4 auth_sessions ──
  pgm.createTable(
    "auth_sessions",
    {
      session_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      user_id: {
        type: "UUID",
        notNull: true,
        references: "users(user_id)",
        onDelete: "CASCADE",
      },
      device_id: { type: "VARCHAR(100)" },
      refresh_token_hash: { type: "CHAR(64)", notNull: true },
      expires_at: { type: "TIMESTAMPTZ", notNull: true },
      revoked_at: { type: "TIMESTAMPTZ" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  // ── 4.5 idempotency_keys ──
  pgm.createTable(
    "idempotency_keys",
    {
      idempotency_key: { type: "UUID", primaryKey: true },
      user_id: { type: "UUID", references: "users(user_id)" },
      method: { type: "VARCHAR(10)", notNull: true },
      path: { type: "VARCHAR(255)", notNull: true },
      response_status: { type: "SMALLINT" },
      response_body: { type: "JSONB" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
      expires_at: { type: "TIMESTAMPTZ", notNull: true },
    },
    { ifNotExists: true },
  );

  // ── 4.5 webhook_inbox ──
  pgm.createTable(
    "webhook_inbox",
    {
      webhook_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      provider: { type: "VARCHAR(50)", notNull: true },
      provider_ref: { type: "VARCHAR(128)", notNull: true },
      signature_valid: { type: "BOOLEAN", notNull: true },
      payload: { type: "JSONB", notNull: true },
      processed_at: { type: "TIMESTAMPTZ" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "webhook_inbox",
    "uq_webhook_provider_ref",
    "UNIQUE (provider, provider_ref)",
  );

  // ── 4.6 notifications ──
  pgm.createTable(
    "notifications",
    {
      notification_id: {
        type: "UUID",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      user_id: {
        type: "UUID",
        notNull: true,
        references: "users(user_id)",
        onDelete: "CASCADE",
      },
      transaction_id: {
        type: "UUID",
        references: "escrow_transactions(transaction_id)",
        onDelete: "SET NULL",
      },
      channel: { type: "VARCHAR(10)", notNull: true },
      template_key: { type: "VARCHAR(64)", notNull: true },
      status: { type: "VARCHAR(20)", notNull: true, default: "QUEUED" },
      sent_at: { type: "TIMESTAMPTZ" },
      created_at: {
        type: "TIMESTAMPTZ",
        notNull: true,
        default: pgm.func("CURRENT_TIMESTAMP"),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint(
    "notifications",
    "chk_notification_channel",
    "CHECK (channel IN ('PUSH','SMS'))",
  );
  pgm.addConstraint(
    "notifications",
    "chk_notification_status",
    "CHECK (status IN ('QUEUED','SENT','FAILED'))",
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("notifications", { ifExists: true });
  pgm.dropTable("webhook_inbox", { ifExists: true });
  pgm.dropTable("idempotency_keys", { ifExists: true });
  pgm.dropTable("auth_sessions", { ifExists: true });
  pgm.dropTable("otp_challenges", { ifExists: true });
  pgm.dropTable("kyc_records", { ifExists: true });
  pgm.dropTable("payouts", { ifExists: true });
  pgm.dropTable("custody_accounts", { ifExists: true });
  pgm.dropTable("dispute_cases", { ifExists: true });
  pgm.dropTable("evidence_artifacts", { ifExists: true });
  pgm.dropTable("transaction_ledger", { ifExists: true });
  pgm.dropTable("escrow_transactions", { ifExists: true });
  pgm.dropTable("users", { ifExists: true });
}
