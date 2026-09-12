import { getTransactionClient } from "../db/pool.js";
import { AppError } from "../middleware/error-handler.js";
import { logger } from "../config/logger.js";
import { custodyProvider } from "../providers/index.js";
import type { Currency, EscrowState, LedgerEvent } from "../types/domain.js";

type DisputeQueueRow = {
  dispute_id: string;
  transaction_id: string;
  amount: string;
  currency: string;
  reason_code: string;
  status: string;
  created_at: Date;
  priority: number;
};

type KycQueueRow = {
  kyc_id: string;
  user_id: string;
  phone_number: string;
  tier: number;
  id_type: string;
  status: string;
  created_at: Date;
};

export async function requireRole(
  userId: string,
  allowedRoles: string[],
): Promise<{ userId: string; role: string }> {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<{ role: string }>(
      `SELECT role FROM users WHERE user_id = $1`,
      [userId],
    );

    const user = rows[0];
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
    }

    return { userId, role: user.role };
  } finally {
    client.release();
  }
}

export async function getDisputeQueue(
  limit: number = 50,
): Promise<Array<{
  disputeId: string;
  transactionId: string;
  amount: string;
  currency: string;
  reasonCode: string;
  status: string;
  createdAt: Date;
  priority: number;
}>> {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<DisputeQueueRow>(
      `SELECT
         dc.dispute_id,
         dc.transaction_id,
         et.amount,
         et.currency,
         dc.reason_code,
         dc.status,
         dc.created_at,
         (et.amount::numeric - EXTRACT(EPOCH FROM (NOW() - dc.created_at)) / 3600)::int AS priority
       FROM dispute_cases dc
       JOIN escrow_transactions et ON et.transaction_id = dc.transaction_id
       WHERE dc.status = 'UNDER_HUMAN_REVIEW'
       ORDER BY priority DESC
       LIMIT $1`,
      [limit],
    );

    return rows.map((row) => ({
      disputeId: row.dispute_id,
      transactionId: row.transaction_id,
      amount: row.amount,
      currency: row.currency,
      reasonCode: row.reason_code,
      status: row.status,
      createdAt: row.created_at,
      priority: row.priority,
    }));
  } finally {
    client.release();
  }
}

