import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { pool } from "../db/pool.js";
import {
  queryRecycledEvidence,
  querySybilVelocity,
  queryTrustAndAge,
  runHeuristics,
  applyTrustPenalty,
  freezeDevice,
} from "./heuristics.js";

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const BUYER_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_TX = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const TARGET_TX = "33333333-3333-3333-3333-333333333333";

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
    await client.query("DELETE FROM idempotency_keys");
    await client.query("DELETE FROM users CASCADE");
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  // Seed users
  await pool.query(
    `INSERT INTO users (user_id, phone_number, full_name, trust_score, is_frozen)
     VALUES ($1, '+233240000001', 'Test Vendor', 50, false),
            ($2, '+233240000002', 'Test Buyer', 50, false)
     ON CONFLICT (phone_number) DO UPDATE SET user_id = EXCLUDED.user_id`,
    [VENDOR_ID, BUYER_ID],
  );

  // Seed escrow
  await pool.query(
    `INSERT INTO escrow_transactions (transaction_id, vendor_id, buyer_id, item_description, amount, currency, current_status)
     VALUES ($1, $2, $3, 'Test product for integration testing purposes', '100.00', 'GHS', 'FUNDS_SECURED'),
            ($4, $2, $3, 'Other transaction for recycled evidence testing', '50.00', 'GHS', 'SHIPPED')`,
    [TARGET_TX, VENDOR_ID, BUYER_ID, OTHER_TX],
  );
});

