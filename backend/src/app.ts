import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { requestLogger } from "./middleware/request-logger.js";
import { forensicCapture } from "./middleware/forensic.js";
import { correlationId } from "./middleware/correlation-id.js";
import { metricsTimer } from "./middleware/metrics-timer.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";
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

// Behind Render (and later Cloudflare) every connection comes from the proxy.
// Trust exactly TRUST_PROXY_HOPS so req.ip is the real client for rate limits,
// Sybil heuristics and forensics (AUD-02), and a client-supplied extra
// X-Forwarded-For hop is ignored (task.md T7.1).
app.set("trust proxy", env.TRUST_PROXY_HOPS);

// Security
app.use(helmet());

// CORS — exact-match allowlist, validated at boot (task.md T7.21)
const allowedOrigins = new Set(env.CORS_ORIGINS);
app.use(
  cors({
    origin: (origin, callback) => {
      // Unknown origins get no CORS headers (the browser blocks them); they
      // are not a server error.
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);

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

export { app };
