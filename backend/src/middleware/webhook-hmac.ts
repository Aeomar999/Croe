import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * MoMo webhook HMAC verification middleware (12-Webhooks-and-Idempotency.md §2).
 *
 * Three defenses:
 * 1. HMAC-SHA256 over raw unparsed body buffer + timestamp
 * 2. Timestamp window: reject if |now - ts| > 300s (replay defense)
 * 3. Constant-time compare via crypto.timingSafeEqual with length check
 *
 * MUST be mounted AFTER raw body capture (WH-01).
 */
export function verifyMoMoWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const sig = req.headers["x-momo-signature"] as string | undefined;
  const ts = req.headers["x-momo-timestamp"] as string | undefined;

  if (!sig || !ts) {
    res.status(401).json({ error: "MISSING_SIGNATURE" });
    return;
  }

  // Replay defense: timestamp must be within 300s of now
  const nowSec = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  if (isNaN(tsNum) || Math.abs(nowSec - tsNum) > 300) {
    logger.warn({ ts, nowSec }, "Webhook replay window expired");
    res.status(401).json({ error: "REPLAY_WINDOW_EXPIRED" });
    return;
  }

  const raw = (req as unknown as Record<string, unknown>).rawBody as Buffer | undefined;
  if (!raw) {
    logger.error("Webhook missing rawBody — raw body capture middleware not mounted");
    res.status(500).json({ error: "INTERNAL" });
    return;
  }

  // HMAC-SHA256: signature = HMAC(secret, "timestamp.rawBody")
  const payload = `${ts}.${raw.toString("utf8")}`;
  const expected = crypto
    .createHmac("sha256", env.MOMO_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  // Constant-time compare with length check (WH-03)
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    logger.warn({ sig: sig.slice(0, 8) + "..." }, "Invalid webhook signature");
    res.status(401).json({ error: "INVALID_SIGNATURE" });
    return;
  }

  next();
}
