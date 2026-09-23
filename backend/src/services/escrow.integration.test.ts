import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { pool } from "../db/pool.js";
import { createEscrow, getEscrow, initiateDeposit, shipEscrow, confirmDelivery, cancelEscrow, processDepositWebhook, releaseFunds } from "./escrow.js";
import { checkIdempotencyKey, storeIdempotencyResponse, hashRequestBody, purgeExpiredIdempotencyKeys } from "./idempotency.js";

beforeAll(async () => {
  await pool.query("SELECT 1");
});

afterAll(async () => {
  await pool.end();
});

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const BUYER_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM evidence_artifacts");
    await client.query("DELETE FROM dispute_cases");
    await client.query("DELETE FROM idempotency_keys");
    await client.query("DELETE FROM transaction_ledger");
    await client.query("DELETE FROM payouts");
    await client.query("DELETE FROM escrow_transactions");
    await client.query("DELETE FROM user_preferences WHERE user_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+23399%')");
    await client.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+23399%')");
    await client.query("DELETE FROM users CASCADE");
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  await pool.query(
    `INSERT INTO users (user_id, phone_number, full_name, kyc_tier)
     VALUES ($1, '+233240000001', 'Test Vendor', 2),
            ($2, '+233240000002', 'Test Buyer', 1)
     ON CONFLICT (phone_number) DO UPDATE SET user_id = EXCLUDED.user_id`,
    [VENDOR_ID, BUYER_ID],
  );
});

