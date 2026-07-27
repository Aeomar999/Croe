/**
 * Data retention job — purge old notifications, messages, and expired sessions.
 * Skips records tied to active disputes.
 *
 * 23-Observability-and-Reconciliation.md §1.
 * Rule: Never delete from transaction_ledger (AUD-01).
 */
import { pool } from "../db/pool.js";
import { logger } from "../config/logger.js";
import { alertDiskRetentionFailure } from "../services/alerting.js";

export interface RetentionResult {
  timestamp: string;
  deleted: {
    notifications: number;
    messages: number;
    sessions: number;
  };
  skipped: number;
}

export async function runRetentionPurge(): Promise<RetentionResult> {
  logger.info("Starting data retention purge");

  const client = await pool.connect();
  let totalSkipped = 0;

  const deleted = { notifications: 0, messages: 0, sessions: 0 };

  try {
    await client.query("BEGIN");

    // ── 1. Delete notifications older than 30 days (skip if linked to active dispute) ──
    const { rowCount: notifRows } = await client.query(
      `DELETE FROM notifications
       WHERE created_at < NOW() - INTERVAL '30 days'
         AND NOT EXISTS (
           SELECT 1 FROM dispute_cases dc
           WHERE dc.transaction_id = notifications.transaction_id
             AND dc.status IN ('DISPUTE_OPENED', 'AI_PROCESSING', 'UNDER_HUMAN_REVIEW')
         )`,
    );
    deleted.notifications = notifRows ?? 0;

    // ── 2. Delete chat messages older than 90 days (skip disputed) ──
    const { rowCount: msgRows } = await client.query(
      `DELETE FROM messages
       WHERE created_at < NOW() - INTERVAL '90 days'
         AND NOT EXISTS (
           SELECT 1 FROM dispute_cases dc
           WHERE dc.transaction_id = messages.transaction_id
             AND dc.status IN ('DISPUTE_OPENED', 'AI_PROCESSING', 'UNDER_HUMAN_REVIEW')
         )`,
    );
    deleted.messages = msgRows ?? 0;

    // ── 3. Delete expired sessions ──
    const { rowCount: sessionRows } = await client.query(
      `DELETE FROM sessions WHERE expires_at < NOW()`,
    );
    deleted.sessions = sessionRows ?? 0;

    // ── 4. Count skipped (disputed records that match retention age) ──
    const { rows: skippedRows } = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM notifications n
       WHERE n.created_at < NOW() - INTERVAL '30 days'
         AND EXISTS (
           SELECT 1 FROM dispute_cases dc
           WHERE dc.transaction_id = n.transaction_id
             AND dc.status IN ('DISPUTE_OPENED', 'AI_PROCESSING', 'UNDER_HUMAN_REVIEW')
         )`,
    );
    totalSkipped = parseInt(skippedRows[0]?.cnt ?? "0", 10);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Retention purge failed");
    throw err;
  } finally {
    client.release();
  }

  if (totalSkipped > 0) {
    alertDiskRetentionFailure(totalSkipped);
  }

  const total = deleted.notifications + deleted.messages + deleted.sessions;
  logger.info(
    { deleted, skipped: totalSkipped, total },
    "Retention purge completed",
  );

  return {
    timestamp: new Date().toISOString(),
    deleted,
    skipped: totalSkipped,
  };
}
