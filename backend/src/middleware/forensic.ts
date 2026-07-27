import type { Request, Response, NextFunction } from "express";

/**
 * Forensic header capture middleware (AUD-02).
 * Captures device fingerprint, network type, and IP from headers
 * and attaches them to the request for downstream use.
 */
export interface ForensicContext {
  ip: string;
  deviceId: string;
  networkType: string;
}

declare global {
  namespace Express {
    interface Request {
      forensic?: ForensicContext;
    }
  }
}

export function forensicCapture(req: Request, _res: Response, next: NextFunction): void {
  req.forensic = {
    ip: req.ip ?? req.socket.remoteAddress ?? "unknown",
    deviceId: (req.headers["x-device-fingerprint"] as string) ?? "unknown",
    networkType: (req.headers["x-network-type"] as string) ?? "unknown",
  };
  next();
}