export async function resolveDispute(
  disputeId: string,
  reviewerId: string,
  action: "REFUND_BUYER" | "RELEASE_VENDOR",
  reason: string,
): Promise<{ newStatus: string }> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows: disputeRows } = await client.query<{
      dispute_id: string;
      transaction_id: string;
      status: string;
      reason_code: string;
    }>(
      `SELECT dispute_id, transaction_id, status, reason_code
       FROM dispute_cases
       WHERE dispute_id = $1
       FOR UPDATE`,
      [disputeId],
    );

    const dispute = disputeRows[0];
    if (!dispute) {
      throw new AppError(404, "Dispute not found", "DISPUTE_NOT_FOUND");
    }

    if (dispute.status !== "UNDER_HUMAN_REVIEW") {
      throw new AppError(
        409,
        `Cannot resolve dispute: status is ${dispute.status} (must be UNDER_HUMAN_REVIEW)`,
        "INVALID_STATE_TRANSITION",
      );
    }

    const { rows: escrowRows } = await client.query<{
      transaction_id: string;
      current_status: EscrowState;
      amount: string;
      currency: string;
    }>(
      `SELECT transaction_id, current_status, amount, currency
       FROM escrow_transactions
       WHERE transaction_id = $1
       FOR UPDATE`,
      [dispute.transaction_id],
    );

    const escrow = escrowRows[0];
    if (!escrow) {
      throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
    }

    let newEscrowStatus: EscrowState;
    let ledgerEvent: LedgerEvent;

    if (action === "RELEASE_VENDOR") {
      newEscrowStatus = "FUNDS_RELEASED";
      ledgerEvent = "FUNDS_RELEASED";
    } else {
      newEscrowStatus = "FUNDS_REFUNDED";
      ledgerEvent = "REFUND_ISSUED";
    }

    await client.query(
      `UPDATE escrow_transactions SET current_status = $1 WHERE transaction_id = $2`,
      [newEscrowStatus, dispute.transaction_id],
    );

    await client.query(
      `INSERT INTO transaction_ledger
         (transaction_id, actor_id, event_type, previous_status, new_status,
          amount_delta, currency, device_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        dispute.transaction_id,
        reviewerId,
        ledgerEvent,
        escrow.current_status,
        newEscrowStatus,
        action === "RELEASE_VENDOR" ? `-${escrow.amount}` : `-${escrow.amount}`,
        escrow.currency,
        JSON.stringify({ reason }),
      ],
    );

    await client.query(
      `UPDATE dispute_cases SET status = 'RESOLVED_AUTO', resolved_at = NOW() WHERE dispute_id = $1`,
      [disputeId],
    );

    await client.query("COMMIT");

    logger.info(
      { disputeId, reviewerId, action, newEscrowStatus },
      "Dispute resolved by reviewer",
    );

    return { newStatus: newEscrowStatus };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function freezeUser(
  userId: string,
  frozen: boolean,
  reason: string,
  adminId: string,
): Promise<{ isFrozen: boolean }> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ user_id: string }>(
      `SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );

    if (!rows[0]) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    await client.query(
      `UPDATE users SET is_frozen = $1 WHERE user_id = $2`,
      [frozen, userId],
    );

    await client.query(
      `INSERT INTO transaction_ledger
         (transaction_id, actor_id, event_type, previous_status, new_status, device_metadata)
       VALUES (NULL, $1, 'FRAUD_FLAGGED', NULL, NULL, $2)`,
      [adminId, JSON.stringify({ reason, action: frozen ? "FREEZE" : "UNFREEZE" })],
    );

    await client.query("COMMIT");

    logger.info({ userId, frozen, adminId }, "User freeze state updated");

    return { isFrozen: frozen };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function adjustTrustScore(
  userId: string,
  newScore: number,
  reason: string,
  adminId: string,
): Promise<{ trustScore: string }> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ user_id: string }>(
      `SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );

    if (!rows[0]) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    await client.query(
      `UPDATE users SET trust_score = $1 WHERE user_id = $2`,
      [newScore, userId],
    );

    await client.query(
      `INSERT INTO transaction_ledger
         (transaction_id, actor_id, event_type, previous_status, new_status, device_metadata)
       VALUES (NULL, $1, 'FRAUD_FLAGGED', NULL, NULL, $2)`,
      [adminId, JSON.stringify({ reason, trustScore: newScore })],
    );

    await client.query("COMMIT");

    logger.info({ userId, newScore, adminId }, "Trust score adjusted");

    return { trustScore: newScore.toFixed(2) };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getReconciliationReport(
  from: string,
  to: string,
): Promise<{
  summary: {
    totalDeposited: string;
    totalReleased: string;
    totalRefunded: string;
    netHeld: string;
  };
  custodyAccounts: Array<{
    provider: string;
    currency: string;
    balance: string;
  }>;
}> {
  const client = await getTransactionClient();
  try {
    const { rows: ledgerRows } = await client.query<{
      event_type: string;
      total: string;
    }>(
      `SELECT event_type, COALESCE(SUM(ABS(amount_delta)), 0)::text AS total
       FROM transaction_ledger
       WHERE created_at >= $1 AND created_at <= $2
         AND event_type IN ('FUNDS_DEPOSITED', 'FUNDS_RELEASED', 'REFUND_ISSUED')
       GROUP BY event_type`,
      [from, to],
    );

    const totals: Record<string, string> = {};
    for (const row of ledgerRows) {
      totals[row.event_type] = row.total;
    }

    const deposited = parseFloat(totals["FUNDS_DEPOSITED"] ?? "0");
    const released = parseFloat(totals["FUNDS_RELEASED"] ?? "0");
    const refunded = parseFloat(totals["REFUND_ISSUED"] ?? "0");

    const { rows: accountRows } = await client.query<{ provider: string; currency: string }>(
      `SELECT DISTINCT provider, currency FROM custody_accounts WHERE is_active = true`,
    );

    const custodyAccounts = await Promise.all(
      accountRows.map(async (row) => ({
        provider: row.provider,
        currency: row.currency,
        balance: (await custodyProvider.getBalance(row.currency as Currency)).amount,
      })),
    );

    return {
      summary: {
        totalDeposited: deposited.toFixed(2),
        totalReleased: released.toFixed(2),
        totalRefunded: refunded.toFixed(2),
        netHeld: (deposited - released - refunded).toFixed(2),
      },
      custodyAccounts,
    };
  } finally {
    client.release();
  }
}

export async function getKYCQueue(): Promise<Array<{
  kycId: string;
  userId: string;
  phoneNumber: string;
  tier: number;
  idType: string;
  status: string;
  createdAt: Date;
}>> {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<KycQueueRow>(
      `SELECT
         k.kyc_id,
         k.user_id,
         u.phone_number,
         k.tier,
         k.id_type,
         k.status,
         k.created_at
       FROM kyc_records k
       JOIN users u ON u.user_id = k.user_id
       WHERE k.status = 'PENDING'
       ORDER BY k.created_at ASC`,
    );

    return rows.map((row) => ({
      kycId: row.kyc_id,
      userId: row.user_id,
      phoneNumber: row.phone_number,
      tier: row.tier,
      idType: row.id_type,
      status: row.status,
      createdAt: row.created_at,
    }));
  } finally {
    client.release();
  }
}
