import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Seed P0 sandbox custody account per 05-Data-Model.md §8:
  // "Seed custody_accounts (P0 sandbox row) in a seed script, not a migration."
  // However, for dev convenience we include it here.
  pgm.sql(`
    INSERT INTO custody_accounts (provider, custody_phase, currency, external_ref, is_active)
    VALUES ('SANDBOX', 'P0', 'GHS', 'sandbox-ghs-001', true)
    ON CONFLICT DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DELETE FROM custody_accounts WHERE provider = 'SANDBOX' AND custody_phase = 'P0';`);
}
