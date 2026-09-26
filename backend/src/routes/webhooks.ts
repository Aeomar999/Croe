import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { verifyMoMoWebhook } from "../middleware/webhook-hmac.js";
import { enqueueWebhook } from "../services/webhook-inbox.js";
import { applyWebhook, handleWebhookFailure } from "../services/webhook-processor.js";
import { paymentRail } from "../providers/index.js";
import { dedupGate, releaseDedupGate } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { paymentRateLimiter } from "../middleware/rate-limiter.js";

const router: RouterType = Router();

const PROVIDER = "momo";

/**
 * POST /v1/webhooks/momo-callback — MoMo deposit/transfer callback
 * 12-Webhooks-and-Idempotency.md §3 Fast-Response Rule
 *
 * ACK 200 in < 500ms BEFORE processing. Then process asynchronously.
 * webhook_inbox is the durable record: if processing fails, the row stays
 * unprocessed and the sweeper retries it (task.md T6.1, T6.2).
 */
router.post(
  "/webhooks/momo-callback",
  paymentRateLimiter,
  verifyMoMoWebhook,
  async (req: Request, res: Response) => {
    // 1. ACK immediately (< 500ms)
    res.status(200).send("OK");

    // 2. Parse webhook payload
    let parsed;
    try {
      parsed = paymentRail.parseWebhook(req.body);
    } catch (err) {
      logger.error({ err }, "Webhook payload could not be parsed");
      return;
    }
    if (!parsed) {
      logger.info({ event: (req.body as Record<string, unknown>)?.event }, "Non-processable webhook event, ACKed only");
      return;
    }

    const dedupKey = `idemp:${parsed.providerRef}`;

    try {
      // 3. Redis SETNX fast dedup gate (§4 gate 1)
      const { isNew } = await dedupGate(dedupKey);
      if (!isNew) {
        logger.info({ providerRef: parsed.providerRef }, "Redis dedup: already seen, skipping");
        return;
      }

      // 4. Enqueue in durable inbox (§4 gate 2)
      const { alreadyProcessed } = await enqueueWebhook({
        provider: PROVIDER,
        providerRef: parsed.providerRef,
        signatureValid: true,
        payload: req.body,
      });
      if (alreadyProcessed) {
        logger.info({ providerRef: parsed.providerRef }, "Duplicate webhook, skipping");
        return;
      }
    } catch (err) {
      // Nothing durable was written: do not let the Redis key block a redelivery.
      logger.error({ err, providerRef: parsed.providerRef }, "Webhook could not be enqueued");
      await releaseDedupGate(dedupKey).catch(() => undefined);
      return;
    }

    // 5. Process. On failure the inbox row keeps processed_at NULL with a
    //    retry time, and the Redis key is released (task.md T6.1).
    try {
      await applyWebhook(PROVIDER, parsed, req.forensic);
    } catch (err) {
      await handleWebhookFailure(PROVIDER, parsed.providerRef, err).catch((recordErr) =>
        logger.error({ err: recordErr, providerRef: parsed.providerRef }, "Could not record webhook failure"),
      );
      await releaseDedupGate(dedupKey).catch(() => undefined);
    }
  },
);

export default router;
