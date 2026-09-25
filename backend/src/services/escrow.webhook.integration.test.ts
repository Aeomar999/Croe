import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { pool } from "../db/pool.js";
import {
  createEscrow,
  initiateDeposit,
  processDepositWebhook,
  shipEscrow,
  confirmDelivery,
  getEscrow,
  processTransferWebhook,
} from "./escrow.js";

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
    await client.query("DELETE FROM webhook_inbox");
    await client.query("DELETE FROM escrow_transactions");
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

describe("transfer webhook integration", () => {
  describe("processTransferWebhook", () => {
    it("completes release payout on transfer.success", async () => {
      // Setup: full happy path to DELIVERED_CONFIRMED
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for webhook testing",
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

      // Manually create an INITIATED payout row (simulating releaseFunds with INITIATED result)
      await pool.query(
        `INSERT INTO payouts (transaction_id, direction, recipient_msisdn, amount, currency, status, provider_ref)
         VALUES ($1, 'RELEASE', '+233240000001', $2, $3, 'INITIATED', $4)`,
        [tx.transaction_id, "475.00", "GHS", "rel-" + tx.transaction_id],
      );
      const providerRef = "rel-" + tx.transaction_id;

      // Process transfer.success webhook
      await processTransferWebhook({
        providerRef,
        direction: "RELEASE",
        outcome: "PAID",
      });

      // Verify final state
      const final = await getEscrow(tx.transaction_id);
      expect(final.current_status).toBe("FUNDS_RELEASED");

      const { rows: payoutsAfter } = await pool.query(
        "SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'RELEASE'",
        [tx.transaction_id],
      );
      expect(payoutsAfter[0].status).toBe("SUCCESS");

      const { rows: ledger } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'FUNDS_RELEASED'",
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount_delta).toBe("-500.00");
    });

    it("marks release payout FAILED on transfer.failed", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for webhook testing",
        amount: "300.00",
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

      // Manually create an INITIATED payout row
      const providerRef = "rel-" + tx.transaction_id;
      await pool.query(
        `INSERT INTO payouts (transaction_id, direction, recipient_msisdn, amount, currency, status, provider_ref)
         VALUES ($1, 'RELEASE', '+233240000001', $2, $3, 'INITIATED', $4)`,
        [tx.transaction_id, "285.00", "GHS", providerRef],
      );

      // Process transfer.failed webhook
      await processTransferWebhook({
        providerRef,
        direction: "RELEASE",
        outcome: "FAILED",
      });

      const final = await getEscrow(tx.transaction_id);
      expect(final.current_status).toBe("DELIVERED_CONFIRMED"); // State unchanged

      const { rows: payoutsAfter } = await pool.query(
        "SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'RELEASE'",
        [tx.transaction_id],
      );
      expect(payoutsAfter[0].status).toBe("FAILED");
      expect(payoutsAfter[0].failure_reason).toBe("Transfer failed");

      const { rows: ledger } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'PAYOUT_FAILED'",
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1);
    });

    it("marks release payout FAILED on transfer.reversed", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for webhook testing",
        amount: "200.00",
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

      // Manually create an INITIATED payout row
      const providerRef = "rel-" + tx.transaction_id;
      await pool.query(
        `INSERT INTO payouts (transaction_id, direction, recipient_msisdn, amount, currency, status, provider_ref)
         VALUES ($1, 'RELEASE', '+233240000001', $2, $3, 'INITIATED', $4)`,
        [tx.transaction_id, "190.00", "GHS", providerRef],
      );

      // Process transfer.reversed webhook
      await processTransferWebhook({
        providerRef,
        direction: "RELEASE",
        outcome: "CANCELLED",
      });

      const { rows: payoutsAfter } = await pool.query(
        "SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'RELEASE'",
        [tx.transaction_id],
      );
      expect(payoutsAfter[0].status).toBe("FAILED");
      expect(payoutsAfter[0].failure_reason).toBe("Transfer reversed by Paystack");

      const { rows: ledger } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'PAYOUT_FAILED'",
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1);
    });

    it("completes refund payout on transfer.success", async () => {
      // Setup: create dispute and resolve with REFUND_BUYER
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for refund testing",
        amount: "400.00",
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

      // Open dispute and resolve (simulate RESOLVED_AUTO state)
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO dispute_cases (transaction_id, initiated_by, reason_code, buyer_claim, status, final_resolution)
           VALUES ($1, $2, 'ITEM_NOT_RECEIVED', 'Item not received', 'RESOLVED_AUTO', 'REFUND_BUYER')`,
          [tx.transaction_id, BUYER_ID],
        );
        await client.query(
          `UPDATE escrow_transactions SET current_status = 'RESOLVED_AUTO' WHERE transaction_id = $1`,
          [tx.transaction_id],
        );
        await client.query("COMMIT");
      } finally {
        client.release();
      }

      // Manually create an INITIATED refund payout row (simulating refundFunds with INITIATED result)
      const providerRef = "ref-" + tx.transaction_id;
      await pool.query(
        `INSERT INTO payouts (transaction_id, direction, recipient_msisdn, amount, currency, status, provider_ref)
         VALUES ($1, 'REFUND', '+233240000002', $2, $3, 'INITIATED', $4)`,
        [tx.transaction_id, "400.00", "GHS", providerRef],
      );

      // Process transfer.success webhook
      await processTransferWebhook({
        providerRef,
        direction: "REFUND",
        outcome: "PAID",
      });

      const final = await getEscrow(tx.transaction_id);
      expect(final.current_status).toBe("FUNDS_REFUNDED");

      const { rows: payoutsAfter } = await pool.query(
        "SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'REFUND'",
        [tx.transaction_id],
      );
      expect(payoutsAfter[0].status).toBe("SUCCESS");

      const { rows: ledger } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'REFUND_ISSUED'",
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount_delta).toBe("-400.00");
    });

    it("marks refund payout FAILED on transfer.failed", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for refund testing",
        amount: "250.00",
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

      // Open dispute and resolve
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO dispute_cases (transaction_id, initiated_by, reason_code, buyer_claim, status, final_resolution)
           VALUES ($1, $2, 'ITEM_NOT_RECEIVED', 'Item not received', 'RESOLVED_AUTO', 'REFUND_BUYER')`,
          [tx.transaction_id, BUYER_ID],
        );
        await client.query(
          `UPDATE escrow_transactions SET current_status = 'RESOLVED_AUTO' WHERE transaction_id = $1`,
          [tx.transaction_id],
        );
        await client.query("COMMIT");
      } finally {
        client.release();
      }

      // Manually create an INITIATED refund payout row
      const providerRef = "ref-" + tx.transaction_id;
      await pool.query(
        `INSERT INTO payouts (transaction_id, direction, recipient_msisdn, amount, currency, status, provider_ref)
         VALUES ($1, 'REFUND', '+233240000002', $2, $3, 'INITIATED', $4)`,
        [tx.transaction_id, "250.00", "GHS", providerRef],
      );

      // Process transfer.failed webhook
      await processTransferWebhook({
        providerRef,
        direction: "REFUND",
        outcome: "FAILED",
      });

      const final = await getEscrow(tx.transaction_id);
      expect(final.current_status).toBe("RESOLVED_AUTO"); // State unchanged

      const { rows: payoutsAfter } = await pool.query(
        "SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'REFUND'",
        [tx.transaction_id],
      );
      expect(payoutsAfter[0].status).toBe("FAILED");
      expect(payoutsAfter[0].failure_reason).toBe("Transfer failed");

      const { rows: ledger } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'PAYOUT_FAILED'",
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1);
    });

    it("is idempotent for duplicate transfer.success webhooks", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for idempotency testing",
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
      await shipEscrow({ transactionId: tx.transaction_id, vendorId: VENDOR_ID });
      await confirmDelivery({ transactionId: tx.transaction_id, buyerId: BUYER_ID });

      // Manually create an INITIATED payout row
      const providerRef = "rel-" + tx.transaction_id;
      await pool.query(
        `INSERT INTO payouts (transaction_id, direction, recipient_msisdn, amount, currency, status, provider_ref)
         VALUES ($1, 'RELEASE', '+233240000001', $2, $3, 'INITIATED', $4)`,
        [tx.transaction_id, "95.00", "GHS", providerRef],
      );

      // Process transfer.success webhook twice
      await processTransferWebhook({
        providerRef,
        direction: "RELEASE",
        outcome: "PAID",
      });

      await processTransferWebhook({
        providerRef,
        direction: "RELEASE",
        outcome: "PAID",
      });

      const final = await getEscrow(tx.transaction_id);
      expect(final.current_status).toBe("FUNDS_RELEASED");

      const { rows: ledger } = await pool.query(
        "SELECT * FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'FUNDS_RELEASED'",
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1); // Only one ledger entry
    });
  });
});