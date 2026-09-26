import { pool } from "./pool.js";
import { logger } from "../config/logger.js";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

const MIN_ADMIN_PASSWORD_LENGTH = 12;

/**
 * Seed P0 sandbox custody account and test users. Development/test only.
 * Run via: pnpm db:seed
 *
 * The admin account is seeded only when SEED_ADMIN_EMAIL and
 * SEED_ADMIN_PASSWORD are set (SEC-01: no credentials in code). Production
 * staff accounts are provisioned separately (task.md T7.4).
 */
async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    logger.error("Refusing to seed: NODE_ENV=production. Seed data is for development and test only.");
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminPassword && adminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    logger.error(`SEED_ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`);
    process.exitCode = 1;
    await pool.end();
    return;
  }

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

    // Seed admin user (only when credentials are supplied via env)
    if (adminEmail && adminPassword) {
      const adminPasswordHash = hashPassword(adminPassword);
      const adminId = "00000000-0000-0000-0000-000000000099";
      const adminName = process.env.SEED_ADMIN_NAME || "Croe Admin";

      await client.query(
        `INSERT INTO users (user_id, email, phone_number, password_hash, role, kyc_tier, trust_score, is_frozen, full_name)
         VALUES ($1, $2, $3, $4, 'admin', 2, 100.00, false, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           full_name = EXCLUDED.full_name`,
        [adminId, adminEmail, "+233000000099", adminPasswordHash, adminName],
      );
      logger.info("Seeded admin user from SEED_ADMIN_EMAIL");
    } else {
      logger.info("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set, skipping admin user");
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