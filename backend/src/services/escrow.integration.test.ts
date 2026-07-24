import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { pool } from "../db/pool.js";
import { createEscrow, getEscrow, initiateDeposit, shipEscrow, confirmDelivery, cancelEscrow, processDepositWebhook, releaseFunds } from "./escrow.js";

beforeAll(async () => {
  await pool.query("SELECT 1");
});

afterAll(async () => {
  await pool.end();
});

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const BUYER_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(async () => {
  await pool.query("DELETE FROM transaction_ledger");
  await pool.query("DELETE FROM payouts");
  await pool.query("DELETE FROM escrow_transactions");
  await pool.query("DELETE FROM users");
  await pool.query(
    `INSERT INTO users (user_id, phone_number, full_name)
     VALUES ($1, '+233240000001', 'Test Vendor'),
            ($2, '+233240000002', 'Test Buyer')`,
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
        expect(r.status).toBe("fulfilled");
      }

      const { rows } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'FUNDS_DEPOSITED'",
        [tx.transaction_id],
      );
      expect(rows).toHaveLength(1);

      const final = await getEscrow(tx.transaction_id);
      expect(final.current_status).toBe("FUNDS_SECURED");
    });
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
});
