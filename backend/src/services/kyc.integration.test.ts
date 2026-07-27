import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { checkTierLimit, submitKYC, getKYCStatus, reviewKYC } from "./kyc.js";
import { closeDatabasePool, getTransactionClient } from "../db/pool.js";
import { closeRedis } from "../config/redis.js";

const TEST_PHONE = "+2330000000020";

async function createTestUser(phone: string = TEST_PHONE, kycTier: number = 0): Promise<string> {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<{ user_id: string }>(
      `INSERT INTO users (user_id, phone_number, kyc_tier) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (phone_number) DO UPDATE SET kyc_tier = $2 RETURNING user_id`,
      [phone, kycTier],
    );
    return rows[0]!.user_id;
  } finally {
    client.release();
  }
}

async function createTestEscrow(userId: string, amount: string, daysAgo: number = 0): Promise<void> {
  const client = await getTransactionClient();
  try {
    await client.query(
      `INSERT INTO escrow_transactions (transaction_id, vendor_id, amount, currency, commission, item_description, current_status, deposit_expires_at)
       VALUES (gen_random_uuid(), $1, $2, 'GHS', '0.00', 'Test item', 'FUNDS_SECURED', NOW() + INTERVAL '24 hours')`,
      [userId, amount],
    );
  } finally {
    client.release();
  }
}

async function cleanTestData(): Promise<void> {
  const client = await getTransactionClient();
  try {
    await client.query("DELETE FROM kyc_records WHERE user_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233000000002%')");
    await client.query("DELETE FROM escrow_transactions WHERE vendor_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233000000002%')");
    await client.query("DELETE FROM users WHERE phone_number LIKE '+233000000002%'");
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  await cleanTestData();
});

afterAll(async () => {
  await cleanTestData();
  await closeDatabasePool();
  await closeRedis();
});

beforeEach(async () => {
  await cleanTestData();
});

describe("checkTierLimit", () => {
  it("allows transaction within tier 0 cap", async () => {
    const userId = await createTestUser();
    const result = await checkTierLimit(userId, "500.00", "GHS");
    expect(result.allowed).toBe(true);
    expect(result.currentTier).toBe(0);
  });

  it("blocks transaction exceeding tier 0 cap", async () => {
    const userId = await createTestUser();
    await expect(checkTierLimit(userId, "500.01", "GHS")).rejects.toThrow("Per-transaction limit exceeded");
  });

  it("allows tier 1 transactions up to 5000", async () => {
    const userId = await createTestUser(TEST_PHONE, 1);
    const result = await checkTierLimit(userId, "5000.00", "GHS");
    expect(result.allowed).toBe(true);
    expect(result.currentTier).toBe(1);
  });

  it("blocks tier 1 transactions above 5000", async () => {
    const userId = await createTestUser(TEST_PHONE, 1);
    await expect(checkTierLimit(userId, "5000.01", "GHS")).rejects.toThrow("Per-transaction limit exceeded");
  });

  it("checks daily cap", async () => {
    const userId = await createTestUser();
    // Tier 0 daily cap is 1000
    await createTestEscrow(userId, "600.00");
    await expect(checkTierLimit(userId, "400.01", "GHS")).rejects.toThrow("Daily limit exceeded");
  });

  it("blocks frozen user", async () => {
    const userId = await createTestUser();
    const client = await getTransactionClient();
    try {
      await client.query("UPDATE users SET is_frozen = true WHERE user_id = $1", [userId]);
    } finally {
      client.release();
    }

    await expect(checkTierLimit(userId, "100.00", "GHS")).rejects.toThrow("Account is frozen");
  });

  it("rejects non-GHS currency in P0", async () => {
    const userId = await createTestUser();
    await expect(checkTierLimit(userId, "100.00", "NGN")).rejects.toThrow("KYC limits currently only support GHS");
  });
});

describe("submitKYC", () => {
  it("creates a kyc_records row", async () => {
    const userId = await createTestUser();
    const result = await submitKYC(userId, "NATIONAL_ID", "GHA-123456789-0");
    expect(result.kycId).toBeDefined();

    const client = await getTransactionClient();
    try {
      const { rows } = await client.query(
        "SELECT * FROM kyc_records WHERE kyc_id = $1",
        [result.kycId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.id_type).toBe("NATIONAL_ID");
      expect(rows[0]!.status).toBe("PENDING");
      expect(rows[0]!.id_number_hash).toHaveLength(64);
    } finally {
      client.release();
    }
  });

  it("throws on invalid id_type", async () => {
    const userId = await createTestUser();
    await expect(submitKYC(userId, "DRIVERS_LICENSE" as any, "123")).rejects.toThrow();
  });
});

describe("getKYCStatus", () => {
  it("returns current tier", async () => {
    const userId = await createTestUser();
    const result = await getKYCStatus(userId);
    expect(result.tier).toBe(0);
  });

  it("returns pending submission if exists", async () => {
    const userId = await createTestUser();
    const { kycId } = await submitKYC(userId, "PASSPORT", "AB123456");
    const result = await getKYCStatus(userId);
    expect(result.pendingSubmission).toBe(kycId);
  });
});

describe("reviewKYC", () => {
  it("approves and upgrades tier", async () => {
    const userId = await createTestUser();
    const reviewerId = await createTestUser("+2330000000021");
    const { kycId } = await submitKYC(userId, "NATIONAL_ID", "GHA-999999999-0");

    await reviewKYC(kycId, reviewerId, true);

    const client = await getTransactionClient();
    try {
      const { rows } = await client.query<{ kyc_tier: number }>(
        "SELECT kyc_tier FROM users WHERE user_id = $1",
        [userId],
      );
      expect(rows[0]!.kyc_tier).toBe(1);

      const { rows: kycRows } = await client.query(
        "SELECT status, reviewed_by FROM kyc_records WHERE kyc_id = $1",
        [kycId],
      );
      expect(kycRows[0]!.status).toBe("APPROVED");
      expect(kycRows[0]!.reviewed_by).toBe(reviewerId);
    } finally {
      client.release();
    }
  });

  it("rejects and keeps tier unchanged", async () => {
    const userId = await createTestUser();
    const reviewerId = await createTestUser("+2330000000022");
    const { kycId } = await submitKYC(userId, "NATIONAL_ID", "GHA-BAD-ID");

    await reviewKYC(kycId, reviewerId, false, "ID image unclear");

    const client = await getTransactionClient();
    try {
      const { rows } = await client.query<{ kyc_tier: number }>(
        "SELECT kyc_tier FROM users WHERE user_id = $1",
        [userId],
      );
      expect(rows[0]!.kyc_tier).toBe(0);

      const { rows: kycRows } = await client.query(
        "SELECT status FROM kyc_records WHERE kyc_id = $1",
        [kycId],
      );
      expect(kycRows[0]!.status).toBe("REJECTED");
    } finally {
      client.release();
    }
  });

  it("throws on already-reviewed KYC", async () => {
    const userId = await createTestUser();
    const reviewerId = await createTestUser("+2330000000023");
    const { kycId } = await submitKYC(userId, "PASSPORT", "XX123");

    await reviewKYC(kycId, reviewerId, true);
    await expect(reviewKYC(kycId, reviewerId, false)).rejects.toThrow("KYC record has already been reviewed");
  });
});
