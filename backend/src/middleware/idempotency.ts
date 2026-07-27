import type { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler.js";
import {
  checkIdempotencyKey,
  storeIdempotencyResponse,
  hashRequestBody,
} from "../services/idempotency.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Phase 1: Validate that the Idempotency-Key header is present and is UUIDv4.
 */
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

/**
 * Phase 2 (12-Webhooks-and-Idempotency.md §6):
 * Full idempotency guard.
 * - Checks DB for existing key → replay stored response (short-circuits handler).
 * - Same key + different body → 409 IDEMPOTENCY_KEY_CONFLICT.
 * - First request → lets handler run, intercepts res.json, stores response.
 *
 * Place AFTER requireIdempotencyKey and BEFORE the route handler.
 */
export function idempotencyGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = req.headers["idempotency-key"] as string;
  const bodyHash = hashRequestBody(req.body);
  const userId = (req as unknown as { userId?: string }).userId ?? null;

  checkIdempotencyKey(key, req.method, req.path, userId, bodyHash)
    .then((stored) => {
      if (stored) {
        res.status(stored.status).json(stored.body);
        return;
      }

      const originalJson = res.json.bind(res);
      let captured = false;

      res.json = function interceptJson(body: unknown) {
        if (!captured) {
          captured = true;
          const status = res.statusCode;
          storeIdempotencyResponse(
            key,
            req.method,
            req.path,
            userId,
            bodyHash,
            status,
            body,
          ).catch(() => {
            // Storage failure is non-fatal — request already succeeded.
          });
        }
        return originalJson(body);
      };

      next();
    })
    .catch((err) => {
      if (err?.status === 409) {
        throw new AppError(409, "Idempotency key conflict — same key, different request body", "IDEMPOTENCY_KEY_CONFLICT");
      }
      next(err);
    });
}
