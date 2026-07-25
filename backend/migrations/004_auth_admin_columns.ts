import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "users" ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'consumer'`);
  pgm.sql(`ALTER TABLE "users" ADD CONSTRAINT "chk_users_role" CHECK (role IN ('consumer','reviewer','ops','admin'))`);
  pgm.sql(`ALTER TABLE "users" ADD COLUMN "push_token" VARCHAR(255)`);
  pgm.sql(`ALTER TABLE "notifications" ADD COLUMN "variables" JSONB`);
  pgm.sql(`ALTER TABLE "notifications" ADD COLUMN "retry_count" SMALLINT NOT NULL DEFAULT 0`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "notifications" DROP COLUMN "retry_count"`);
  pgm.sql(`ALTER TABLE "notifications" DROP COLUMN "variables"`);
  pgm.sql(`ALTER TABLE "users" DROP COLUMN "push_token"`);
  pgm.sql(`ALTER TABLE "users" DROP CONSTRAINT "chk_users_role"`);
  pgm.sql(`ALTER TABLE "users" DROP COLUMN "role"`);
}
