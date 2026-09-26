import { pool } from "../db/pool.js";
import { logger } from "../config/logger.js";

/**
 * Webhook inbox service (12-Webhooks-and-Idempotency.md §4, §7).
 *
 * Durable dedup that survives restarts:
 * 1. Redis SETNX fast gate (caller handles)
 * 2. INSERT INTO webhook_inbox ON CONFLICT DO NOTHING (here)
 * 3. SELECT FOR UPDATE + 23505 backstop in processDepositWebhook
 *
 * webhook_inbox is the durable record: a row stays unprocessed until its
 * money transaction commits. Failures are retried by the sweeper
 * (jobs/webhook-sweeper.ts) with backoff, then dead-lettered (task.md T6.1,
 * T6.2, T6.7).
 */

/** Attempts (inline + sweeper) before a webhook is dead-lettered. */
export const WEBHOOK_MAX_ATTEMPTS = 8;

/** Grace period so the sweeper does not race the inline handler for new rows. */
const INLINE_GRACE_SECONDS = 60;

export async function enqueueWebhook(p: {
  provider: string;
  providerRef: string;
  signatureValid: boolean;
  payload: unknown;
}): Promise<{ alreadyProcessed: boolean }> {
  const { rows } = await pool.query<{ webhook_id: string }>(
    `INSERT INTO webhook_inbox (provider, provider_ref, signature_valid, payload, next_attempt_at)
     VALUES ($1, $2, $3, $4, NOW() + make_interval(secs => $5))
     ON CONFLICT (provider, provider_ref) DO NOTHING
     RETURNING webhook_id`,
    [p.provider, p.providerRef, p.signatureValid, JSON.stringify(p.payload), INLINE_GRACE_SECONDS],
  );

  if (rows.length === 0) {
    logger.debug({ provider: p.provider, providerRef: p.providerRef }, "Webhook already in inbox (duplicate)");
    return { alreadyProcessed: true };
  }

  logger.info({ provider: p.provider, providerRef: p.providerRef, webhookId: rows[0].webhook_id }, "Webhook enqueued");
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
    `UPDATE webhook_inbox SET processed_at = NOW(), last_error = NULL
     WHERE provider = $1 AND provider_ref = $2 AND processed_at IS NULL`,
    [p.provider, p.providerRef],
  );
}

/**
 * Record a failed processing attempt. Schedules the next retry with
 * exponential backoff (1, 2, 4 … minutes, capped at 60) or dead-letters the
 * row once WEBHOOK_MAX_ATTEMPTS is reached. SET expressions read the old
 * `attempts` value.
 */
export async function recordWebhookFailure(p: {
  provider: string;
  providerRef: string;
  error: unknown;
}): Promise<{ attempts: number; deadLettered: boolean }> {
  const message = p.error instanceof Error ? p.error.message : String(p.error);
  const { rows } = await pool.query<{ attempts: number; dead_lettered_at: Date | null }>(
    `UPDATE webhook_inbox
     SET attempts = attempts + 1,
         last_error = left($3, 1000),
         dead_lettered_at = CASE WHEN attempts + 1 >= $4 THEN NOW() ELSE NULL END,
         next_attempt_at = NOW() + make_interval(mins => LEAST(power(2, attempts)::int, 60))
     WHERE provider = $1 AND provider_ref = $2 AND processed_at IS NULL
     RETURNING attempts, dead_lettered_at`,
    [p.provider, p.providerRef, message, WEBHOOK_MAX_ATTEMPTS],
  );
  const row = rows[0];
  return { attempts: row?.attempts ?? 0, deadLettered: Boolean(row?.dead_lettered_at) };
}

export type InboxRow = {
  webhook_id: string;
  provider: string;
  provider_ref: string;
  payload: unknown;
  attempts: number;
};

/**
 * Sweeper: unprocessed, not dead-lettered webhooks whose retry time has come.
 */
export async function getDueWebhooks(limit = 100): Promise<InboxRow[]> {
  const { rows } = await pool.query<InboxRow>(
    `SELECT webhook_id, provider, provider_ref, payload, attempts
     FROM webhook_inbox
     WHERE processed_at IS NULL
       AND dead_lettered_at IS NULL
       AND next_attempt_at <= NOW()
     ORDER BY next_attempt_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

/** Unprocessed, live webhooks older than `minutes` (alert signal, task.md T6.2). */
export async function countStaleWebhooks(minutes: number): Promise<number> {
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt
     FROM webhook_inbox
     WHERE processed_at IS NULL
       AND dead_lettered_at IS NULL
       AND created_at < NOW() - make_interval(mins => $1)`,
    [minutes],
  );
  return parseInt(rows[0]?.cnt ?? "0", 10);
}
