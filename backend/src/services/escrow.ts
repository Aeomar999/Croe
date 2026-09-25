import type { PoolClient } from "pg";
import { getTransactionClient } from "../db/pool.js";
import { InvalidTransitionError, validateTransition } from "./state-machine.js";
import type { EscrowState, LedgerEvent, Carrier, Money } from "../types/domain.js";
import type { ForensicContext } from "../middleware/forensic.js";
import { AppError } from "../middleware/error-handler.js";
import { paymentRail, custodyProvider } from "../providers/index.js";
import { env } from "../config/env.js";
import { feeRatesFor } from "../config/fees.js";
import { calculateFees } from "./money.js";

const DEPOSIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h post-ship

type EscrowRow = {
  transaction_id: string;
  vendor_id: string;
  buyer_id: string | null;
  amount: string;
  currency: string;
  commission: string;
  item_description: string;
  current_status: EscrowState;
  deposit_expires_at: Date | null;
  dispute_closes_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

/**
 * Write an append-only ledger entry (AUD-01).
 * Never UPDATE/DELETE transaction_ledger.
 */
async function appendLedger(
  client: PoolClient,
  p: {
    transactionId: string;
    actorId: string | null;
    eventType: LedgerEvent;
    previousStatus: EscrowState | null;
    newStatus: EscrowState;
    amountDelta?: string;
    currency?: string;
    forensic?: ForensicContext;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO transaction_ledger
       (transaction_id, actor_id, event_type, previous_status, new_status,
        amount_delta, currency, ip_address, device_id, network_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      p.transactionId,
      p.actorId,
      p.eventType,
      p.previousStatus,
      p.newStatus,
      p.amountDelta ?? null,
      p.currency ?? null,
      p.forensic?.ip ?? null,
      p.forensic?.deviceId ?? null,
      p.forensic?.networkType ?? null,
    ],
  );
}

/**
 * Transition escrow to a new state with a ledger entry.
 * Uses SELECT FOR UPDATE (DB-02) to serialize concurrent access.
 */
async function transitionEscrow(
  client: PoolClient,
  p: {
    transactionId: string;
    to: EscrowState;
    actorId: string | null;
    eventType: LedgerEvent | null;
    forensic?: ForensicContext;
    amountDelta?: string;
    currency?: string;
  },
): Promise<EscrowRow> {
  // DB-02: explicit FOR UPDATE before any money mutation
  const { rows } = await client.query<EscrowRow>(
    `SELECT * FROM escrow_transactions WHERE transaction_id = $1 FOR UPDATE`,
    [p.transactionId],
  );

  const tx = rows[0];
  if (!tx) {
    throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
  }

  // Validate transition
  const ledgerEvent = p.eventType ?? validateTransition(tx.current_status, p.to);

  // Update state
  const updates: string[] = ["current_status = $1"];
  const params: unknown[] = [p.to];
  let paramIdx = 2;

  if (p.to === "AWAITING_DEPOSIT") {
    updates.push(`deposit_expires_at = $${paramIdx}`);
    params.push(new Date(Date.now() + DEPOSIT_WINDOW_MS));
    paramIdx++;
  }

  if (p.to === "SHIPPED") {
    updates.push(`dispute_closes_at = $${paramIdx}`);
    params.push(new Date(Date.now() + DISPUTE_WINDOW_MS));
    paramIdx++;
  }

  params.push(p.transactionId);
  await client.query(
    `UPDATE escrow_transactions SET ${updates.join(", ")} WHERE transaction_id = $${paramIdx}`,
    params,
  );

  // Append ledger entry (AUD-01)
  if (ledgerEvent) {
    await appendLedger(client, {
      transactionId: p.transactionId,
      actorId: p.actorId,
      eventType: ledgerEvent,
      previousStatus: tx.current_status,
      newStatus: p.to,
      amountDelta: p.amountDelta,
      currency: p.currency,
      forensic: p.forensic,
    });
  }

  // Re-fetch to get updated_at
  const { rows: updated } = await client.query<EscrowRow>(
    `SELECT * FROM escrow_transactions WHERE transaction_id = $1`,
    [p.transactionId],
  );
  return updated[0]!;
}

// ─── Public API ──────────────────────────────────────────────

export async function createEscrow(p: {
  vendorId: string;
  itemDescription: string;
  amount: string;
  currency: string;
  deliveryTerms?: string;
  forensic?: ForensicContext;
}): Promise<EscrowRow> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<EscrowRow>(
      `INSERT INTO escrow_transactions (vendor_id, item_description, amount, currency, current_status)
       VALUES ($1, $2, $3, $4, 'LINK_CREATED')
       RETURNING *`,
      [p.vendorId, p.itemDescription, p.amount, p.currency],
    );

    const tx = rows[0]!;

    await appendLedger(client, {
      transactionId: tx.transaction_id,
      actorId: p.vendorId,
      eventType: "LINK_CREATED",
      previousStatus: null,
      newStatus: "LINK_CREATED",
      forensic: p.forensic,
    });

    await client.query("COMMIT");
    return tx;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getEscrow(transactionId: string): Promise<EscrowRow> {
  const { rows } = await getTransactionClient().then(async (client) => {
    try {
      return await client.query<EscrowRow>(
        `SELECT * FROM escrow_transactions WHERE transaction_id = $1`,
        [transactionId],
      );
    } finally {
      client.release();
    }
  });

  const tx = rows[0];
  if (!tx) {
    throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
  }
  return tx;
}

export async function shipEscrow(p: {
  transactionId: string;
  vendorId: string;
  forensic?: ForensicContext;
}): Promise<EscrowRow> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");
    const tx = await transitionEscrow(client, {
      transactionId: p.transactionId,
      to: "SHIPPED",
      actorId: p.vendorId,
      eventType: null,
      forensic: p.forensic,
    });
    await client.query("COMMIT");
    return tx;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof InvalidTransitionError) {
      throw new AppError(409, `Cannot ship: transaction is not in FUNDS_SECURED`, "INVALID_STATE_TRANSITION");
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function confirmDelivery(p: {
  transactionId: string;
  buyerId: string;
  forensic?: ForensicContext;
}): Promise<EscrowRow> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");
    const tx = await transitionEscrow(client, {
      transactionId: p.transactionId,
      to: "DELIVERED_CONFIRMED",
      actorId: p.buyerId,
      eventType: null,
      forensic: p.forensic,
    });
    await client.query("COMMIT");
    return tx;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof InvalidTransitionError) {
      throw new AppError(409, `Cannot confirm delivery: transaction is not SHIPPED`, "INVALID_STATE_TRANSITION");
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelEscrow(p: {
  transactionId: string;
  vendorId: string;
  forensic?: ForensicContext;
}): Promise<EscrowRow> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");
    const tx = await transitionEscrow(client, {
      transactionId: p.transactionId,
      to: "CANCELLED",
      actorId: p.vendorId,
      eventType: null,
      forensic: p.forensic,
    });
    await client.query("COMMIT");
    return tx;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof InvalidTransitionError) {
      throw new AppError(409, `Cannot cancel: transaction is not in LINK_CREATED`, "INVALID_STATE_TRANSITION");
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Initiate deposit — buyer claims the escrow link and triggers USSD push.
 * LINK_CREATED → AWAITING_DEPOSIT, then calls PaymentRail.initiateDeposit().
 * Returns 202 {collectionRef, status} per 18-API-Reference.md §2.
 */
export async function initiateDeposit(p: {
  transactionId: string;
  buyerId: string;
  msisdn: string;
  carrier: Carrier;
  forensic?: ForensicContext;
}): Promise<{ collectionRef: string; status: "PENDING"; tx: EscrowRow }> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    // DB-02: FOR UPDATE before state mutation
    const { rows } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1 FOR UPDATE`,
      [p.transactionId],
    );

    const tx = rows[0];
    if (!tx) {
      throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
    }

    // Set buyer and transition
    await client.query(
      `UPDATE escrow_transactions SET buyer_id = $1, current_status = 'AWAITING_DEPOSIT',
       deposit_expires_at = NOW() + INTERVAL '24 hours'
       WHERE transaction_id = $2`,
      [p.buyerId, p.transactionId],
    );

    // Append ledger entry (AUD-01)
    await appendLedger(client, {
      transactionId: p.transactionId,
      actorId: p.buyerId,
      eventType: "BUYER_CLAIMED",
      previousStatus: tx.current_status,
      newStatus: "AWAITING_DEPOSIT",
      forensic: p.forensic,
    });

    await client.query("COMMIT");

    // Call PaymentRail outside the transaction
    const amount: Money = { amount: tx.amount, currency: tx.currency as Money["currency"] };
    const { providerRef } = await paymentRail.initiateDeposit({
      transactionId: p.transactionId,
      msisdn: p.msisdn,
      amount,
      carrier: p.carrier,
    });

    // Re-fetch
    const { rows: updated } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1`,
      [p.transactionId],
    );

    return {
      collectionRef: providerRef,
      status: "PENDING",
      tx: updated[0]!,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof InvalidTransitionError) {
      throw new AppError(409, `Cannot initiate deposit: transaction is not LINK_CREATED`, "INVALID_STATE_TRANSITION");
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Process a deposit webhook (AWAITING_DEPOSIT → FUNDS_SECURED).
 * Triple defense against double-spend (12-Webhooks-and-Idempotency.md §6):
 *   1. Redis SETNX (handled by caller)
 *   2. SELECT FOR UPDATE row lock (here)
 *   3. Partial unique index idx_single_deposit_per_transaction (DB backstop)
 *
 * DB-04: error 23505 treated as safe duplicate.
 */
export async function processDepositWebhook(p: {
  transactionId: string;
  forensic?: ForensicContext;
}): Promise<EscrowRow> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    // DB-02: FOR UPDATE before money mutation
    const { rows } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1 FOR UPDATE`,
      [p.transactionId],
    );

    const tx = rows[0];
    if (!tx) {
      throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
    }

    // Check if already secured (idempotent — gate 2)
    if (tx.current_status === "FUNDS_SECURED") {
      await client.query("ROLLBACK");
      return tx;
    }

    // Validate transition
    validateTransition(tx.current_status, "FUNDS_SECURED");

    // Update to FUNDS_SECURED
    await client.query(
      `UPDATE escrow_transactions SET current_status = 'FUNDS_SECURED' WHERE transaction_id = $1`,
      [p.transactionId],
    );

    // Append ledger entry (AUD-01)
    await appendLedger(client, {
      transactionId: p.transactionId,
      actorId: null, // System/AI
      eventType: "FUNDS_DEPOSITED",
      previousStatus: tx.current_status,
      newStatus: "FUNDS_SECURED",
      amountDelta: tx.amount,
      currency: tx.currency,
      forensic: p.forensic,
    });

    await client.query("COMMIT");

    // Re-fetch
    const { rows: updated } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1`,
      [p.transactionId],
    );
    return updated[0]!;
  } catch (err: unknown) {
    await client.query("ROLLBACK");

    // DB-04: trap 23505 (partial unique index) — safe duplicate
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      const { rows } = await client.query<EscrowRow>(
        `SELECT * FROM escrow_transactions WHERE transaction_id = $1`,
        [p.transactionId],
      );
      return rows[0]!;
    }

    if (err instanceof InvalidTransitionError) {
      throw new AppError(409, `Cannot secure funds: transaction is not AWAITING_DEPOSIT`, "INVALID_STATE_TRANSITION");
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Release funds to vendor (MONEY-01: pay then ledger).
 *
 * Flow:
 * 1. Validate state (must be DELIVERED_CONFIRMED)
 * 2. Calculate commission
 * 3. Call CustodyProvider.releaseTo() — external payout
 * 4. On SUCCESS: write ledger + update state + record payout row (one DB txn)
 * 5. On FAILED: record failed payout, do NOT write release ledger
 *
 * Uses idx_single_success_payout to prevent double-release.
 */
export async function releaseFunds(p: {
  transactionId: string;
  forensic?: ForensicContext;
}): Promise<EscrowRow> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    // DB-02: FOR UPDATE before money mutation
    const { rows } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1 FOR UPDATE`,
      [p.transactionId],
    );

    const tx = rows[0];
    if (!tx) {
      throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
    }

    // Validate transition
    validateTransition(tx.current_status, "FUNDS_RELEASED");

    // Commission from the market's fee schedule, in exact pesewas (FIN-01)
  const { commission, vendorNet } = calculateFees(
    tx.amount,
    feeRatesFor(env.FEE_SCHEDULE, tx.currency),
  );

  // DB-04: Trap 23505 — idx_single_success_payout prevents double-release
  try {
    // Record payout INITIATED
    await client.query(
      `INSERT INTO payouts (transaction_id, direction, recipient_msisdn, amount, currency, status)
       VALUES ($1, 'RELEASE', 'unknown', $2, $3, 'INITIATED')`,
      [p.transactionId, vendorNet, tx.currency],
    );
  } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        // Already released — idempotent return
        await client.query("ROLLBACK");
        return tx;
      }
      throw err;
    }

    // MONEY-01: Call CustodyProvider.releaseTo() BEFORE ledger write
    const amount: Money = { amount: tx.amount, currency: tx.currency as Money["currency"] };
    const commissionMoney: Money = { amount: commission, currency: tx.currency as Money["currency"] };

    const result = await custodyProvider.releaseTo({
      transactionId: p.transactionId,
      vendorMsisdn: "unknown", // placeholder until user auth
      amount,
      commission: commissionMoney,
    });

    if (result.status === "SUCCESS") {
      // Update payout row to SUCCESS
      await client.query(
        `UPDATE payouts SET status = 'SUCCESS', provider_ref = $1 WHERE transaction_id = $2 AND direction = 'RELEASE' AND status = 'INITIATED'`,
        [result.providerRef, p.transactionId],
      );

      // Transition state
      await client.query(
        `UPDATE escrow_transactions SET current_status = 'FUNDS_RELEASED' WHERE transaction_id = $1`,
        [p.transactionId],
      );

      // Append ledger entry (AUD-01) — amount_delta is the full amount (negative = outflow)
      await appendLedger(client, {
        transactionId: p.transactionId,
        actorId: null, // System
        eventType: "FUNDS_RELEASED",
        previousStatus: tx.current_status,
        newStatus: "FUNDS_RELEASED",
        amountDelta: `-${tx.amount}`,
        currency: tx.currency,
        forensic: p.forensic,
      });
    } else {
      // Payout failed — update payout row, do NOT write release ledger
      await client.query(
        `UPDATE payouts SET status = 'FAILED', failure_reason = $1 WHERE transaction_id = $2 AND direction = 'RELEASE' AND status = 'INITIATED'`,
        [result.failureReason ?? "Unknown error", p.transactionId],
      );

      // Append PAYOUT_FAILED ledger entry
      await appendLedger(client, {
        transactionId: p.transactionId,
        actorId: null,
        eventType: "PAYOUT_FAILED",
        previousStatus: tx.current_status,
        newStatus: tx.current_status, // State doesn't change on failed payout
        forensic: p.forensic,
      });
    }

    await client.query("COMMIT");

    // Re-fetch
    const { rows: updated } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1`,
      [p.transactionId],
    );
    return updated[0]!;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof InvalidTransitionError) {
      throw new AppError(409, `Cannot release funds: transaction is not DELIVERED_CONFIRMED`, "INVALID_STATE_TRANSITION");
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Refund funds to buyer (MONEY-01: pay then ledger).
 *
 * Flow:
 * 1. Validate state (must be RESOLVED_AUTO or UNDER_HUMAN_REVIEW)
 * 2. Call CustodyProvider.refundTo() — external refund
 * 3. On SUCCESS: write ledger + update state + record payout row (one DB txn)
 * 4. On FAILED: record failed payout, do NOT write refund ledger
 */
export async function refundFunds(p: {
  transactionId: string;
  forensic?: ForensicContext;
}): Promise<EscrowRow> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    // DB-02: FOR UPDATE before money mutation
    const { rows } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1 FOR UPDATE`,
      [p.transactionId],
    );

    const tx = rows[0];
    if (!tx) {
      throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
    }

    // Validate transition
    validateTransition(tx.current_status, "FUNDS_REFUNDED");

    // Record payout INITIATED
    try {
      await client.query(
        `INSERT INTO payouts (transaction_id, direction, recipient_msisdn, amount, currency, status)
         VALUES ($1, 'REFUND', 'unknown', $2, $3, 'INITIATED')`,
        [p.transactionId, tx.amount, tx.currency],
      );
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        await client.query("ROLLBACK");
        return tx;
      }
      throw err;
    }

    // MONEY-01: Call CustodyProvider.refundTo() BEFORE ledger write
    const amount: Money = { amount: tx.amount, currency: tx.currency as Money["currency"] };

    const result = await custodyProvider.refundTo({
      transactionId: p.transactionId,
      buyerMsisdn: "unknown", // placeholder until user auth
      amount,
    });

    if (result.status === "SUCCESS") {
      await client.query(
        `UPDATE payouts SET status = 'SUCCESS', provider_ref = $1 WHERE transaction_id = $2 AND direction = 'REFUND' AND status = 'INITIATED'`,
        [result.providerRef, p.transactionId],
      );

      await client.query(
        `UPDATE escrow_transactions SET current_status = 'FUNDS_REFUNDED' WHERE transaction_id = $1`,
        [p.transactionId],
      );

      await appendLedger(client, {
        transactionId: p.transactionId,
        actorId: null,
        eventType: "REFUND_ISSUED",
        previousStatus: tx.current_status,
        newStatus: "FUNDS_REFUNDED",
        amountDelta: `-${tx.amount}`,
        currency: tx.currency,
        forensic: p.forensic,
      });
    } else {
      await client.query(
        `UPDATE payouts SET status = 'FAILED', failure_reason = $1 WHERE transaction_id = $2 AND direction = 'REFUND' AND status = 'INITIATED'`,
        [result.failureReason ?? "Unknown error", p.transactionId],
      );

      await appendLedger(client, {
        transactionId: p.transactionId,
        actorId: null,
        eventType: "PAYOUT_FAILED",
        previousStatus: tx.current_status,
        newStatus: tx.current_status,
        forensic: p.forensic,
      });
    }

    await client.query("COMMIT");

    const { rows: updated } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1`,
      [p.transactionId],
    );
    return updated[0]!;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof InvalidTransitionError) {
      throw new AppError(409, `Cannot refund: transaction is not in RESOLVED_AUTO or UNDER_HUMAN_REVIEW`, "INVALID_STATE_TRANSITION");
    }
    throw err;
  } finally {
    client.release();
  }
}
