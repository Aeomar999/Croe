import { pool } from "./pool.js";
import { logger } from "../config/logger.js";

/**
 * Seed P0 sandbox custody account.
 * Run via: pnpm db:seed
 */
async function seed(): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM custody_accounts WHERE provider = 'SANDBOX' AND custody_phase = 'P0'`,
    );

    if (rows[0]!.count > 0) {
      logger.info("P0 sandbox custody account already exists, skipping");
      return;
    }

    await pool.query(
      `INSERT INTO custody_accounts (provider, custody_phase, currency, external_ref, is_active)
       VALUES ('SANDBOX', 'P0', 'GHS', 'sandbox-ghs-001', true)`,
    );
    logger.info("Seeded P0 sandbox custody account");
  } catch (err) {
    logger.error({ err }, "Failed to seed");
    throw err;
  } finally {
    await pool.end();
  }
}

seed();
