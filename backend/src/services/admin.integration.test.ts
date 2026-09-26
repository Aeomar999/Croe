import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { pool } from "../db/pool.js";
import { createEscrow, initiateDeposit, processDepositWebhook, shipEscrow, confirmDelivery, releaseFunds } from "./escrow.js";
import { resolveDispute, retryPayout } from "./admin.js";

beforeAll(async () => {
  await pool.query("SELECT 1");
});

afterAll(async () => {
  await pool.end();
});

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const BUYER_ID = "22222222-2222-2222-2222-222222222222";
const REVIEWER_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM evidence_artifacts");
    await client.query("DELETE FROM dispute_cases");
    await client.query("DELETE FROM transaction_ledger");
    await client.query("DELETE FROM payouts");
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
    `INSERT INTO users (user_id, phone_number, full_name, kyc_tier, role)
     VALUES ($1, '+233240000001', 'Test Vendor', 2, 'consumer'),
            ($2, '+233240000002', 'Test Buyer', 1, 'consumer'),
            ($3, '+233240000003', 'Test Reviewer', 2, 'reviewer')
     ON CONFLICT (phone_number) DO UPDATE SET user_id = EXCLUDED.user_id`,
    [VENDOR_ID, BUYER_ID, REVIEWER_ID],
  );
});

