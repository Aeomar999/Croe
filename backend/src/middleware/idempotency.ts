import type { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler.js";

/**
 * Client idempotency middleware (12-Webhooks-and-Idempotency.md §6).
 *
 * Every POST/PUT/DELETE must include an Idempotency-Key header (UUIDv4).
 * First request: process normally, store response status+body keyed by key.
 * Replay with same key: return stored response without re-executing.
 * Same key, different body: 409 IDEMPOTENCY_KEY_CONFLICT.
 *
 * NOTE: This middleware only enforces the KEY REQUIRED validation.
 * The actual dedup logic is in the idempotency service (impl Phase 3).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireIdempotencyKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const key = req.headers["idempotency-key"] as string | undefined;

  if (!key) {
    throw new AppError(
      400,
      "Missing required Idempotency-Key header",
      "IDEMPOTENCY_KEY_REQUIRED",
    );
  }

  if (!UUID_RE.test(key)) {
    throw new AppError(
      400,
      "Idempotency-Key must be a valid UUIDv4",
      "VALIDATION_ERROR",
    );
  }

  next();
}
