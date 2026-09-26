import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { verifyMoMoWebhook } from "../middleware/webhook-hmac.js";
import { processDepositWebhook, processTransferWebhook } from "../services/escrow.js";
import { enqueueWebhook, markWebhookProcessed } from "../services/webhook-inbox.js";
import { paymentRail } from "../providers/index.js";
import { dedupGate } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { paymentRateLimiter } from "../middleware/rate-limiter.js";

const router: RouterType = Router();

/**
 * POST /v1/webhooks/momo-callback — MoMo deposit/transfer callback
 * 12-Webhooks-and-Idempotency.md §3 Fast-Response Rule
 *
 * ACK 200 in < 500ms BEFORE processing. Then process asynchronously.
 */
router.post(
  "/webhooks/momo-callback",
  paymentRateLimiter,
  verifyMoMoWebhook,
  async (req: Request, res: Response) => {
    // 1. ACK immediately (< 500ms)
    res.status(200).send("OK");

    try {
      // 2. Parse webhook payload
      const parsed = paymentRail.parseWebhook(req.body);

      // If parseWebhook returns null, it's a non-money event we don't process
      if (!parsed) {
        logger.info({ event: (req.body as Record<string, any>)?.event }, "Non-processable webhook event, ACKed only");
        return;
      }

      // 3. Redis SETNX fast dedup gate (§4 gate 1)
      const { isNew } = await dedupGate(`idemp:${parsed.providerRef}`);
      if (!isNew) {
        logger.info({ providerRef: parsed.providerRef }, "Redis dedup: already seen, skipping");
        return;
      }

      // 4. Enqueue in durable inbox (§4 gate 2)
      const { alreadyProcessed } = await enqueueWebhook({
        provider: "momo",
        providerRef: parsed.providerRef,
        signatureValid: true,
        payload: req.body,
      });

      if (alreadyProcessed) {
        logger.info({ providerRef: parsed.providerRef }, "Duplicate webhook, skipping");
        return;
      }

      // 5. Process based on the rail-agnostic event kind (task.md T6.3)
      if (parsed.kind === "DEPOSIT" && parsed.outcome === "PAID") {
        // Deposit webhook
        await processDepositWebhook({
          transactionId: parsed.transactionId,
          forensic: req.forensic,
        });

        await markWebhookProcessed({
          provider: "momo",
          providerRef: parsed.providerRef,
        });

        logger.info(
          { transactionId: parsed.transactionId, providerRef: parsed.providerRef },
          "Deposit webhook processed successfully",
        );
      } else if (parsed.kind === "PAYOUT") {
        // Transfer webhook (payout completion)
        const direction = parsed.providerRef.startsWith("rel-") ? "RELEASE" : "REFUND";

        await processTransferWebhook({
          providerRef: parsed.providerRef,
          direction,
          outcome: parsed.outcome,
          forensic: req.forensic,
        });

        await markWebhookProcessed({
          provider: "momo",
          providerRef: parsed.providerRef,
        });

        logger.info(
          { providerRef: parsed.providerRef, direction, outcome: parsed.outcome },
          "Transfer webhook processed successfully",
        );
      } else {
        logger.warn(
          { kind: parsed.kind, outcome: parsed.outcome, transactionId: parsed.transactionId },
          "Non-processable webhook outcome, marking processed without state change",
        );
        await markWebhookProcessed({
          provider: "momo",
          providerRef: parsed.providerRef,
        });
      }
    } catch (err) {
      logger.error({ err }, "Error processing webhook asynchronously");
      // Leave processed_at NULL for sweeper to retry (§7)
    }
  },
);

export default router;
