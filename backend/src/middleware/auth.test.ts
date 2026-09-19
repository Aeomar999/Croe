import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const mockRequireAuth = vi.fn();
vi.mock("../services/auth.js", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

vi.mock("../config/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { authenticate, requireRole } from "./auth.js";
import { AppError } from "./error-handler.js";

function fakeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function fakeRes(): Response {
  const res: Record<string, unknown> = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res as unknown as Response;
}

describe("authenticate middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects requests without Authorization header", async () => {
    const req = fakeReq();
    const res = fakeRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "MISSING_TOKEN" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects non-Bearer Authorization header", async () => {
    const req = fakeReq({ authorization: "Basic abc123" });
    const res = fakeRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls requireAuth with the Bearer token", async () => {
    mockRequireAuth.mockResolvedValue({ userId: "u1", sessionId: "s1", kycTier: 1, role: "vendor" });
    const req = fakeReq({ authorization: "Bearer tok_abc" });
    const res = fakeRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(mockRequireAuth).toHaveBeenCalledWith("tok_abc");
  });

  it("sets req.userId, sessionId, kycTier, userRole on success", async () => {
    mockRequireAuth.mockResolvedValue({ userId: "u-123", sessionId: "s-456", kycTier: 2, role: "buyer" });
    const req = fakeReq({ authorization: "Bearer valid_token" });
    const res = fakeRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(req.userId).toBe("u-123");
    expect(req.sessionId).toBe("s-456");
    expect(req.kycTier).toBe(2);
    expect(req.userRole).toBe("buyer");
    expect(next).toHaveBeenCalledOnce();
  });

  it("passes errors to next()", async () => {
    mockRequireAuth.mockRejectedValue(new Error("invalid token"));
    const req = fakeReq({ authorization: "Bearer bad_token" });
    const res = fakeRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});

describe("requireRole middleware", () => {
  it("throws 401 if userId is not set", () => {
    const req = { userRole: "vendor" } as unknown as Request;
    const res = fakeRes();
    const next = vi.fn();
    expect(() => requireRole("vendor")(req, res, next)).toThrow(AppError);
  });

  it("throws 403 if userRole is not in allowed roles", () => {
    const req = { userId: "u1", userRole: "buyer" } as unknown as Request;
    const res = fakeRes();
    const next = vi.fn();
    expect(() => requireRole("vendor", "admin")(req, res, next)).toThrow(AppError);
    try {
      requireRole("vendor", "admin")(req, res, next);
    } catch (err: unknown) {
      expect((err as AppError).statusCode).toBe(403);
    }
  });

  it("throws 403 if userRole is undefined", () => {
    const req = { userId: "u1" } as unknown as Request;
    const res = fakeRes();
    const next = vi.fn();
    expect(() => requireRole("vendor")(req, res, next)).toThrow(AppError);
  });

  it("calls next() when role matches", () => {
    const req = { userId: "u1", userRole: "vendor" } as unknown as Request;
    const res = fakeRes();
    const next = vi.fn();
    requireRole("vendor")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows any of multiple roles", () => {
    const res = fakeRes();
    const next = vi.fn();
    const req1 = { userId: "u1", userRole: "vendor" } as unknown as Request;
    const req2 = { userId: "u2", userRole: "admin" } as unknown as Request;
    requireRole("vendor", "admin")(req1, res, next);
    expect(next).toHaveBeenCalledOnce();
    next.mockClear();
    requireRole("vendor", "admin")(req2, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
