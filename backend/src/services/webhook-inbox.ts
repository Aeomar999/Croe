import { pool } from "../db/pool.js";
import { logger } from "../config/logger.js";

/**
 * Webhook inbox service (12-Webhooks-and-Idempotency.md §4).
 *
 * Durable dedup that survives restarts:
 * 1. Redis SETNX fast gate (caller handles)
 * 2. INSERT INTO webhook_inbox ON CONFLICT DO NOTHING (here)
 * 3. SELECT FOR UPDATE + 23505 backstop in processDepositWebhook
 *
 * The processed_at column is left NULL for a sweeper job to pick up
 * on restart if a worker crashes mid-process (§7).
 */
export async function enqueueWebhook(p: {
  provider: string;
  providerRef: string;
  transactionId: string;
  payload: unknown;
  headers: Record<string, string>;
}): Promise<{ alreadyProcessed: boolean }> {
  const { rows } = await pool.query<{ inbox_id: number }>(
    `INSERT INTO webhook_inbox (provider, provider_ref, transaction_id, payload, headers)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider, provider_ref) DO NOTHING
     RETURNING inbox_id`,
    [p.provider, p.providerRef, p.transactionId, JSON.stringify(p.payload), JSON.stringify(p.headers)],
  );

  if (rows.length === 0) {
    logger.debug({ provider: p.provider, providerRef: p.providerRef }, "Webhook already in inbox (duplicate)");
    return { alreadyProcessed: true };
  }

  logger.info({ provider: p.provider, providerRef: p.providerRef, inboxId: rows[0].inbox_id }, "Webhook enqueued");
  return { alreadyProcessed: false };
}

/**
 * Mark a webhook as processed (called after successful money transaction).
 */
export async function markWebhookProcessed(p: {
  provider: string;
  providerRef: string;
}): Promise<void> {
  await pool.query(
    `UPDATE webhook_inbox SET processed_at = NOW()
     WHERE provider = $1 AND provider_ref = $2 AND processed_at IS NULL`,
    [p.provider, p.providerRef],
  );
}

/**
 * Sweeper: re-process unprocessed webhooks (for crash recovery).
 * Returns unprocessed rows that need reprocessing.
 */
export async function getUnprocessedWebhooks(): Promise<
  Array<{
    inbox_id: number;
    provider: string;
    provider_ref: string;
    transaction_id: string;
    payload: unknown;
  }>
> {
  const { rows } = await pool.query<{
    inbox_id: number;
    provider: string;
    provider_ref: string;
    transaction_id: string;
    payload: unknown;
  }>(
    `SELECT inbox_id, provider, provider_ref, transaction_id, payload
     FROM webhook_inbox
     WHERE processed_at IS NULL
     ORDER BY created_at ASC
     LIMIT 100`,
  );
  return rows;
}