describe("escrow service integration", () => {
  describe("createEscrow", () => {
    it("creates escrow with LINK_CREATED status", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      expect(tx.transaction_id).toBeDefined();
      expect(tx.current_status).toBe("LINK_CREATED");
      expect(tx.amount).toBe("100.00");
      expect(tx.currency).toBe("GHS");
      expect(tx.vendor_id).toBe(VENDOR_ID);
    });

    it("writes LINK_CREATED ledger entry", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "250.00",
        currency: "GHS",
      });

      const { rows } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1",
        [tx.transaction_id],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].event_type).toBe("LINK_CREATED");
      expect(rows[0].previous_status).toBeNull();
      expect(rows[0].new_status).toBe("LINK_CREATED");
    });
  });

  describe("full happy-path lifecycle", () => {
    it("LINK_CREATED → AWAITING_DEPOSIT → FUNDS_SECURED → SHIPPED → DELIVERED_CONFIRMED", async () => {
      const created = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "500.00",
        currency: "GHS",
      });
      expect(created.current_status).toBe("LINK_CREATED");

      const deposited = await initiateDeposit({
        transactionId: created.transaction_id,
        buyerId: BUYER_ID,
        msisdn: "+233240000000",
        carrier: "MTN",
      });
      expect(deposited.status).toBe("PENDING");

      const secured = await processDepositWebhook({
        transactionId: created.transaction_id,
      });
      expect(secured.current_status).toBe("FUNDS_SECURED");

      const shipped = await shipEscrow({
        transactionId: created.transaction_id,
        vendorId: VENDOR_ID,
      });
      expect(shipped.current_status).toBe("SHIPPED");

      const confirmed = await confirmDelivery({
        transactionId: created.transaction_id,
        buyerId: BUYER_ID,
      });
      expect(confirmed.current_status).toBe("DELIVERED_CONFIRMED");

      const { rows: ledger } = await pool.query(
        "SELECT event_type FROM transaction_ledger WHERE transaction_id = $1 ORDER BY created_at",
        [created.transaction_id],
      );
      expect(ledger.map((r: { event_type: string }) => r.event_type)).toEqual([
        "LINK_CREATED",
        "BUYER_CLAIMED",
        "FUNDS_DEPOSITED",
        "SHIPPED",
        "DELIVERY_CONFIRMED",
      ]);
    });
  });

  describe("invalid transitions", () => {
    it("cannot ship before deposit is secured", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      await expect(
        shipEscrow({ transactionId: tx.transaction_id, vendorId: VENDOR_ID }),
      ).rejects.toThrow();
    });

    it("cannot confirm delivery before shipping", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      await initiateDeposit({
        transactionId: tx.transaction_id,
        buyerId: BUYER_ID,
        msisdn: "+233240000000",
        carrier: "MTN",
      });

      await processDepositWebhook({ transactionId: tx.transaction_id });

      await expect(
        confirmDelivery({ transactionId: tx.transaction_id, buyerId: BUYER_ID }),
      ).rejects.toThrow();
    });

    it("cannot cancel after deposit initiated", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      await initiateDeposit({
        transactionId: tx.transaction_id,
        buyerId: BUYER_ID,
        msisdn: "+233240000000",
        carrier: "MTN",
      });

      await expect(
        cancelEscrow({ transactionId: tx.transaction_id, vendorId: VENDOR_ID }),
      ).rejects.toThrow();
    });
  });

  describe("cancel flow", () => {
    it("can cancel from LINK_CREATED", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      const cancelled = await cancelEscrow({
        transactionId: tx.transaction_id,
        vendorId: VENDOR_ID,
      });
      expect(cancelled.current_status).toBe("CANCELLED");
    });
  });

  describe("processDepositWebhook idempotency", () => {
    it("duplicate webhook returns same state without error", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      await initiateDeposit({
        transactionId: tx.transaction_id,
        buyerId: BUYER_ID,
        msisdn: "+233240000000",
        carrier: "MTN",
      });

      const first = await processDepositWebhook({ transactionId: tx.transaction_id });
      expect(first.current_status).toBe("FUNDS_SECURED");

      const second = await processDepositWebhook({ transactionId: tx.transaction_id });
      expect(second.current_status).toBe("FUNDS_SECURED");

      const { rows } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'FUNDS_DEPOSITED'",
        [tx.transaction_id],
      );
      expect(rows).toHaveLength(1);
    });
  });

  describe("deposit expiry", () => {
    it("deposit_expires_at is set on AWAITING_DEPOSIT", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      const deposited = await initiateDeposit({
        transactionId: tx.transaction_id,
        buyerId: BUYER_ID,
        msisdn: "+233240000000",
        carrier: "MTN",
      });

      expect(deposited.tx.deposit_expires_at).toBeDefined();
      const expiresAt = new Date(deposited.tx.deposit_expires_at!);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("concurrent webhooks", () => {
    it("50 concurrent webhooks produce exactly one FUNDS_DEPOSITED ledger entry", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      await initiateDeposit({
        transactionId: tx.transaction_id,
        buyerId: BUYER_ID,
        msisdn: "+233240000000",
        carrier: "MTN",
      });

      const results = await Promise.allSettled(
        Array.from({ length: 50 }, () =>
          processDepositWebhook({ transactionId: tx.transaction_id }),
        ),
      );

      for (const r of results) {
        if (r.status === "rejected") {
          console.error("Concurrent webhook rejected:", r.reason);
        }
        expect(r.status).toBe("fulfilled");
      }

      const { rows } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'FUNDS_DEPOSITED'",
        [tx.transaction_id],
      );
      expect(rows).toHaveLength(1);

      const final = await getEscrow(tx.transaction_id);
      expect(final.current_status).toBe("FUNDS_SECURED");
    }, 15000);
  });

  describe("release flow", () => {
    it("releases funds after delivery confirmation with correct commission", async () => {
      // Full happy path to DELIVERED_CONFIRMED
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "500.00",
        currency: "GHS",
      });

      await initiateDeposit({
        transactionId: tx.transaction_id,
        buyerId: BUYER_ID,
        msisdn: "+233240000000",
        carrier: "MTN",
      });

      await processDepositWebhook({ transactionId: tx.transaction_id });
      await shipEscrow({ transactionId: tx.transaction_id, vendorId: VENDOR_ID });
      await confirmDelivery({ transactionId: tx.transaction_id, buyerId: BUYER_ID });

      // Release funds
      const released = await releaseFunds({ transactionId: tx.transaction_id });
      expect(released.current_status).toBe("FUNDS_RELEASED");

      // Check payout row was created
      const { rows: payouts } = await pool.query(
        "SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'RELEASE'",
        [tx.transaction_id],
      );
      expect(payouts).toHaveLength(1);
      expect(payouts[0].status).toBe("SUCCESS");

      // Check commission math: 2% of 500.00 = 10.00, vendor gets 490.00
      const vendorNet = parseFloat(payouts[0].amount);
      expect(vendorNet).toBe(490.00);

      // Check ledger has FUNDS_RELEASED entry with negative amount
      const { rows: ledger } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'FUNDS_RELEASED'",
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount_delta).toBe("-500.00");
    });

    it("cannot release before funds are secured", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for integration testing purposes",
        amount: "100.00",
        currency: "GHS",
      });

      // Cannot release from LINK_CREATED
      await expect(
        releaseFunds({ transactionId: tx.transaction_id }),
      ).rejects.toThrow();
    });

    it("commission math is exact for various amounts", async () => {
      const amounts = ["100.00", "250.50", "1000.00", "0.01"];
      for (const amount of amounts) {
        const tx = await createEscrow({
          vendorId: VENDOR_ID,
          itemDescription: "Test product for integration testing purposes",
          amount,
          currency: "GHS",
        });

        await initiateDeposit({
          transactionId: tx.transaction_id,
          buyerId: BUYER_ID,
          msisdn: "+233240000000",
          carrier: "MTN",
        });

        await processDepositWebhook({ transactionId: tx.transaction_id });
        await shipEscrow({ transactionId: tx.transaction_id, vendorId: VENDOR_ID });
        await confirmDelivery({ transactionId: tx.transaction_id, buyerId: BUYER_ID });
        await releaseFunds({ transactionId: tx.transaction_id });

        const { rows: payouts } = await pool.query(
          "SELECT amount FROM payouts WHERE transaction_id = $1 AND direction = 'RELEASE'",
          [tx.transaction_id],
        );

        const expectedCommission = (parseFloat(amount) * 0.02).toFixed(2);
        const expectedVendorNet = (parseFloat(amount) - parseFloat(expectedCommission)).toFixed(2);

        // Exact equality — no float drift (FIN-01)
        expect(payouts[0].amount).toBe(expectedVendorNet);
      }
    });
  });

  describe("idempotency replay", () => {
    const KEY = "aaaa1111-bbbb-cccc-dddd-eeeeeeeeeeee";

    beforeEach(async () => {
      await pool.query("DELETE FROM idempotency_keys");
    });

    it("returns null for a new key", async () => {
      const result = await checkIdempotencyKey(KEY, "POST", "/v1/escrow", null, "abc123");
      expect(result).toBeNull();
    });

    it("stores and replays a response", async () => {
      const body = { transaction_id: "test-123", current_status: "LINK_CREATED" };
      const bodyHash = hashRequestBody(body);

      await storeIdempotencyResponse(KEY, "POST", "/v1/escrow", null, bodyHash, 201, body);

      const replayed = await checkIdempotencyKey(KEY, "POST", "/v1/escrow", null, bodyHash);
      expect(replayed).toEqual({ status: 201, body });
    });

    it("detects same key, different body → conflict", async () => {
      const bodyV1 = { item: "A" };
      const bodyV2 = { item: "B" };
      const hashV1 = hashRequestBody(bodyV1);
      const hashV2 = hashRequestBody(bodyV2);

      await storeIdempotencyResponse(KEY, "POST", "/v1/escrow", null, hashV1, 201, bodyV1);

      await expect(
        checkIdempotencyKey(KEY, "POST", "/v1/escrow", null, hashV2),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("detects same key, different method → conflict", async () => {
      const body = { item: "A" };
      const bodyHash = hashRequestBody(body);

      await storeIdempotencyResponse(KEY, "POST", "/v1/escrow", null, bodyHash, 201, body);

      await expect(
        checkIdempotencyKey(KEY, "GET", "/v1/escrow", null, bodyHash),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("detects same key, different path → conflict", async () => {
      const body = { item: "A" };
      const bodyHash = hashRequestBody(body);

      await storeIdempotencyResponse(KEY, "POST", "/v1/escrow", null, bodyHash, 201, body);

      await expect(
        checkIdempotencyKey(KEY, "POST", "/v1/escrow/other", null, bodyHash),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("purges expired keys", async () => {
      const expiredHash = hashRequestBody({});
      await pool.query(
        `INSERT INTO idempotency_keys (idempotency_key, method, path, response_status, response_body, expires_at)
         VALUES ($1, 'POST', '/v1/escrow', 201, '{}', NOW() - INTERVAL '1 hour')`,
        [KEY],
      );

      const purged = await purgeExpiredIdempotencyKeys();
      expect(purged).toBeGreaterThanOrEqual(1);

      const result = await checkIdempotencyKey(KEY, "POST", "/v1/escrow", null, expiredHash);
      expect(result).toBeNull();
    });
  });
});
