import { pool } from "./pool.js";
import { logger } from "../config/logger.js";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

/**
 * Seed P0 sandbox custody account and test users.
 * Run via: pnpm db:seed
 */
async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Add password_hash column if not exists (safe to run multiple times)
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `);

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

    // Seed admin user
    const adminEmail = "amoahjerry@croe.app";
    const adminPassword = "Password@123";
    const adminPasswordHash = hashPassword(adminPassword);
    const adminId = "00000000-0000-0000-0000-000000000099";

    await client.query(
      `INSERT INTO users (user_id, email, phone_number, password_hash, role, kyc_tier, trust_score, is_frozen, full_name)
       VALUES ($1, $2, $3, $4, 'admin', 2, 100.00, false, 'Jerry Amoah')
       ON CONFLICT (user_id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role`,
      [adminId, adminEmail, "+233000000099", adminPasswordHash],
    );

    logger.info("Seeded admin user: amoahjerry@croe.app");

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