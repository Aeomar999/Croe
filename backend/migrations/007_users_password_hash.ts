import type { MigrationBuilder } from "node-pg-migrate";

/**
 * Staff (reviewer/ops/admin) password hashes for POST /v1/auth/login.
 *
 * Previously only the dev seed script added this column, so a production
 * database built from migrations alone could not log any staff member in
 * (task.md T7.3). IF NOT EXISTS keeps this safe on databases the old seed
 * already altered.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255)`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash"`);
}
