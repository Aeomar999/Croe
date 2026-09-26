import type { MigrationBuilder } from "node-pg-migrate";

/**
 * Retry and dead-letter bookkeeping for webhook_inbox (task.md T6.2, T6.7).
 *
 * The sweeper re-runs rows with processed_at IS NULL once next_attempt_at has
 * passed, with exponential backoff. After the maximum number of attempts a
 * row is dead-lettered (dead_lettered_at set) and ops are alerted; it is
 * never retried automatically again.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "webhook_inbox" ADD COLUMN "attempts" SMALLINT NOT NULL DEFAULT 0`);
  pgm.sql(`ALTER TABLE "webhook_inbox" ADD COLUMN "last_error" TEXT`);
  pgm.sql(`ALTER TABLE "webhook_inbox" ADD COLUMN "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  pgm.sql(`ALTER TABLE "webhook_inbox" ADD COLUMN "dead_lettered_at" TIMESTAMPTZ`);
  pgm.sql(
    `CREATE INDEX "idx_webhook_inbox_due" ON "webhook_inbox" ("next_attempt_at")
     WHERE processed_at IS NULL AND dead_lettered_at IS NULL`,
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS "idx_webhook_inbox_due"`);
  pgm.sql(`ALTER TABLE "webhook_inbox" DROP COLUMN "dead_lettered_at"`);
  pgm.sql(`ALTER TABLE "webhook_inbox" DROP COLUMN "next_attempt_at"`);
  pgm.sql(`ALTER TABLE "webhook_inbox" DROP COLUMN "last_error"`);
  pgm.sql(`ALTER TABLE "webhook_inbox" DROP COLUMN "attempts"`);
}