describe("heuristics", () => {
  describe("Query A — recycled evidence", () => {
    it("returns false when no evidence exists", async () => {
      const result = await queryRecycledEvidence("abc123", TARGET_TX);
      expect(result).toBe(false);
    });

    it("returns true when same hash exists for different transaction", async () => {
      // Insert evidence for OTHER_TX
      await pool.query(
        `INSERT INTO evidence_artifacts (transaction_id, uploader_id, file_url, sha256_hash, artifact_type, ip_address, device_id)
         VALUES ($1, $2, '/uploads/test.jpg', 'abc123hash', 'PACKAGING_PHOTO', '127.0.0.1', 'device-1')`,
        [OTHER_TX, VENDOR_ID],
      );

      const result = await queryRecycledEvidence("abc123hash", TARGET_TX);
      expect(result).toBe(true);
    });

    it("returns false when same hash exists for same transaction (re-upload)", async () => {
      await pool.query(
        `INSERT INTO evidence_artifacts (transaction_id, uploader_id, file_url, sha256_hash, artifact_type, ip_address, device_id)
         VALUES ($1, $2, '/uploads/test.jpg', 'samehash', 'PACKAGING_PHOTO', '127.0.0.1', 'device-1')`,
        [TARGET_TX, VENDOR_ID],
      );

      const result = await queryRecycledEvidence("samehash", TARGET_TX);
      expect(result).toBe(false);
    });
  });

  describe("Query B — Sybil velocity", () => {
    it("returns zero counts when no disputes exist", async () => {
      const result = await querySybilVelocity("192.168.1.1", "device-abc");
      expect(result.accounts).toBe(0);
      expect(result.disputes).toBe(0);
    });

    it("counts distinct accounts and disputes from same IP", async () => {
      // Insert multiple dispute events from same IP
      await pool.query(
        `INSERT INTO transaction_ledger (transaction_id, actor_id, event_type, previous_status, new_status, ip_address, device_id)
         VALUES ($1, $2, 'DISPUTE_OPENED', 'FUNDS_SECURED', 'DISPUTE_OPENED', '10.0.0.1', 'device-X'),
                ($1, $3, 'DISPUTE_OPENED', 'FUNDS_SECURED', 'DISPUTE_OPENED', '10.0.0.1', 'device-X'),
                ($1, $2, 'DISPUTE_OPENED', 'FUNDS_SECURED', 'DISPUTE_OPENED', '10.0.0.1', 'device-X')`,
        [TARGET_TX, VENDOR_ID, BUYER_ID],
      );

      const result = await querySybilVelocity("10.0.0.1", "device-X");
      expect(result.accounts).toBe(2);
      expect(result.disputes).toBe(1);
    });
  });

  describe("Query C — trust/age", () => {
    it("returns trust score and age for existing user", async () => {
      const result = await queryTrustAndAge(VENDOR_ID);
      expect(result.trustScore).toBe(50);
      expect(result.isFrozen).toBe(false);
      expect(result.ageHours).toBeGreaterThanOrEqual(0);
    });

    it("returns defaults for non-existent user", async () => {
      const result = await queryTrustAndAge("99999999-9999-9999-9999-999999999999");
      expect(result.trustScore).toBe(50);
      expect(result.isFrozen).toBe(false);
    });
  });

  describe("Rule engine cascading", () => {
    it("Rule 1: recycled evidence → RECYCLED_MEDIA", async () => {
      // Insert recycled evidence
      await pool.query(
        `INSERT INTO evidence_artifacts (transaction_id, uploader_id, file_url, sha256_hash, artifact_type, ip_address, device_id)
         VALUES ($1, $2, '/uploads/recycled.jpg', 'recycled123', 'PACKAGING_PHOTO', '127.0.0.1', 'device-1')`,
        [OTHER_TX, VENDOR_ID],
      );

      const result = await runHeuristics({
        transactionId: TARGET_TX,
        userId: BUYER_ID,
        sha256Hash: "recycled123",
        ipAddress: "127.0.0.1",
        deviceId: "device-1",
      });

      expect(result.ruleTriggered).toBe("RECYCLED_MEDIA");
      expect(result.details.recycled).toBe(true);
    });

    it("Rule 2: high dispute velocity → SYBIL_VELOCITY", async () => {
      // Need >2 distinct accounts (Sybil velocity)
      const actor1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
      const actor2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
      const actor3 = "cccccccc-cccc-cccc-cccc-cccccccccccc";
      await pool.query(
        `INSERT INTO users (user_id, phone_number, full_name) VALUES ($1, '+233240000111', 'A'), ($2, '+233240000222', 'B'), ($3, '+233240000333', 'C')`,
        [actor1, actor2, actor3],
      );

      // Insert disputes from 3 different accounts, same IP
      for (const actor of [actor1, actor2, actor3]) {
        await pool.query(
          `INSERT INTO transaction_ledger (transaction_id, actor_id, event_type, previous_status, new_status, ip_address, device_id)
           VALUES ($1, $2, 'DISPUTE_OPENED', 'FUNDS_SECURED', 'DISPUTE_OPENED', '10.0.0.1', 'device-Y')`,
          [TARGET_TX, actor],
        );
      }

      const result = await runHeuristics({
        transactionId: TARGET_TX,
        userId: BUYER_ID,
        sha256Hash: "nothere",
        ipAddress: "10.0.0.1",
        deviceId: "device-Y",
      });

      expect(result.ruleTriggered).toBe("SYBIL_VELOCITY");
    });

    it("Rule 3: young account with low trust → BURNER_ACCOUNT", async () => {
      // Create a brand-new user
      const burnerId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
      await pool.query(
        `INSERT INTO users (user_id, phone_number, full_name, trust_score, is_frozen)
         VALUES ($1, '+233240000099', 'Burner', 30, false)`,
        [burnerId],
      );

      const result = await runHeuristics({
        transactionId: TARGET_TX,
        userId: burnerId,
        sha256Hash: "nothere",
        ipAddress: "10.0.0.5",
        deviceId: "device-Z",
      });

      expect(result.ruleTriggered).toBe("BURNER_ACCOUNT");
    });

    it("Rule 4: no rule matched → null (pass to AI)", async () => {
      const result = await runHeuristics({
        transactionId: TARGET_TX,
        userId: BUYER_ID,
        sha256Hash: "uniquehash",
        ipAddress: "10.0.0.99",
        deviceId: "device-unique",
      });

      expect(result.ruleTriggered).toBeNull();
      expect(result.details.passed).toBe(true);
    });
  });

  describe("Trust penalty", () => {
    it("reduces trust score by penalty amount", async () => {
      await applyTrustPenalty(BUYER_ID, 50);

      const { rows } = await pool.query("SELECT trust_score FROM users WHERE user_id = $1", [BUYER_ID]);
      expect(parseInt(rows[0].trust_score)).toBe(0);
    });

    it("floors trust score at 0", async () => {
      await applyTrustPenalty(BUYER_ID, 100);

      const { rows } = await pool.query("SELECT trust_score FROM users WHERE user_id = $1", [BUYER_ID]);
      expect(parseInt(rows[0].trust_score)).toBe(0);
    });
  });

  describe("Freeze device", () => {
    it("freezes users associated with a device", async () => {
      // Insert a ledger entry linking user to device
      await pool.query(
        `INSERT INTO transaction_ledger (transaction_id, actor_id, event_type, previous_status, new_status, device_id)
         VALUES ($1, $2, 'DISPUTE_OPENED', 'FUNDS_SECURED', 'DISPUTE_OPENED', 'freeze-device-1')`,
        [TARGET_TX, BUYER_ID],
      );

      await freezeDevice("freeze-device-1");

      const { rows } = await pool.query("SELECT is_frozen FROM users WHERE user_id = $1", [BUYER_ID]);
      expect(rows[0].is_frozen).toBe(true);
    });
  });
});
