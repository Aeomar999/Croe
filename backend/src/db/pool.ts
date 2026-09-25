import { Pool, type PoolClient } from "pg";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export type { PoolClient };

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle client");
});

/**
 * Get a dedicated client for transactions (DB-01).
 * Caller MUST use client.query() for BEGIN...COMMIT/ROLLBACK
 * and release in a finally block (DB-03).
 */
export async function getTransactionClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

/**
 * Verify database connectivity.
 */
export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("Database connection verified");
  } finally {
    client.release();
  }
}

/**
 * Graceful shutdown - drain the pool.
 */
export async function closeDatabasePool(): Promise<void> {
  logger.info("Closing database pool...");
  await pool.end();
  logger.info("Database pool closed");
}
