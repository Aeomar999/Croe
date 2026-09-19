/**
 * Correlation ID middleware (23-Observability-and-Reconciliation.md §2).
 * Attaches a unique ID to every request for distributed tracing.
 * Propagates incoming x-correlation-id if present; otherwise generates a new UUID.
 */
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-correlation-id"];
  req.correlationId =
    typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128
      ? incoming
      : randomUUID();

  res.setHeader("x-correlation-id", req.correlationId);
  next();
}
