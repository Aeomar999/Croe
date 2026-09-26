import { Router, type Router as RouterType } from "express";
import { pool } from "../db/pool.js";
import { redis } from "../config/redis.js";
import { logger } from "../config/logger.js";

const router: RouterType = Router();

/** A dependency check must answer within this budget or it counts as down. */
const CHECK_TIMEOUT_MS = 2_000;

type CheckResult = { ok: boolean; latencyMs: number };

async function timed(check: () => Promise<unknown>): Promise<CheckResult> {
  const start = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("health check timed out")), CHECK_TIMEOUT_MS);
      }),
    ]);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    logger.warn({ err }, "Readiness dependency check failed");
    return { ok: false, latencyMs: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /health — liveness plus database reachability. Used by the Docker
 * HEALTHCHECK and docker-compose.
 */
router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      message: "Database unreachable",
    });
  }
});

/**
 * GET /health/ready — readiness: PostgreSQL and Redis must both answer.
 * Render's healthCheckPath points here (task.md T3.10), so a Redis outage
 * takes the instance out of rotation instead of serving requests that
 * would fail open on rate limits and idempotency.
 */
router.get("/health/ready", async (_req, res) => {
  const [database, cache] = await Promise.all([
    timed(() => pool.query("SELECT 1")),
    timed(() => redis.ping()),
  ]);
  const ready = database.ok && cache.ok;

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "unavailable",
    timestamp: new Date().toISOString(),
    checks: {
      database: { ...database, pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount } },
      redis: cache,
    },
  });
});

export default router;
