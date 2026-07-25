import RedisModule from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

const Redis = RedisModule.default ?? RedisModule;

/**
 * Shared Redis client for idempotency gates, rate limiting, and caching.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on("error", (err: Error) => {
  logger.error({ err }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

/**
 * SETNX fast dedup gate (12-Webhooks-and-Idempotency.md §4).
 * Returns true if the key was set (new event), false if already seen.
 * TTL defaults to 24 hours.
 */
export async function dedupGate(
  key: string,
  ttlMs: number = 24 * 60 * 60 * 1000,
): Promise<{ isNew: boolean }> {
  const result = await redis.set(key, "1", "PX", ttlMs, "NX");
  return { isNew: result !== null };
}

/**
 * Close Redis connection (for graceful shutdown).
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
}
