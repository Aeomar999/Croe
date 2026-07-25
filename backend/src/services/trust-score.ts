import { getTransactionClient } from "../db/pool.js";
import { logger } from "../config/logger.js";

export type TrustAdjustment = { delta: number; reason: string; userId: string };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function appendLedgerAudit(
  client: import("pg").PoolClient,
  p: {
    transactionId?: string;
    actorId: string;
    reason: string;
    ip?: string;
    deviceId?: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO transaction_ledger
       (transaction_id, actor_id, event_type, previous_status, new_status,
        device_metadata, ip_address, device_id)
     VALUES ($1, $2, 'FRAUD_FLAGGED', 'TRUST_ADJUSTED', 'TRUST_ADJUSTED', $3, $4, $5)`,
    [
      p.transactionId ?? null,
      p.actorId,
      JSON.stringify({ reason: p.reason }),
      p.ip ?? null,
      p.deviceId ?? null,
    ],
  );
}

export async function adjustTrustScore(
  userId: string,
  delta: number,
  reason: string,
  auditContext?: { transactionId?: string; ip?: string; deviceId?: string },
): Promise<{ newScore: number; frozen: boolean }> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT trust_score, is_frozen FROM users WHERE user_id = $1 FOR UPDATE",
      [userId],
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("User not found");
    }

    const currentScore = Number(rows[0].trust_score);
    const isFrozen: boolean = rows[0].is_frozen;
    const newScore = clamp(currentScore + delta, 0, 100);

    await client.query(
      "UPDATE users SET trust_score = $1, updated_at = NOW() WHERE user_id = $2",
      [newScore, userId],
    );

    let frozen = isFrozen;

    if (newScore < 20 && !isFrozen) {
      await client.query(
        "UPDATE users SET is_frozen = true WHERE user_id = $1",
        [userId],
      );
      frozen = true;

      await appendLedgerAudit(client, {
        transactionId: auditContext?.transactionId,
        actorId: userId,
        reason: `AUTO_FREEZE: trust_score ${currentScore} -> ${newScore}`,
        ip: auditContext?.ip,
        deviceId: auditContext?.deviceId,
      });
    }

    await appendLedgerAudit(client, {
      transactionId: auditContext?.transactionId,
      actorId: userId,
      reason: `${reason}: ${currentScore} -> ${newScore} (delta ${delta})`,
      ip: auditContext?.ip,
      deviceId: auditContext?.deviceId,
    });

    await client.query("COMMIT");

    logger.info({ userId, delta, reason, newScore, frozen }, "Trust score adjusted");

    return { newScore, frozen };
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (e.code === "23505") return { newScore: 0, frozen: false };
    throw e;
  } finally {
    client.release();
  }
}

export async function freezeUser(
  userId: string,
  reason: string,
  auditContext?: { transactionId?: string; ip?: string; deviceId?: string },
): Promise<void> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT is_frozen FROM users WHERE user_id = $1 FOR UPDATE",
      [userId],
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("User not found");
    }

    if (rows[0].is_frozen) {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      "UPDATE users SET is_frozen = true WHERE user_id = $1",
      [userId],
    );

    await appendLedgerAudit(client, {
      transactionId: auditContext?.transactionId,
      actorId: userId,
      reason: `MANUAL_FREEZE: ${reason}`,
      ip: auditContext?.ip,
      deviceId: auditContext?.deviceId,
    });

    await client.query("COMMIT");

    logger.info({ userId, reason }, "User frozen");
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (e.code === "23505") return;
    throw e;
  } finally {
    client.release();
  }
}

export async function unfreezeUser(
  userId: string,
  reason: string,
  reviewerId: string,
): Promise<{ trustScore: number }> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT trust_score, is_frozen FROM users WHERE user_id = $1 FOR UPDATE",
      [userId],
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("User not found");
    }

    let trustScore = Number(rows[0].trust_score);

    if (!rows[0].is_frozen) {
      await client.query("COMMIT");
      return { trustScore };
    }

    if (trustScore < 50) {
      trustScore = 50;
      await client.query(
        "UPDATE users SET trust_score = $1, updated_at = NOW() WHERE user_id = $2",
        [50, userId],
      );
    }

    await client.query(
      "UPDATE users SET is_frozen = false WHERE user_id = $1",
      [userId],
    );

    await appendLedgerAudit(client, {
      actorId: userId,
      reason: `UNFREEZE by ${reviewerId}: ${reason}. trust_score restored to ${trustScore}`,
    });

    await client.query("COMMIT");

    logger.info({ userId, reviewerId, reason, trustScore }, "User unfrozen");

    return { trustScore };
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (e.code === "23505") return { trustScore: 0 };
    throw e;
  } finally {
    client.release();
  }
}

export async function adjustSuccessfulTransaction(
  userId: string,
  transactionId: string,
): Promise<{ newScore: number }> {
  const { newScore } = await adjustTrustScore(
    userId,
    +1,
    "Successful released transaction",
    { transactionId },
  );
  return { newScore };
}

export async function isUserFrozen(userId: string): Promise<boolean> {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query(
      "SELECT is_frozen FROM users WHERE user_id = $1",
      [userId],
    );

    if (rows.length === 0) {
      throw new Error("User not found");
    }

    return rows[0].is_frozen as boolean;
  } finally {
    client.release();
  }
}
