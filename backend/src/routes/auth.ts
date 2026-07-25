import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { requestOTP, verifyOTP, refreshSession, logout } from "../services/auth.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error-handler.js";

const router: RouterType = Router();

const E164_RE = /^\+[1-9]\d{6,14}$/;
const OTP_CODE_RE = /^\d{6}$/;

/**
 * POST /auth/otp/request — Request OTP
 * 18-API-Reference.md §1 Authentication
 * Always returns 202 to prevent user enumeration.
 */
router.post("/auth/otp/request", async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body as { phone_number?: string };

    if (!phone_number || !E164_RE.test(phone_number)) {
      throw new AppError(400, "phone_number must be E.164 format (e.g. +233240000000)", "VALIDATION_ERROR");
    }

    await requestOTP(phone_number, {
      ip: req.ip!,
      deviceId: req.headers["x-device-fingerprint"] as string,
    });
  } catch {
    // Intentionally swallowed — always return 202 regardless of outcome.
  }

  res.status(202).json({ message: "OTP sent" });
});

/**
 * POST /auth/otp/verify — Verify OTP and return session tokens
 * 18-API-Reference.md §1 Authentication
 */
router.post("/auth/otp/verify", async (req: Request, res: Response) => {
  try {
    const { phone_number, code } = req.body as { phone_number?: string; code?: string };

    if (!phone_number || !E164_RE.test(phone_number)) {
      throw new AppError(400, "phone_number must be E.164 format (e.g. +233240000000)", "VALIDATION_ERROR");
    }
    if (!code || !OTP_CODE_RE.test(code)) {
      throw new AppError(400, "code must be a 6-digit string", "VALIDATION_ERROR");
    }

    const tokens = await verifyOTP(phone_number, code);

    res.status(200).json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /auth/refresh — Refresh session tokens
 * 18-API-Reference.md §1 Authentication
 */
router.post("/auth/refresh", async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body as { refresh_token?: string };

    if (!refresh_token || typeof refresh_token !== "string" || refresh_token.length === 0) {
      throw new AppError(400, "refresh_token is required", "VALIDATION_ERROR");
    }

    const tokens = await refreshSession(
      refresh_token,
      req.headers["x-device-fingerprint"] as string,
    );

    res.status(200).json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /auth/logout — Revoke current session
 * 18-API-Reference.md §1 Authentication
 */
router.post("/auth/logout", authenticate, async (req: Request, res: Response) => {
  try {
    await logout(req.sessionId!);
    res.status(204).end();
  } catch (error) {
    throw error;
  }
});

/**
 * GET /auth/me — Return current authenticated user
 * 18-API-Reference.md §1 Authentication
 */
router.get("/auth/me", authenticate, async (req: Request, res: Response) => {
  res.status(200).json({
    user_id: req.userId,
    kyc_tier: req.kycTier,
  });
});

export default router;
