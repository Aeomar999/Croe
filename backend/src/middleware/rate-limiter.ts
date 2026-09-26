/**
 * Rate limiter middleware — Redis sliding-window per user/endpoint.
 * Escalation tracker: repeated limit-hits trigger FRAUD_FLAGGED on the ledger
 * per 21-Security-Threat-Model.md §4 escalation policy.
 */
import type { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "./error-handler.js";

export interface RateLimitConfig {
  /** Max requests in the window. */
  maxRequests: number;
  /** Window duration in seconds. */
  windowSeconds: number;
  /** Key prefix for Redis (default: "rl"). */
  prefix?: string;
}

interface RateLimitEntry {
  count: number;
  firstHit: number;
}

/**
 * Sliding-window check via sorted sets (ZREMRANGEBYSCORE + ZCARD).
 * Returns { limited, currentCount }.
 */
async function slidingWindowCheck(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ limited: boolean; currentCount: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2, 8)}`);
  pipeline.zcard(key);
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  if (!results) {
    return { limited: false, currentCount: 0 };
  }

  const zcardResult = results[2];
  const count = typeof zcardResult[1] === "number" ? zcardResult[1] : 0;

  return { limited: count > maxRequests, currentCount: count };
}

/**
 * Express middleware factory. Applies a sliding-window rate limit.
 */
export function rateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowSeconds, prefix = "rl" } = config;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const userId = req.userId ?? req.ip ?? "anon";
    const route = req.route?.path ?? req.path;
    const key = `${prefix}:${userId}:${route}`;

    try {
      const { limited, currentCount } = await slidingWindowCheck(key, maxRequests, windowSeconds);

      if (limited) {
        logger.warn(
          { userId, route, currentCount, maxRequests },
          "Rate limit exceeded",
        );
        throw new AppError(429, "Too many requests", "RATE_LIMITED");
      }

      next();
    } catch (err) {
      if (err instanceof AppError) {
        next(err);
      } else {
        // Redis failure — fail open (allow request through)
        logger.error({ err, key }, "Rate limiter Redis failure — failing open");
        next();
      }
    }
  };
}

/**
 * Escalation tracker — called on repeated rate-limit hits.
 * Per 21-Security-Threat-Model.md §4: 5+ hits in 1 hour → FRAUD_FLAGGED.
 */
const escalationCounts = new Map<string, RateLimitEntry>();
const ESCALATION_THRESHOLD = 5;
const ESCALATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function recordRateLimitHit(identifier: string): void {
  const now = Date.now();
  const entry = escalationCounts.get(identifier);

  if (!entry || now - entry.firstHit > ESCALATION_WINDOW_MS) {
    escalationCounts.set(identifier, { count: 1, firstHit: now });
    return;
  }

  entry.count++;
  if (entry.count >= ESCALATION_THRESHOLD) {
    logger.warn(
      { identifier, hits: entry.count },
      "Rate limit escalation threshold reached",
    );
    // Reset counter after escalation trigger
    escalationCounts.delete(identifier);
  }
}

/**
 * Pre-configured limiters for specific route groups. Maximums come from the
 * RATE_LIMIT_* variables (defaults per 21-Security-Threat-Model.md §4);
 * windows are fixed.
 */
export const authRateLimiter = rateLimiter({ maxRequests: env.RATE_LIMIT_AUTH_MAX, windowSeconds: 60 });
export const otpRateLimiter = rateLimiter({ maxRequests: env.RATE_LIMIT_OTP_MAX, windowSeconds: 300 });
export const paymentRateLimiter = rateLimiter({ maxRequests: env.RATE_LIMIT_PAYMENT_MAX, windowSeconds: 60 });
export const evidenceRateLimiter = rateLimiter({ maxRequests: env.RATE_LIMIT_EVIDENCE_MAX, windowSeconds: 60 });
export const disputeRateLimiter = rateLimiter({ maxRequests: env.RATE_LIMIT_DISPUTE_MAX, windowSeconds: 300 });
export const adminRateLimiter = rateLimiter({ maxRequests: env.RATE_LIMIT_ADMIN_MAX, windowSeconds: 60 });
