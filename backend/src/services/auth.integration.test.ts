import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { requestOTP, verifyOTP, refreshSession, logout, requireAuth } from "./auth.js";
import { closeDatabasePool, getTransactionClient } from "../db/pool.js";
import { closeRedis, redis } from "../config/redis.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

const PHONES = ["+2330000000010", "+2330000000011", "+2330000000012", "+2330000000013", "+2330000000014", "+2330000000015"];

async function cleanAllTestData(): Promise<void> {
  const client = await getTransactionClient();
  try {
    await client.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233000000001%')");
    await client.query("DELETE FROM otp_challenges WHERE phone_number LIKE '+233000000001%'");
    await client.query("DELETE FROM transaction_ledger WHERE actor_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233000000001%')");
    await client.query("DELETE FROM users WHERE phone_number LIKE '+233000000001%'");
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  await cleanAllTestData();
});

afterAll(async () => {
  await cleanAllTestData();
  await closeDatabasePool();
  await closeRedis();
});

beforeEach(async () => {
  await cleanAllTestData();
  const keys = await redis.keys("rl:*");
  if (keys.length > 0) await redis.del(...keys);
});

describe("Full auth flow", () => {
  it("completes OTP request → verify → tokens → refresh → logout → old refresh fails", async () => {
    const phone = PHONES[0]!;

    await requestOTP(phone, { ip: "127.0.0.1" });

    const client = await getTransactionClient();
    let code: string;
    try {
      const { rows } = await client.query<{ code_hash: string }>(
        "SELECT code_hash FROM otp_challenges WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1",
        [phone],
      );
      expect(rows).toHaveLength(1);
      // We can't recover the plaintext code from the hash; generate a known one instead
    } finally {
      client.release();
    }

    // Insert a known OTP for testing
    const knownCode = "999999";
    const client2 = await getTransactionClient();
    try {
      await client2.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
        [phone, crypto.createHash("sha256").update(knownCode + env.OTP_PEPPER).digest("hex")],
      );
    } finally {
      client2.release();
    }

    const verifyResult = await verifyOTP(phone, knownCode);
    expect(verifyResult.accessToken).toBeDefined();
    expect(verifyResult.refreshToken).toBeDefined();

    const refreshResult = await refreshSession(verifyResult.refreshToken);
    expect(refreshResult.accessToken).not.toBe(verifyResult.accessToken);
    expect(refreshResult.refreshToken).not.toBe(verifyResult.refreshToken);

    await expect(refreshSession(verifyResult.refreshToken)).rejects.toThrow("Invalid refresh token");

    const payload = jwt.verify(refreshResult.accessToken, env.JWT_SECRET) as jwt.JwtPayload;
    await logout(payload.session_id as string);

    await expect(requireAuth(refreshResult.accessToken)).rejects.toThrow("Session revoked or expired");
  });

  it("handles concurrent OTP requests for different phones", async () => {
    await Promise.all(
      PHONES.slice(0, 4).map((phone) => requestOTP(phone, { ip: "127.0.0.1" })),
    );

    const client = await getTransactionClient();
    try {
      const { rows } = await client.query(
        "SELECT phone_number, COUNT(*) as cnt FROM otp_challenges WHERE phone_number LIKE '+233000000001%' GROUP BY phone_number",
      );
      expect(rows).toHaveLength(4);
    } finally {
      client.release();
    }
  });
});

describe("OTP security", () => {
  it("always returns void from requestOTP", async () => {
    const result = await requestOTP("+2330000000099", { ip: "127.0.0.1" });
    expect(result).toBeUndefined();
  });

  it("rejects expired OTP", async () => {
    const phone = PHONES[0]!;
    const code = "123456";
    const client = await getTransactionClient();
    try {
      await client.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() - INTERVAL '1 minute')`,
        [phone, crypto.createHash("sha256").update(code + env.OTP_PEPPER).digest("hex")],
      );
    } finally {
      client.release();
    }

    await expect(verifyOTP(phone, code)).rejects.toThrow("OTP expired or not found");
  });

  it("rejects consumed OTP", async () => {
    const phone = PHONES[0]!;
    const code = "123456";
    const client = await getTransactionClient();
    try {
      await client.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at, consumed_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes', NOW())`,
        [phone, crypto.createHash("sha256").update(code + env.OTP_PEPPER).digest("hex")],
      );
    } finally {
      client.release();
    }

    await expect(verifyOTP(phone, code)).rejects.toThrow("OTP expired or not found");
  });

  it("locks after 5 wrong attempts", async () => {
    const phone = PHONES[0]!;
    const code = "123456";
    const client = await getTransactionClient();
    try {
      await client.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
        [phone, crypto.createHash("sha256").update(code + env.OTP_PEPPER).digest("hex")],
      );
    } finally {
      client.release();
    }

    for (let i = 0; i < 5; i++) {
      try { await verifyOTP(phone, "000000"); } catch {}
    }

    await expect(verifyOTP(phone, "000000")).rejects.toThrow("OTP locked");
  });
});

