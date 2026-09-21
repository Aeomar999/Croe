import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { checkDatabaseConnection, closeDatabasePool } from "./db/pool.js";
import { closeRedis } from "./config/redis.js";
import { requestLogger } from "./middleware/request-logger.js";
import { forensicCapture } from "./middleware/forensic.js";
import { correlationId } from "./middleware/correlation-id.js";
import { metricsTimer } from "./middleware/metrics-timer.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";
import healthRoutes from "./routes/health.js";
import escrowRoutes from "./routes/escrow.js";
import webhookRoutes from "./routes/webhooks.js";
import evidenceRoutes from "./routes/evidence.js";
import disputeRoutes from "./routes/disputes.js";
import authRoutes from "./routes/auth.js";
import kycRoutes from "./routes/kyc.js";
import adminRoutes from "./routes/admin.js";
import usersRoutes from "./routes/users.js";

const app: Application = express();

// Security
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));

// Correlation ID — earliest middleware so all downstream code can use it
app.use(correlationId);

// Forensic capture before body parsing (AUD-02)
app.use(forensicCapture);

// Body parsing — capture raw body for HMAC verification (WH-01)
app.use(
  express.json({
    verify: (req, _res, buf) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Metrics timer
app.use(metricsTimer);

// Request logging
app.use(requestLogger);

// Routes
app.use("/v1", healthRoutes);
app.use("/v1", escrowRoutes);
app.use("/v1", webhookRoutes);
app.use("/v1", evidenceRoutes);
app.use("/v1", disputeRoutes);
app.use("/v1", authRoutes);
app.use("/v1", kycRoutes);
app.use("/v1", adminRoutes);
app.use("/v1", usersRoutes);

// Unversioned health probe for load balancers / container healthchecks
app.use("/", healthRoutes);

// 404 and error handling
app.use(notFoundHandler);
app.use(errorHandler);

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

export { app };
