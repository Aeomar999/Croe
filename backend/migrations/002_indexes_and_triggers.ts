import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── Indexes ──
  pgm.createIndex("evidence_artifacts", "sha256_hash", {
    name: "idx_evidence_sha256",
    ifNotExists: true,
  });

  pgm.createIndex(
    "transaction_ledger",
    ["transaction_id", "created_at"],
    {
      name: "idx_ledger_transaction_time",
      ifNotExists: true,
    },
  );

  pgm.createIndex(
    "transaction_ledger",
    ["ip_address", "device_id"],
    {
      name: "idx_ledger_forensics",
      ifNotExists: true,
    },
  );

  pgm.createIndex("dispute_cases", "ai_reasoning_payload", {
    name: "idx_disputes_ai_payload",
    using: "GIN",
    ifNotExists: true,
  });

  // The double-spend backstop (partial unique index):
  pgm.createIndex(
    "transaction_ledger",
    ["transaction_id"],
    {
      name: "idx_single_deposit_per_transaction",
      unique: true,
      where: "event_type = 'FUNDS_DEPOSITED'",
      ifNotExists: true,
    },
  );

  pgm.createIndex("webhook_inbox", "processed_at", {
    name: "idx_webhook_unprocessed",
    where: "processed_at IS NULL",
    ifNotExists: true,
  });

  // ── Updated_at triggers ──
  pgm.createFunction(
    "update_timestamp_column",
    [],
    {
      returns: "TRIGGER",
      language: "plpgsql",
    },
    `BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;`,
    { ifNotExists: true },
  );

  pgm.createTrigger("escrow_transactions", "trg_escrow_updated", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_timestamp_column",
    level: "ROW",
    ifNotExists: true,
  });

  pgm.createTrigger("users", "trg_users_updated", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_timestamp_column",
    level: "ROW",
    ifNotExists: true,
  });

  pgm.createTrigger("payouts", "trg_payouts_updated", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_timestamp_column",
    level: "ROW",
    ifNotExists: true,
  });

  // ── Append-only enforcement (AUD-01) ──
  // Note: This assumes 'app_user' role exists. In dev/sandbox this
  // is a no-op if the role doesn't exist. For production, run after
  // the app_user role is created.
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        REVOKE UPDATE, DELETE ON TABLE transaction_ledger FROM app_user;
      END IF;
    END
    $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTrigger("payouts", "trg_payouts_updated", { ifExists: true });
  pgm.dropTrigger("users", "trg_users_updated", { ifExists: true });
  pgm.dropTrigger("escrow_transactions", "trg_escrow_updated", {
    ifExists: true,
  });
  pgm.dropFunction("update_timestamp_column", { ifExists: true });

  pgm.dropIndex("webhook_inbox", "idx_webhook_unprocessed", { ifExists: true });
  pgm.dropIndex(
    "transaction_ledger",
    "idx_single_deposit_per_transaction",
    { ifExists: true },
  );
  pgm.dropIndex("dispute_cases", "idx_disputes_ai_payload", {
    ifExists: true,
  });
  pgm.dropIndex("transaction_ledger", "idx_ledger_forensics", {
    ifExists: true,
  });
  pgm.dropIndex("transaction_ledger", "idx_ledger_transaction_time", {
    ifExists: true,
  });
  pgm.dropIndex("evidence_artifacts", "idx_evidence_sha256", {
    ifExists: true,
  });
}
