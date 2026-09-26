import crypto from "node:crypto";
import { getTransactionClient, pool } from "../db/pool.js";
import { AppError } from "../middleware/error-handler.js";
import { logger } from "../config/logger.js";
import { compareAmounts, sumAmounts } from "./money.js";

export type KycTier = 0 | 1 | 2;

export const KYC_LIMITS: Record<KycTier, { perTransaction: string; daily: string }> = {
  0: { perTransaction: "500.00", daily: "1000.00" },
  1: { perTransaction: "5000.00", daily: "10000.00" },
  2: { perTransaction: "50000.00", daily: "100000.00" },
};

const VALID_ID_TYPES = ["NATIONAL_ID", "PASSPORT", "VOTER_ID"] as const;

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function checkTierLimit(
  userId: string,
  amount: string,
  currency: string,
): Promise<{ allowed: boolean; currentTier: number }> {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<{ kyc_tier: number; is_frozen: boolean }>(
      `SELECT kyc_tier, is_frozen FROM users WHERE user_id = $1`,
      [userId],
    );
    const user = rows[0];
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    if (user.is_frozen) {
      throw new AppError(403, "Account is frozen", "ACCOUNT_FROZEN");
    }

    if (currency !== "GHS") {
      throw new AppError(400, "KYC limits currently only support GHS (P0)", "KYC_LIMITS_GHS_ONLY_P0");
    }

    const tier = user.kyc_tier as KycTier;
    const perTxLimit = KYC_LIMITS[tier].perTransaction;
    const dailyLimit = KYC_LIMITS[tier].daily;

    // Compare amounts as NUMERIC(15,2) strings (FIN-01)
    if (compareAmounts(amount, perTxLimit) > 0) {
      throw new AppError(403, "Per-transaction limit exceeded for current tier", "KYC_LIMIT_EXCEEDED");
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { rows: dailyRows } = await client.query<{ daily_sum: string }>(
      // COALESCE to a NUMERIC(15,2)-shaped '0.00', never '0' (FIN-01, task.md T8.1)
      `SELECT COALESCE(SUM(amount), 0.00)::text AS daily_sum
       FROM escrow_transactions
       WHERE vendor_id = $1
         AND currency = $3
         AND created_at >= $2
         AND current_status NOT IN ('CANCELLED', 'EXPIRED', 'FUNDS_REFUNDED')`,
      [userId, todayStart, currency],
    );

    const dailySum = dailyRows[0]?.daily_sum ?? "0.00";
    const dailyPlusRequested = sumAmounts([dailySum, amount]);
    if (compareAmounts(dailyPlusRequested, dailyLimit) > 0) {
      throw new AppError(403, "Daily limit exceeded for current tier", "KYC_DAILY_LIMIT_EXCEEDED");
    }

    return { allowed: true, currentTier: tier };
  } finally {
    client.release();
  }
}

export async function submitKYC(
  userId: string,
  idType: string,
  idNumber: string,
): Promise<{ kycId: string }> {
  if (!(VALID_ID_TYPES as readonly string[]).includes(idType)) {
    throw new AppError(400, "Invalid ID type", "INVALID_ID_TYPE");
  }

  const idNumberHash = sha256Hex(idNumber);

  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows: userRows } = await client.query<{ kyc_tier: number }>(
      `SELECT kyc_tier FROM users WHERE user_id = $1`,
      [userId],
    );
    const user = userRows[0];
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    const nextTier = (user.kyc_tier + 1) as KycTier;
    const targetTier = nextTier <= 2 ? nextTier : 2;

    const { rows } = await client.query<{ kyc_id: string }>(
      `INSERT INTO kyc_records (user_id, tier, id_type, id_number_hash, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING kyc_id`,
      [userId, targetTier, idType, idNumberHash],
    );

    await client.query("COMMIT");
    logger.info({ kycId: rows[0].kyc_id, userId }, "KYC submission created");
    return { kycId: rows[0].kyc_id };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getKYCStatus(
  userId: string,
): Promise<{ tier: number; pendingSubmission?: string }> {
  const { rows: userRows } = await pool.query<{ kyc_tier: number }>(
    `SELECT kyc_tier FROM users WHERE user_id = $1`,
    [userId],
  );
  const user = userRows[0];
  if (!user) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  const { rows: kycRows } = await pool.query<{ kyc_id: string; status: string }>(
    `SELECT kyc_id, status
     FROM kyc_records
     WHERE user_id = $1
     ORDER BY
       CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`,
    [userId],
  );

  const latest = kycRows[0];
  return {
    tier: user.kyc_tier,
    pendingSubmission: latest?.status === "PENDING" ? latest.kyc_id : undefined,
  };
}

export async function reviewKYC(
  kycId: string,
  reviewerId: string,
  approved: boolean,
  _reason?: string,
): Promise<void> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      kyc_id: string;
      user_id: string;
      tier: number;
      status: string;
    }>(
      `SELECT kyc_id, user_id, tier, status
       FROM kyc_records
       WHERE kyc_id = $1
       FOR UPDATE`,
      [kycId],
    );

    const record = rows[0];
    if (!record) {
      throw new AppError(404, "KYC record not found", "KYC_NOT_FOUND");
    }

    if (record.status !== "PENDING") {
      throw new AppError(409, "KYC record has already been reviewed", "KYC_ALREADY_REVIEWED");
    }

    if (approved) {
      await client.query(
        `UPDATE kyc_records
         SET status = 'APPROVED', reviewed_by = $1, reviewed_at = NOW()
         WHERE kyc_id = $2`,
        [reviewerId, kycId],
      );

      await client.query(
        `UPDATE users SET kyc_tier = $1 WHERE user_id = $2`,
        [record.tier, record.user_id],
      );

      logger.info({ kycId, userId: record.user_id, tier: record.tier }, "KYC approved, tier upgraded");
    } else {
      await client.query(
        `UPDATE kyc_records
         SET status = 'REJECTED', reviewed_by = $1, reviewed_at = NOW()
         WHERE kyc_id = $2`,
        [reviewerId, kycId],
      );

      logger.info({ kycId, userId: record.user_id }, "KYC rejected");
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
