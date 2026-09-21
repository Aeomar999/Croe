import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { requestOTP, verifyOTP, refreshSession, logout } from "../services/auth.js";
import { authenticate } from "../middleware/auth.js";
import { authRateLimiter, otpRateLimiter } from "../middleware/rate-limiter.js";
import { AppError } from "../middleware/error-handler.js";

const router: RouterType = Router();

const E164_RE = /^\+[1-9]\d{6,14}$/;
const OTP_CODE_RE = /^\d{6}$/;

/**
 * POST /auth/otp/request — Request OTP
 * 18-API-Reference.md §1 Authentication
 * Always returns 202 to prevent user enumeration.
 */
router.post("/auth/otp/request", otpRateLimiter, async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body as { phone_number?: string };

    if (!phone_number || !E164_RE.test(phone_number)) {
      throw new AppError(400, "phone_number must be E.164 format (e.g. +233240000000)", "VALIDATION_ERROR");
    }

    await requestOTP(phone_number, {
      ip: req.ip!,
      deviceId: req.headers["x-device-fingerprint"] as string,
    });
  } catch (error) {
    // Log the error to debug why OTP is failing silently
    console.error("Swallowed error in requestOTP:", error);
    // Intentionally swallowed — always return 202 regardless of outcome.
  }

  res.status(202).json({ message: "OTP sent" });
});

/**
 * POST /auth/otp/verify — Verify OTP and return session tokens
 * 18-API-Reference.md §1 Authentication
 */
router.post("/auth/otp/verify", authRateLimiter, async (req: Request, res: Response) => {
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
router.post("/auth/refresh", authRateLimiter, async (req: Request, res: Response) => {
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
  const client = await import("../db/pool.js").then((m) => m.getTransactionClient());
  try {
    const { rows } = await client.query(
      `SELECT phone_number, kyc_tier, trust_score FROM users WHERE user_id = $1`,
      [req.userId]
    );
    if (rows.length === 0) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    
    res.status(200).json({
      user_id: req.userId,
      phone_number: rows[0].phone_number,
      kyc_tier: rows[0].kyc_tier,
      trust_score: rows[0].trust_score,
    });
  } finally {
    client.release();
  }
});

/**
 * POST /auth/pin — Set or change PIN
 */
router.post("/auth/pin", authenticate, async (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    throw new AppError(400, "pin must be 4 to 6 digits", "VALIDATION_ERROR");
  }

  const crypto = await import("crypto");
  const pinHash = crypto.createHash("sha256").update(pin).digest("hex");

  const client = await import("../db/pool.js").then((m) => m.getTransactionClient());
  try {
    await client.query(`UPDATE users SET pin_hash = $1 WHERE user_id = $2`, [pinHash, req.userId]);
    res.status(200).json({ message: "PIN updated successfully" });
  } finally {
    client.release();
  }
});

/**
 * GET /auth/sessions — List active sessions
 */
router.get("/auth/sessions", authenticate, async (req: Request, res: Response) => {
  const client = await import("../db/pool.js").then((m) => m.getTransactionClient());
  try {
    const { rows } = await client.query(
      `SELECT session_id, device_id, created_at, expires_at 
       FROM auth_sessions 
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [req.userId]
    );
    
    // Mark the current session
    const sessions = rows.map(r => ({
      ...r,
      is_current: r.session_id === req.sessionId
    }));

    res.status(200).json({ sessions });
  } finally {
    client.release();
  }
});

/**
 * POST /auth/sessions/revoke-other — Revoke all active sessions except the current one
 */
router.post("/auth/sessions/revoke-other", authenticate, async (req: Request, res: Response) => {
  const client = await import("../db/pool.js").then((m) => m.getTransactionClient());
  try {
    await client.query(
      `UPDATE auth_sessions 
       SET revoked_at = NOW() 
       WHERE user_id = $1 AND session_id != $2 AND revoked_at IS NULL`,
      [req.userId, req.sessionId]
    );
    res.status(200).json({ message: "Other sessions revoked" });
  } finally {
    client.release();
  }
});

export default router;
