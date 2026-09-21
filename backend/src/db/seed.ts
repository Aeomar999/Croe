import { pool } from "./pool.js";
import { logger } from "../config/logger.js";

/**
 * Seed P0 sandbox custody account and test users.
 * Run via: pnpm db:seed
 */
async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Seed test users for P0 (placeholders until auth)
    const testUsers = [
      { id: "00000000-0000-0000-0000-000000000000", phone: "+233000000000" }, // vendor
      { id: "00000000-0000-0000-0000-000000000001", phone: "+233000000001" }, // buyer
    ];
    for (const u of testUsers) {
      await client.query(
        `INSERT INTO users (user_id, phone_number, kyc_tier, trust_score, is_frozen)
         VALUES ($1, $2, 2, 100.00, false)
         ON CONFLICT (user_id) DO NOTHING`,
        [u.id, u.phone],
      );
    }

    // Seed P0 sandbox custody account
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM custody_accounts WHERE provider = 'SANDBOX' AND custody_phase = 'P0'`,
    );

    if (rows[0]!.count === 0) {
      await client.query(
        `INSERT INTO custody_accounts (provider, custody_phase, currency, external_ref, is_active)
         VALUES ('SANDBOX', 'P0', 'GHS', 'sandbox-ghs-001', true)`,
      );
      logger.info("Seeded P0 sandbox custody account");
    } else {
      logger.info("P0 sandbox custody account already exists, skipping");
    }

    await client.query("COMMIT");
    logger.info("Seed completed");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Failed to seed");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
