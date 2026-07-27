import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getTransactionClient } from "../db/pool.js";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";

const OTP_MAX_ATTEMPTS = 5;
const ACCESS_TOKEN_TTL = "15m";

interface AuthSession {
  session_id: string;
  user_id: string;
  device_id: string | null;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

interface OtpChallenge {
  challenge_id: string;
  phone_number: string;
  code_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  attempts: number;
  created_at: Date;
}

export function hashOTP(code: string): string {
  return crypto.createHash("sha256").update(code + env.OTP_PEPPER).digest("hex");
}

export function generateOTP(): string {
  const code = crypto.randomInt(0, 1_000_000);
  return String(code).padStart(6, "0");
}

export async function requestOTP(
  phoneNumber: string,
  forensicCtx: { ip: string; deviceId?: string },
): Promise<void> {
  const phoneKey = `rl:phone:otp_request:${phoneNumber}`;
  const ipKey = `rl:ip:otp_request:${forensicCtx.ip}`;

  const [phoneCount, ipCount] = await Promise.all([
    redis.incr(phoneKey),
    redis.incr(ipKey),
  ]);

  if (phoneCount === 1) {
    await redis.expire(phoneKey, 3600);
  }
  if (ipCount === 1) {
    await redis.expire(ipKey, 3600);
  }

  if (phoneCount > 5) {
    throw new AppError(429, "Rate limit exceeded", "OTP_RATE_LIMITED");
  }
  if (ipCount > 20) {
    throw new AppError(429, "Rate limit exceeded", "OTP_RATE_LIMITED");
  }

  const code = generateOTP();
  const codeHash = hashOTP(code);

  const client = await getTransactionClient();
  try {
    await client.query(
      `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at)
       VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
      [phoneNumber, codeHash],
    );
  } finally {
    client.release();
  }

  logger.info({ phone: phoneNumber, code }, "OTP sent (P0 stub)");
}

export async function verifyOTP(
  phoneNumber: string,
  code: string,
): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<OtpChallenge>(
      `SELECT * FROM otp_challenges
       WHERE phone_number = $1 AND consumed_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1
       FOR UPDATE`,
      [phoneNumber],
    );

    const challenge = rows[0];
    if (!challenge) {
      throw new AppError(401, "OTP expired or not found", "OTP_EXPIRED");
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError(429, "OTP locked", "OTP_LOCKED");
    }

    const inputHash = hashOTP(code);
    const storedBuf = Buffer.from(challenge.code_hash, "hex");
    const inputBuf = Buffer.from(inputHash, "hex");

    if (storedBuf.length !== inputBuf.length || !crypto.timingSafeEqual(storedBuf, inputBuf)) {
      await client.query(
        `UPDATE otp_challenges SET attempts = attempts + 1 WHERE challenge_id = $1`,
        [challenge.challenge_id],
      );
      await client.query("COMMIT");
      throw new AppError(401, "Invalid OTP", "OTP_INVALID");
    }

    await client.query(
      `UPDATE otp_challenges SET consumed_at = NOW() WHERE challenge_id = $1`,
      [challenge.challenge_id],
    );

    const { rows: userRows } = await client.query<{ user_id: string }>(
      `INSERT INTO users (user_id, phone_number)
       VALUES (gen_random_uuid(), $1)
       ON CONFLICT (phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number
       RETURNING user_id`,
      [phoneNumber],
    );

    const userId = userRows[0]!.user_id;

    await client.query("COMMIT");

    const tokens = await createSession(userId);

    return { userId, ...tokens };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function createSession(
  userId: string,
  deviceId?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const client = await getTransactionClient();
  let sessionId: string;
  let kycTier: number;
  let role: string;
  try {
    const { rows: userRows } = await client.query<{ kyc_tier: number; role: string }>(
      `SELECT kyc_tier, role FROM users WHERE user_id = $1`,
      [userId],
    );
    kycTier = userRows[0]?.kyc_tier ?? 0;
    role = userRows[0]?.role ?? "user";

    const { rows } = await client.query<{ session_id: string }>(
      `INSERT INTO auth_sessions (session_id, user_id, device_id, refresh_token_hash, expires_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW() + INTERVAL '30 days')
       RETURNING session_id`,
      [userId, deviceId ?? null, refreshTokenHash],
    );
    sessionId = rows[0]!.session_id;
  } finally {
    client.release();
  }

  const accessToken = jwt.sign(
    { sub: userId, session_id: sessionId, kyc_tier: kycTier, role },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  return { accessToken, refreshToken };
}

export async function refreshSession(
  refreshToken: string,
  deviceId?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  let session: AuthSession;

  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<AuthSession>(
      `SELECT * FROM auth_sessions
       WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [refreshTokenHash],
    );

    session = rows[0];
    if (!session) {
      throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    if (session.device_id && deviceId && session.device_id !== deviceId) {
      logger.warn(
        { sessionId: session.session_id, oldDevice: session.device_id, newDevice: deviceId },
        "Device ID mismatch on token refresh — possible SIM-swap",
      );
    }

    await client.query(
      `UPDATE auth_sessions SET revoked_at = NOW() WHERE session_id = $1`,
      [session.session_id],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return createSession(session.user_id, deviceId);
}

export async function logout(sessionId: string): Promise<void> {
  const client = await getTransactionClient();
  try {
    await client.query(
      `UPDATE auth_sessions SET revoked_at = NOW() WHERE session_id = $1 AND revoked_at IS NULL`,
      [sessionId],
    );
  } finally {
    client.release();
  }
}

export async function requireAuth(
  accessToken: string,
): Promise<{ userId: string; sessionId: string; kycTier: number; role: string }> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(accessToken, env.JWT_SECRET) as jwt.JwtPayload;
  } catch {
    throw new AppError(401, "Invalid or expired token", "INVALID_TOKEN");
  }

  const userId = payload.sub as string;
  const sessionId = payload.session_id as string;
  const kycTier = payload.kyc_tier as number;
  const role = (payload.role as string) ?? "user";

  if (!userId || !sessionId) {
    throw new AppError(401, "Invalid token payload", "INVALID_TOKEN");
  }

  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<{ session_id: string }>(
      `SELECT session_id FROM auth_sessions
       WHERE session_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [sessionId],
    );

    if (rows.length === 0) {
      throw new AppError(401, "Session revoked or expired", "INVALID_SESSION");
    }
  } finally {
    client.release();
  }

  return { userId, sessionId, kycTier, role };
}
