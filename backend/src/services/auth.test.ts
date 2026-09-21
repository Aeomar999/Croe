import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { hashOTP, generateOTP, requestOTP, verifyOTP, createSession, refreshSession, logout, requireAuth } from "./auth.js";
import { closeDatabasePool, getTransactionClient } from "../db/pool.js";
import { closeRedis, redis } from "../config/redis.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

const TEST_PHONE = "+2330000000091";
const TEST_PHONE_2 = "+2330000000092";

async function createTestUser(phone: string = TEST_PHONE): Promise<string> {
  const client = await getTransactionClient();
  try {
    const { rows } = await client.query<{ user_id: string }>(
      `INSERT INTO users (user_id, phone_number) VALUES (gen_random_uuid(), $1) ON CONFLICT (phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number RETURNING user_id`,
      [phone],
    );
    return rows[0]!.user_id;
  } finally {
    client.release();
  }
}

async function cleanTestData(): Promise<void> {
  const client = await getTransactionClient();
  try {
    await client.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233000000009%')");
    await client.query("DELETE FROM otp_challenges WHERE phone_number LIKE '+233000000009%'");
    await client.query("DELETE FROM transaction_ledger WHERE actor_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233000000009%')");
    await client.query("DELETE FROM user_preferences WHERE user_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233000000009%')");
    await client.query("DELETE FROM users WHERE phone_number LIKE '+233000000009%'");
  } finally {
    client.release();
  }
  
  // Clear redis rate limits for tests
  const keys = await redis.keys("rl:*");
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

beforeAll(async () => {
  await cleanTestData();
});

afterAll(async () => {
  await cleanTestData();
  await closeDatabasePool();
  await closeRedis();
});

beforeEach(async () => {
  await cleanTestData();
});

describe("hashOTP", () => {
  it("produces consistent SHA-256 hex of length 64", () => {
    const hash = hashOTP("123456");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOTP("123456")).toBe(hash);
  });

  it("produces different hashes for different inputs", () => {
    expect(hashOTP("111111")).not.toBe(hashOTP("222222"));
  });
});

