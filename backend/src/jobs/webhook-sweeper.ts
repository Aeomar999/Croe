/**
 * Webhook inbox sweeper (12-Webhooks-and-Idempotency.md §7, task.md T6.2).
 *
 * Re-runs webhooks whose processing failed or was interrupted (processed_at
 * still NULL) once their backoff has elapsed, through the same code path as
 * the webhook route. Runs under a PostgreSQL advisory lock so only one
 * instance sweeps at a time. Alerts on rows stuck for more than 15 minutes;
 * dead-lettered rows alert individually (T6.7).
 */
import { pool } from "../db/pool.js";
import { logger } from "../config/logger.js";
import { paymentRail } from "../providers/index.js";
import { countStaleWebhooks, getDueWebhooks, markWebhookProcessed } from "../services/webhook-inbox.js";
import { applyWebhook, handleWebhookFailure } from "../services/webhook-processor.js";
import { alertStaleWebhooks, clearAlert } from "../services/alerting.js";

/** Arbitrary, stable key for pg_try_advisory_lock ("CROE" + 1). */
export const WEBHOOK_SWEEPER_LOCK_KEY = 0x43524f45_01;

export const STALE_WEBHOOK_MINUTES = 15;

export interface WebhookSweepResult {
  skipped: boolean;
  processed: number;
  failed: number;
  stale: number;
}

export async function runWebhookSweeper(): Promise<WebhookSweepResult> {
  const lockClient = await pool.connect();
  let locked = false;
  try {
    const { rows } = await lockClient.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [WEBHOOK_SWEEPER_LOCK_KEY],
    );
    locked = rows[0]?.locked === true;
    if (!locked) {
      return { skipped: true, processed: 0, failed: 0, stale: 0 };
    }

    let processed = 0;
    let failed = 0;
    for (const row of await getDueWebhooks()) {
      try {
        const parsed = paymentRail.parseWebhook(row.payload);
        if (!parsed) {
          await markWebhookProcessed({ provider: row.provider, providerRef: row.provider_ref });
        } else {
          await applyWebhook(row.provider, parsed);
        }
        processed++;
      } catch (err) {
        failed++;
        await handleWebhookFailure(row.provider, row.provider_ref, err);
      }
    }

    const stale = await countStaleWebhooks(STALE_WEBHOOK_MINUTES);
    if (stale > 0) {
      alertStaleWebhooks(stale, STALE_WEBHOOK_MINUTES);
    } else {
      clearAlert("webhook_inbox_stale");
    }

    if (processed > 0 || failed > 0) {
      logger.info({ processed, failed, stale }, "Webhook sweeper run completed");
    }
    return { skipped: false, processed, failed, stale };
  } finally {
    if (locked) {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [WEBHOOK_SWEEPER_LOCK_KEY]).catch(() => undefined);
    }
    lockClient.release();
  }
}
