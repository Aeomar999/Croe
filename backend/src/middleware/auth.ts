declare module "express" {
  interface Request {
    userId?: string;
    sessionId?: string;
    kycTier?: number;
    userRole?: string;
  }
}

import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../services/auth.js";
import { AppError } from "./error-handler.js";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "MISSING_TOKEN" });
      return;
    }
    const token = header.slice(7);
    const result = await requireAuth(token);
    req.userId = result.userId;
    req.sessionId = result.sessionId;
    req.kycTier = result.kycTier;
    req.userRole = result.role;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userId) {
      throw new AppError(401, "UNAUTHENTICATED", "UNAUTHENTICATED");
    }
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      throw new AppError(403, "FORBIDDEN", "FORBIDDEN");
    }
    next();
  };
}