describe("generateOTP", () => {
  it("returns exactly 6 digits", () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("two calls may differ", () => {
    const results = new Set(Array.from({ length: 20 }, () => generateOTP()));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("requestOTP", () => {
  it("stores an otp_challenges row with correct phone", async () => {
    await requestOTP(TEST_PHONE, { ip: "127.0.0.1" });
    const client = await getTransactionClient();
    try {
      const { rows } = await client.query(
        "SELECT * FROM otp_challenges WHERE phone_number = $1",
        [TEST_PHONE],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.code_hash).toHaveLength(64);
      expect(rows[0]!.expires_at).toBeInstanceOf(Date);
    } finally {
      client.release();
    }
  });

  it("sets expires_at to ~5 min in the future", async () => {
    await requestOTP(TEST_PHONE, { ip: "127.0.0.1" });
    const client = await getTransactionClient();
    try {
      const { rows } = await client.query<{ expires_at: Date }>(
        "SELECT expires_at FROM otp_challenges WHERE phone_number = $1",
        [TEST_PHONE],
      );
      const diff = new Date(rows[0]!.expires_at).getTime() - Date.now();
      expect(diff).toBeGreaterThan(290_000);
      expect(diff).toBeLessThan(310_000);
    } finally {
      client.release();
    }
  });
});

describe("verifyOTP", () => {
  it("returns userId and tokens on correct code", async () => {
    const code = "123456";
    const client = await getTransactionClient();
    try {
      await client.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
        [TEST_PHONE, hashOTP(code)],
      );
    } finally {
      client.release();
    }

    const result = await verifyOTP(TEST_PHONE, code);
    expect(result.userId).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it("returns a valid JWT access token", async () => {
    const code = "222222";
    const client = await getTransactionClient();
    try {
      await client.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
        [TEST_PHONE, hashOTP(code)],
      );
    } finally {
      client.release();
    }

    const result = await verifyOTP(TEST_PHONE, code);
    const payload = jwt.verify(result.accessToken, env.JWT_SECRET) as jwt.JwtPayload;
    expect(payload.sub).toBe(result.userId);
    expect(payload.session_id).toBeDefined();
  });

  it("marks consumed_at on success", async () => {
    const code = "333333";
    const client = await getTransactionClient();
    let challengeId: string;
    try {
      const { rows } = await client.query<{ challenge_id: string }>(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes') RETURNING challenge_id`,
        [TEST_PHONE, hashOTP(code)],
      );
      challengeId = rows[0]!.challenge_id;
    } finally {
      client.release();
    }

    await verifyOTP(TEST_PHONE, code);

    const client2 = await getTransactionClient();
    try {
      const { rows } = await client2.query<{ consumed_at: Date | null }>(
        "SELECT consumed_at FROM otp_challenges WHERE challenge_id = $1",
        [challengeId],
      );
      expect(rows[0]!.consumed_at).not.toBeNull();
    } finally {
      client2.release();
    }
  });

  it("throws 401 OTP_INVALID on wrong code", async () => {
    const code = "444444";
    const client = await getTransactionClient();
    try {
      await client.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
        [TEST_PHONE, hashOTP(code)],
      );
    } finally {
      client.release();
    }

    await expect(verifyOTP(TEST_PHONE, "999999")).rejects.toThrow("Invalid OTP");
  });

  it("throws 401 OTP_EXPIRED when no challenge exists", async () => {
    await expect(verifyOTP(TEST_PHONE, "123456")).rejects.toThrow("OTP expired or not found");
  });

  it("throws 429 OTP_LOCKED after 5 failed attempts", async () => {
    const code = "555555";
    const client = await getTransactionClient();
    try {
      await client.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
        [TEST_PHONE, hashOTP(code)],
      );
    } finally {
      client.release();
    }

    for (let i = 0; i < 5; i++) {
      try { await verifyOTP(TEST_PHONE, "000000"); } catch {}
    }

    await expect(verifyOTP(TEST_PHONE, "000000")).rejects.toThrow("OTP locked");
  }, 10000);
});

describe("createSession", () => {
  it("returns accessToken and refreshToken strings", async () => {
    const userId = await createTestUser();
    const result = await createSession(userId);
    expect(typeof result.accessToken).toBe("string");
    expect(typeof result.refreshToken).toBe("string");
    expect(result.accessToken.length).toBeGreaterThan(20);
    expect(result.refreshToken.length).toBe(80);
  });

  it("creates an auth_sessions row in the DB", async () => {
    const userId = await createTestUser();
    await createSession(userId, "device-abc");
    const client = await getTransactionClient();
    try {
      const { rows } = await client.query(
        "SELECT * FROM auth_sessions WHERE user_id = $1",
        [userId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.device_id).toBe("device-abc");
    } finally {
      client.release();
    }
  });

  it("access token JWT contains sub, session_id, kyc_tier, role claims", async () => {
    const userId = await createTestUser();
    const { accessToken } = await createSession(userId);
    const payload = jwt.verify(accessToken, env.JWT_SECRET) as jwt.JwtPayload;
    expect(payload.sub).toBe(userId);
    expect(payload.session_id).toBeDefined();
    expect(payload.kyc_tier).toBe(0);
    expect(payload.role).toBeDefined();
  });
});

describe("refreshSession", () => {
  it("rotates tokens", async () => {
    const userId = await createTestUser();
    const { refreshToken } = await createSession(userId);
    const newTokens = await refreshSession(refreshToken);

    expect(newTokens.refreshToken).not.toBe(refreshToken);
    expect(newTokens.accessToken).toBeDefined();

    const client = await getTransactionClient();
    try {
      const { rows } = await client.query(
        "SELECT * FROM auth_sessions WHERE refresh_token_hash = $1",
        [crypto.createHash("sha256").update(refreshToken).digest("hex")],
      );
      expect(rows[0]!.revoked_at).not.toBeNull();
    } finally {
      client.release();
    }
  });

  it("throws 401 INVALID_REFRESH_TOKEN on invalid token", async () => {
    await expect(refreshSession("bogus-token")).rejects.toThrow("Invalid refresh token");
  });
});

describe("logout", () => {
  it("sets revoked_at on the session", async () => {
    const userId = await createTestUser();
    const session = await createSession(userId);

    const payload = jwt.verify(session.accessToken, env.JWT_SECRET) as jwt.JwtPayload;
    await logout(payload.session_id as string);

    const client = await getTransactionClient();
    try {
      const { rows } = await client.query(
        "SELECT revoked_at FROM auth_sessions WHERE session_id = $1",
        [payload.session_id],
      );
      expect(rows[0]!.revoked_at).not.toBeNull();
    } finally {
      client.release();
    }
  });

  it("requireAuth throws INVALID_SESSION after logout", async () => {
    const userId = await createTestUser();
    const { accessToken } = await createSession(userId);
    const payload = jwt.verify(accessToken, env.JWT_SECRET) as jwt.JwtPayload;
    await logout(payload.session_id as string);

    await expect(requireAuth(accessToken)).rejects.toThrow("Session revoked or expired");
  });
});

describe("requireAuth", () => {
  it("returns userId, sessionId, kycTier, role on valid token", async () => {
    const userId = await createTestUser();
    const { accessToken } = await createSession(userId);
    const result = await requireAuth(accessToken);

    expect(result.userId).toBe(userId);
    expect(result.sessionId).toBeDefined();
    expect(result.kycTier).toBe(0);
    expect(result.role).toBeDefined();
  });

  it("throws 401 INVALID_TOKEN on invalid JWT", async () => {
    await expect(requireAuth("not-a-jwt")).rejects.toThrow("Invalid or expired token");
  });

  it("throws 401 INVALID_SESSION on revoked session", async () => {
    const userId = await createTestUser();
    const { accessToken } = await createSession(userId);
    const payload = jwt.verify(accessToken, env.JWT_SECRET) as jwt.JwtPayload;
    await logout(payload.session_id as string);

    await expect(requireAuth(accessToken)).rejects.toThrow("Session revoked or expired");
  });
});