describe("Token rotation", () => {
  it("issues new tokens on refresh, old refresh is revoked", async () => {
    const phone = PHONES[0]!;
    const client = await getTransactionClient();
    let userId: string;
    try {
      const { rows } = await client.query<{ user_id: string }>(
        `INSERT INTO users (user_id, phone_number) VALUES (gen_random_uuid(), $1) RETURNING user_id`,
        [phone],
      );
      userId = rows[0]!.user_id;
    } finally {
      client.release();
    }

    const tokens1 = await refreshSession as any !== undefined ? undefined : undefined;
    // Actually just create a session directly
    const { createSession } = await import("./auth.js");
    const session1 = await createSession(userId);
    const session2 = await refreshSession(session1.refreshToken);

    expect(session2.refreshToken).not.toBe(session1.refreshToken);

    const client2 = await getTransactionClient();
    try {
      const { rows } = await client2.query<{ revoked_at: Date | null }>(
        "SELECT revoked_at FROM auth_sessions WHERE refresh_token_hash = $1",
        [crypto.createHash("sha256").update(session1.refreshToken).digest("hex")],
      );
      expect(rows[0]!.revoked_at).not.toBeNull();
    } finally {
      client2.release();
    }
  });
});

describe("Device binding", () => {
  it("creates session with device_id from fingerprint", async () => {
    const phone = PHONES[0]!;
    const client = await getTransactionClient();
    let userId: string;
    try {
      const { rows } = await client.query<{ user_id: string }>(
        `INSERT INTO users (user_id, phone_number) VALUES (gen_random_uuid(), $1) RETURNING user_id`,
        [phone],
      );
      userId = rows[0]!.user_id;
    } finally {
      client.release();
    }

    const { createSession } = await import("./auth.js");
    const { accessToken } = await createSession(userId, "fingerprint-abc");

    const client2 = await getTransactionClient();
    try {
      const { rows } = await client2.query<{ device_id: string | null }>(
        "SELECT device_id FROM auth_sessions WHERE user_id = $1",
        [userId],
      );
      expect(rows[0]!.device_id).toBe("fingerprint-abc");
    } finally {
      client2.release();
    }
  });
});

describe("JWT claims", () => {
  it("includes sub, session_id, kyc_tier, role in the access token", async () => {
    const phone = PHONES[0]!;
    const client = await getTransactionClient();
    let userId: string;
    try {
      const { rows } = await client.query<{ user_id: string }>(
        `INSERT INTO users (user_id, phone_number) VALUES (gen_random_uuid(), $1) RETURNING user_id`,
        [phone],
      );
      userId = rows[0]!.user_id;
    } finally {
      client.release();
    }

    const { createSession } = await import("./auth.js");
    const { accessToken } = await createSession(userId);
    const payload = jwt.verify(accessToken, env.JWT_SECRET) as jwt.JwtPayload;

    expect(payload.sub).toBe(userId);
    expect(typeof payload.session_id).toBe("string");
    expect(payload.kyc_tier).toBe(0);
    expect(payload.role).toBeDefined();
  });

  it("has 15-minute expiry", async () => {
    const phone = PHONES[0]!;
    const client = await getTransactionClient();
    let userId: string;
    try {
      const { rows } = await client.query<{ user_id: string }>(
        `INSERT INTO users (user_id, phone_number) VALUES (gen_random_uuid(), $1) RETURNING user_id`,
        [phone],
      );
      userId = rows[0]!.user_id;
    } finally {
      client.release();
    }

    const { createSession } = await import("./auth.js");
    const { accessToken } = await createSession(userId);
    const payload = jwt.verify(accessToken, env.JWT_SECRET) as jwt.JwtPayload;

    const exp = payload.exp!;
    const iat = payload.iat!;
    expect(exp - iat).toBe(900);
  });
});

describe("Edge cases", () => {
  it("upserts user on repeated OTP verify (user_id stays same)", async () => {
    const phone = PHONES[0]!;
    const code = "111111";
    const client = await getTransactionClient();
    try {
      await client.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
        [phone, crypto.createHash("sha256").update(code + env.OTP_PEPPER).digest("hex")],
      );
    } finally {
      client.release();
    }

    const result1 = await verifyOTP(phone, code);

    const code2 = "222222";
    const client2 = await getTransactionClient();
    try {
      await client2.query(
        `INSERT INTO otp_challenges (challenge_id, phone_number, code_hash, expires_at) VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '5 minutes')`,
        [phone, crypto.createHash("sha256").update(code2 + env.OTP_PEPPER).digest("hex")],
      );
    } finally {
      client2.release();
    }

    const result2 = await verifyOTP(phone, code2);
    expect(result1.userId).toBe(result2.userId);
  });
});
