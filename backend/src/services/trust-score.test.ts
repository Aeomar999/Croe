import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import {
  adjustTrustScore,
  freezeUser,
  unfreezeUser,
  adjustSuccessfulTransaction,
  isUserFrozen,
} from "./trust-score.js";
import { pool, closeDatabasePool, getTransactionClient } from "../db/pool.js";
import { closeRedis } from "../config/redis.js";

const TEST_PHONE_PREFIX = "+23324999";

let testUserIds: string[] = [];

async function createTestUser(phone?: string): Promise<string> {
  const userId = randomUUID();
  const phoneNumber = phone ?? `${TEST_PHONE_PREFIX}${String(testUserIds.length).padStart(4, "0")}`;
  await pool.query(
    `INSERT INTO users (user_id, phone_number, full_name, trust_score, is_frozen)
     VALUES ($1, $2, 'Test User', 100, false)`,
    [userId, phoneNumber],
  );
  testUserIds.push(userId);
  return userId;
}

async function cleanTestData(): Promise<void> {
  if (testUserIds.length === 0) return;
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM transaction_ledger WHERE actor_id = ANY($1::uuid[])`,
      [testUserIds],
    );
    await client.query(
      `DELETE FROM escrow_transactions WHERE vendor_id = ANY($1::uuid[])`,
      [testUserIds],
    );
    await client.query(
      `DELETE FROM users WHERE user_id = ANY($1::uuid[])`,
      [testUserIds],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  testUserIds = [];
}

beforeAll(async () => {
  await pool.query("SELECT 1");
});

afterAll(async () => {
  await cleanTestData();
  await closeRedis();
  await closeDatabasePool();
});

beforeEach(async () => {
  await cleanTestData();
});

describe("adjustTrustScore", () => {
  it("adjusts trust score by positive delta (clamped at 100)", async () => {
    const userId = await createTestUser();
    const result = await adjustTrustScore(userId, +5, "bonus");
    expect(result.newScore).toBe(100);
  });

  it("adjusts trust score by negative delta", async () => {
    const userId = await createTestUser();
    const result = await adjustTrustScore(userId, -30, "penalty");
    expect(result.newScore).toBe(70);
  });

  it("clamps to 0 minimum", async () => {
    const userId = await createTestUser();
    const result = await adjustTrustScore(userId, -150, "heavy penalty");
    expect(result.newScore).toBe(0);
  });

  it("clamps to 100 maximum", async () => {
    const userId = await createTestUser();
    const result = await adjustTrustScore(userId, +200, "mega bonus");
    expect(result.newScore).toBe(100);
  });

  it("auto-freezes user when score drops below 20", async () => {
    const userId = await createTestUser();
    await pool.query("UPDATE users SET trust_score = 25 WHERE user_id = $1", [userId]);

    const result = await adjustTrustScore(userId, -10, "big penalty");

    expect(result.newScore).toBe(15);
    expect(result.frozen).toBe(true);

    const { rows } = await pool.query("SELECT is_frozen FROM users WHERE user_id = $1", [userId]);
    expect(rows[0].is_frozen).toBe(true);
  });

  it("writes a FRAUD_FLAGGED ledger entry with the reason", async () => {
    const userId = await createTestUser();
    await adjustTrustScore(userId, -40, "suspicious_activity");

    const { rows } = await pool.query(
      "SELECT event_type, device_metadata FROM transaction_ledger WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId],
    );
    expect(rows[0].event_type).toBe("FRAUD_FLAGGED");
    expect(JSON.stringify(rows[0].device_metadata)).toContain("suspicious_activity");
  });

  it("is idempotent on concurrent adjustments", async () => {
    const userId = await createTestUser();
    const deltas = [-20, -15];

    const results = await Promise.all(
      deltas.map((d) => adjustTrustScore(userId, d, `concurrent-${d}`)),
    );

    const finalScore = results[results.length - 1].newScore;
    expect(finalScore).toBeGreaterThanOrEqual(0);
    expect(finalScore).toBeLessThanOrEqual(100);

    const { rows } = await pool.query("SELECT trust_score FROM users WHERE user_id = $1", [userId]);
    expect(Number(rows[0].trust_score)).toBe(finalScore);
  });
});

describe("freezeUser", () => {
  it("sets is_frozen = true", async () => {
    const userId = await createTestUser();
    await freezeUser(userId, "manual review");

    const { rows } = await pool.query("SELECT is_frozen FROM users WHERE user_id = $1", [userId]);
    expect(rows[0].is_frozen).toBe(true);
  });

  it("writes a FRAUD_FLAGGED ledger entry", async () => {
    const userId = await createTestUser();
    await freezeUser(userId, "fraud suspected");

    const { rows } = await pool.query(
      "SELECT event_type, device_metadata FROM transaction_ledger WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId],
    );
    expect(rows[0].event_type).toBe("FRAUD_FLAGGED");
    expect(JSON.stringify(rows[0].device_metadata)).toContain("fraud suspected");
  });
});

describe("unfreezeUser", () => {
  it("sets is_frozen = false", async () => {
    const userId = await createTestUser();
    await freezeUser(userId, "test freeze");
    await unfreezeUser(userId, "review cleared", "reviewer-001");

    const { rows } = await pool.query("SELECT is_frozen FROM users WHERE user_id = $1", [userId]);
    expect(rows[0].is_frozen).toBe(false);
  });

  it("restores trust score to 50 minimum if below 50", async () => {
    const userId = await createTestUser();
    await pool.query("UPDATE users SET trust_score = 10 WHERE user_id = $1", [userId]);
    await freezeUser(userId, "low trust freeze");

    const result = await unfreezeUser(userId, "review cleared", "reviewer-001");
    expect(result.trustScore).toBe(50);

    const { rows } = await pool.query("SELECT trust_score FROM users WHERE user_id = $1", [userId]);
    expect(Number(rows[0].trust_score)).toBe(50);
  });

  it("does not change trust score if above 50", async () => {
    const userId = await createTestUser();
    await pool.query("UPDATE users SET trust_score = 75 WHERE user_id = $1", [userId]);
    await freezeUser(userId, "manual freeze");

    const result = await unfreezeUser(userId, "review cleared", "reviewer-001");
    expect(result.trustScore).toBe(75);

    const { rows } = await pool.query("SELECT trust_score FROM users WHERE user_id = $1", [userId]);
    expect(Number(rows[0].trust_score)).toBe(75);
  });
});

describe("adjustSuccessfulTransaction", () => {
  it("increases score by 1 (clamped at 100)", async () => {
    const userId = await createTestUser();
    const { rows } = await pool.query<{ transaction_id: string }>(
      `INSERT INTO escrow_transactions (transaction_id, vendor_id, amount, currency, commission, item_description, current_status)
       VALUES (gen_random_uuid(), $1, '100.00', 'GHS', '2.00', 'test', 'FUNDS_SECURED') RETURNING transaction_id`,
      [userId],
    );
    const result = await adjustSuccessfulTransaction(userId, rows[0]!.transaction_id);
    expect(result.newScore).toBe(100);
  });

  it("increases score by 1 from 99 to 100", async () => {
    const userId = await createTestUser();
    await pool.query("UPDATE users SET trust_score = 99 WHERE user_id = $1", [userId]);
    const { rows } = await pool.query<{ transaction_id: string }>(
      `INSERT INTO escrow_transactions (transaction_id, vendor_id, amount, currency, commission, item_description, current_status)
       VALUES (gen_random_uuid(), $1, '100.00', 'GHS', '2.00', 'test', 'FUNDS_SECURED') RETURNING transaction_id`,
      [userId],
    );
    const result = await adjustSuccessfulTransaction(userId, rows[0]!.transaction_id);
    expect(result.newScore).toBe(100);
  });
});

describe("isUserFrozen", () => {
  it("returns true for frozen user", async () => {
    const userId = await createTestUser();
    await freezeUser(userId, "test");

    const frozen = await isUserFrozen(userId);
    expect(frozen).toBe(true);
  });

  it("returns false for non-frozen user", async () => {
    const userId = await createTestUser();

    const frozen = await isUserFrozen(userId);
    expect(frozen).toBe(false);
  });
});
