/**
 * Metrics timer middleware — measures request latency and exposes it for histogram recording.
 */
import type { Request, Response, NextFunction } from "express";
import { metrics } from "../services/metrics.js";

export function metricsTimer(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    metrics.recordHistogram("http_request_duration_ms", durationMs, {
      method: req.method,
      path: req.route?.path ?? req.path,
      status: String(res.statusCode),
    });
  });

  next();
}
