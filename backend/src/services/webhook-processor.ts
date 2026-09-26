import { logger } from "../config/logger.js";
import type { ForensicContext } from "../middleware/forensic.js";
import type { ParsedWebhook } from "../providers/payment-rail.js";
import { processDepositWebhook, processTransferWebhook } from "./escrow.js";
import { markWebhookProcessed, recordWebhookFailure } from "./webhook-inbox.js";
import { alertWebhookDeadLettered } from "./alerting.js";

/**
 * Apply one parsed webhook to escrow state and mark its inbox row processed.
 * Shared by the webhook route (inline, right after the ACK) and the inbox
 * sweeper (retries), so both paths behave identically (task.md T6.2).
 * Every branch is idempotent: replays are no-ops.
 */
export async function applyWebhook(
  provider: string,
  parsed: ParsedWebhook,
  forensic?: ForensicContext,
): Promise<void> {
  if (parsed.kind === "DEPOSIT" && parsed.outcome === "PAID") {
    await processDepositWebhook({ transactionId: parsed.transactionId, forensic });
    logger.info({ transactionId: parsed.transactionId, providerRef: parsed.providerRef }, "Deposit webhook processed");
  } else if (parsed.kind === "PAYOUT") {
    const direction = parsed.providerRef.startsWith("rel-") ? "RELEASE" : "REFUND";
    await processTransferWebhook({ providerRef: parsed.providerRef, direction, outcome: parsed.outcome, forensic });
    logger.info({ providerRef: parsed.providerRef, direction, outcome: parsed.outcome }, "Transfer webhook processed");
  } else {
    logger.warn(
      { kind: parsed.kind, outcome: parsed.outcome, transactionId: parsed.transactionId },
      "Non-processable webhook outcome, marking processed without state change",
    );
  }

  await markWebhookProcessed({ provider, providerRef: parsed.providerRef });
}

/**
 * Record a failed attempt and alert if the webhook has been dead-lettered.
 */
export async function handleWebhookFailure(provider: string, providerRef: string, err: unknown): Promise<void> {
  const { attempts, deadLettered } = await recordWebhookFailure({ provider, providerRef, error: err });
  logger.error({ err, provider, providerRef, attempts, deadLettered }, "Webhook processing failed");
  if (deadLettered) {
    alertWebhookDeadLettered(provider, providerRef, attempts, err instanceof Error ? err.message : String(err));
  }
}
