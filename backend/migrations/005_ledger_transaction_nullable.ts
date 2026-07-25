import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "transaction_ledger" ALTER COLUMN "transaction_id" DROP NOT NULL`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`UPDATE "transaction_ledger" SET "transaction_id" = (SELECT "transaction_id" FROM "escrow_transactions" LIMIT 1) WHERE "transaction_id" IS NULL`);
  pgm.sql(`ALTER TABLE "transaction_ledger" ALTER COLUMN "transaction_id" SET NOT NULL`);
}