describe("admin service integration", () => {
  describe("resolveDispute", () => {
    async function setupDispute(escrowAmount: string = "500.00") {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for dispute testing",
        amount: escrowAmount,
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

      // Set escrow to UNDER_HUMAN_REVIEW (dispute opened)
      await pool.query(
        `UPDATE escrow_transactions SET current_status = 'UNDER_HUMAN_REVIEW' WHERE transaction_id = $1`,
        [tx.transaction_id],
      );

      // Create a dispute case
      const { rows } = await pool.query(
        `INSERT INTO dispute_cases (transaction_id, reason_code, buyer_claim, status, initiated_by)
         VALUES ($1, 'ITEM_NOT_RECEIVED', 'Item never delivered', 'UNDER_HUMAN_REVIEW', $2)
         RETURNING dispute_id`,
        [tx.transaction_id, BUYER_ID],
      );

      return { tx, disputeId: rows[0].dispute_id };
    }

    it("resolves dispute with RELEASE_VENDOR - calls releaseFunds and transitions to FUNDS_RELEASED", async () => {
      const { tx, disputeId } = await setupDispute("500.00");

      const result = await resolveDispute(disputeId, REVIEWER_ID, "RELEASE_VENDOR", "Evidence shows delivery confirmed");

      expect(result.newStatus).toBe("FUNDS_RELEASED");

      // Verify dispute case updated
      const { rows: disputeRows } = await pool.query(
        `SELECT status, final_resolution FROM dispute_cases WHERE dispute_id = $1`,
        [disputeId],
      );
      expect(disputeRows[0].status).toBe("RESOLVED_AUTO");
      expect(disputeRows[0].final_resolution).toBe("RELEASE_VENDOR");

      // Verify escrow transaction status
      const { rows: escrowRows } = await pool.query(
        `SELECT current_status FROM escrow_transactions WHERE transaction_id = $1`,
        [tx.transaction_id],
      );
      expect(escrowRows[0].current_status).toBe("FUNDS_RELEASED");

      // Verify payout row created with SUCCESS
      const { rows: payouts } = await pool.query(
        `SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'RELEASE'`,
        [tx.transaction_id],
      );
      expect(payouts).toHaveLength(1);
      expect(payouts[0].status).toBe("SUCCESS");

      // Verify ledger has FUNDS_RELEASED entry
      const { rows: ledger } = await pool.query(
        `SELECT event_type, amount_delta FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'FUNDS_RELEASED'`,
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount_delta).toBe("-500.00");
    });

    it("resolves dispute with REFUND_BUYER - calls refundFunds and transitions to FUNDS_REFUNDED", async () => {
      const { tx, disputeId } = await setupDispute("300.00");

      const result = await resolveDispute(disputeId, REVIEWER_ID, "REFUND_BUYER", "Item not as described");

      expect(result.newStatus).toBe("FUNDS_REFUNDED");

      // Verify dispute case updated
      const { rows: disputeRows } = await pool.query(
        `SELECT status, final_resolution FROM dispute_cases WHERE dispute_id = $1`,
        [disputeId],
      );
      expect(disputeRows[0].status).toBe("RESOLVED_AUTO");
      expect(disputeRows[0].final_resolution).toBe("REFUND_BUYER");

      // Verify escrow transaction status
      const { rows: escrowRows } = await pool.query(
        `SELECT current_status FROM escrow_transactions WHERE transaction_id = $1`,
        [tx.transaction_id],
      );
      expect(escrowRows[0].current_status).toBe("FUNDS_REFUNDED");

      // Verify payout row created with SUCCESS
      const { rows: payouts } = await pool.query(
        `SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'REFUND'`,
        [tx.transaction_id],
      );
      expect(payouts).toHaveLength(1);
      expect(payouts[0].status).toBe("SUCCESS");
      expect(payouts[0].amount).toBe("300.00"); // Full amount refunded, no commission

      // Verify ledger has REFUND_ISSUED entry
      const { rows: ledger } = await pool.query(
        `SELECT event_type, amount_delta FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'REFUND_ISSUED'`,
        [tx.transaction_id],
      );
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount_delta).toBe("-300.00");
    });

    it("rejects resolving dispute not in UNDER_HUMAN_REVIEW", async () => {
      const { disputeId } = await setupDispute("100.00");

      // Manually set dispute to a different status
      await pool.query(
        `UPDATE dispute_cases SET status = 'AI_PROCESSING' WHERE dispute_id = $1`,
        [disputeId],
      );

      await expect(
        resolveDispute(disputeId, REVIEWER_ID, "RELEASE_VENDOR", "Test reason"),
      ).rejects.toThrow("Cannot resolve dispute: status is AI_PROCESSING");
    });

    it("rejects resolving dispute for escrow not in UNDER_HUMAN_REVIEW", async () => {
      const { tx, disputeId } = await setupDispute("100.00");

      // Manually set escrow to a different status
      await pool.query(
        `UPDATE escrow_transactions SET current_status = 'DELIVERED_CONFIRMED' WHERE transaction_id = $1`,
        [tx.transaction_id],
      );

      await expect(
        resolveDispute(disputeId, REVIEWER_ID, "RELEASE_VENDOR", "Test reason"),
      ).rejects.toThrow("Cannot resolve dispute: escrow status is DELIVERED_CONFIRMED");
    });

    it("rejects unknown dispute", async () => {
      await expect(
        resolveDispute("00000000-0000-0000-0000-000000000000", REVIEWER_ID, "RELEASE_VENDOR", "Test"),
      ).rejects.toThrow("Dispute not found");
    });
  });

  describe("retryPayout", () => {
    async function setupFailedPayout(direction: "RELEASE" | "REFUND") {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product for retry testing",
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

      // Create a dispute if refund, otherwise just release
      if (direction === "REFUND") {
        // Set escrow to UNDER_HUMAN_REVIEW for dispute resolution
        await pool.query(
          `UPDATE escrow_transactions SET current_status = 'UNDER_HUMAN_REVIEW' WHERE transaction_id = $1`,
          [tx.transaction_id],
        );

        await pool.query(
          `INSERT INTO dispute_cases (transaction_id, reason_code, buyer_claim, status, initiated_by)
           VALUES ($1, 'ITEM_NOT_RECEIVED', 'Item never delivered', 'UNDER_HUMAN_REVIEW', $2)`,
          [tx.transaction_id, BUYER_ID],
        );

        // Resolve with refund - this will create a payout
        const { rows } = await pool.query(
          `SELECT dispute_id FROM dispute_cases WHERE transaction_id = $1`,
          [tx.transaction_id],
        );
        await resolveDispute(rows[0].dispute_id, REVIEWER_ID, "REFUND_BUYER", "Test refund");
      } else {
        // Normal release
        await releaseFunds({ transactionId: tx.transaction_id });
      }

      // Manually mark the latest payout as FAILED to simulate a failure
      await pool.query(
        `UPDATE payouts SET status = 'FAILED', failure_reason = 'Simulated failure'
         WHERE transaction_id = $1 AND direction = $2`,
        [tx.transaction_id, direction],
      );

      // Reset escrow status to pre-payout state (UNDER_HUMAN_REVIEW for refund, DELIVERED_CONFIRMED for release)
      const prePayoutStatus = direction === "REFUND" ? "UNDER_HUMAN_REVIEW" : "DELIVERED_CONFIRMED";
      await pool.query(
        `UPDATE escrow_transactions SET current_status = $1 WHERE transaction_id = $2`,
        [prePayoutStatus, tx.transaction_id],
      );

      return tx;
    }

    it("retries a FAILED RELEASE payout", async () => {
      const tx = await setupFailedPayout("RELEASE");

      const result = await retryPayout(tx.transaction_id, REVIEWER_ID);
      expect(result.status).toBe("RETRY_INITIATED");

      // Verify payout retried and succeeded
      const { rows: payouts } = await pool.query(
        `SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'RELEASE' ORDER BY created_at`,
        [tx.transaction_id],
      );
      expect(payouts.length).toBeGreaterThanOrEqual(2);
      const latestPayout = payouts[payouts.length - 1];
      expect(latestPayout.status).toBe("SUCCESS");

      // Verify escrow transitioned to FUNDS_RELEASED
      const { rows: escrowRows } = await pool.query(
        `SELECT current_status FROM escrow_transactions WHERE transaction_id = $1`,
        [tx.transaction_id],
      );
      expect(escrowRows[0].current_status).toBe("FUNDS_RELEASED");
    });

    it("retries a FAILED REFUND payout", async () => {
      const tx = await setupFailedPayout("REFUND");

      const result = await retryPayout(tx.transaction_id, REVIEWER_ID);
      expect(result.status).toBe("RETRY_INITIATED");

      // Verify payout retried and succeeded
      const { rows: payouts } = await pool.query(
        `SELECT * FROM payouts WHERE transaction_id = $1 AND direction = 'REFUND' ORDER BY created_at`,
        [tx.transaction_id],
      );
      expect(payouts.length).toBeGreaterThanOrEqual(2);
      const latestPayout = payouts[payouts.length - 1];
      expect(latestPayout.status).toBe("SUCCESS");

      // Verify escrow transitioned to FUNDS_REFUNDED
      const { rows: escrowRows } = await pool.query(
        `SELECT current_status FROM escrow_transactions WHERE transaction_id = $1`,
        [tx.transaction_id],
      );
      expect(escrowRows[0].current_status).toBe("FUNDS_REFUNDED");
    });

    it("rejects retry when no payout exists", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product",
        amount: "100.00",
        currency: "GHS",
      });

      await expect(
        retryPayout(tx.transaction_id, REVIEWER_ID),
      ).rejects.toThrow("No payout found for transaction");
    });

    it("rejects retry when latest payout is not FAILED", async () => {
      const tx = await createEscrow({
        vendorId: VENDOR_ID,
        itemDescription: "Test product",
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
      await releaseFunds({ transactionId: tx.transaction_id });

      // Latest payout is SUCCESS, not FAILED
      await expect(
        retryPayout(tx.transaction_id, REVIEWER_ID),
      ).rejects.toThrow("Cannot retry: latest payout status is SUCCESS");
    });
  });
});