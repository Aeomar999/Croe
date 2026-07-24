import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

/**
 * Structured request logging middleware.
 * Captures method, url, status, and response time.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        ip: req.ip,
      },
      "request",
    );
  });

  next();
}
