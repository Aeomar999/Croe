import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { checkDatabaseConnection, closeDatabasePool } from "./db/pool.js";
import { requestLogger } from "./middleware/request-logger.js";
import { forensicCapture } from "./middleware/forensic.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";
import healthRoutes from "./routes/health.js";
import escrowRoutes from "./routes/escrow.js";
import webhookRoutes from "./routes/webhooks.js";

const app: Application = express();

// Security
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));

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

// Request logging
app.use(requestLogger);

// Routes
app.use("/v1", healthRoutes);
app.use("/v1", escrowRoutes);
app.use("/v1", webhookRoutes);

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

    const server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, "Croe API listening");
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, "Received shutdown signal");
      server.close(async () => {
        await closeDatabasePool();
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
