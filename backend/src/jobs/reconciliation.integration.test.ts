import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { pool } from "../db/pool.js";
import { runReconciliation } from "./reconciliation.js";

/**
 * Runs the reconciliation job against a real PostgreSQL database, so SQL
 * result formats (e.g. an empty SUM) are exercised rather than mocked.
 */
beforeAll(async () => {
  await pool.query("SELECT 1");
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM evidence_artifacts");
    await client.query("DELETE FROM dispute_cases");
    await client.query("DELETE FROM transaction_ledger");
    await client.query("DELETE FROM payouts");
    await client.query("DELETE FROM escrow_transactions");
    await client.query(
      `INSERT INTO custody_accounts (provider, custody_phase, currency, external_ref, is_active)
       SELECT 'SANDBOX', 'P0', 'GHS', 'sandbox-ghs-recon-test', true
       WHERE NOT EXISTS (SELECT 1 FROM custody_accounts WHERE currency = 'GHS' AND is_active = true)`,
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

describe("runReconciliation (real database)", () => {
  it("reconciles an active currency with an empty ledger without a MoneyFormatError", async () => {
    const result = await runReconciliation();
    const ghs = result.perCurrency.find((c) => c.currency === "GHS");
    expect(ghs).toBeDefined();
    expect(ghs?.ledger.totalDeposited).toBe("0.00");
    expect(ghs?.ledger.unsweptRevenue).toBe("0.00");
    expect(ghs?.matched).toBe(true);
  });
});
