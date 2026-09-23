import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { checkDatabaseConnection, closeDatabasePool } from "./db/pool.js";
import { closeRedis } from "./config/redis.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";
import { app } from "./app.js";

/**
 * Start the server.
 */
async function start(): Promise<void> {
  try {
    await checkDatabaseConnection();
    logger.info({ custodyPhase: env.CUSTODY_PHASE }, "Croe backend starting");

    startScheduler();

    const server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, "Croe API listening");
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, "Received shutdown signal");
      server.close(async () => {
        await stopScheduler();
        await closeDatabasePool();
        await closeRedis();
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

start();
