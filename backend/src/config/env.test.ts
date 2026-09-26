import { describe, it, expect } from "vitest";
import { loadEnv } from "./env.js";

const BASE = {
  DATABASE_URL: "postgresql://croe:test@localhost:5432/croe_test",
  MOMO_WEBHOOK_SECRET: "momo-secret",
  JWT_SECRET: "jwt-secret",
  OTP_PEPPER: "otp-pepper",
};

const STRONG = "x".repeat(32);

const LIVE_CREDENTIALS = {
  AGGREGATOR_API_KEY: "sk_test_x",
  AGGREGATOR_BASE_URL: "https://api.paystack.co",
  PAYSTACK_WEBHOOK_SECRET: "sk_test_x",
  ARKESEL_SMS_API_KEY: "arkesel-key",
};

const STORAGE = {
  TRUST_PROXY_HOPS: "1",
  S3_BUCKET: "croe-evidence",
  S3_REGION: "auto",
  S3_ACCESS_KEY: "access",
  S3_SECRET_KEY: "secret",
};

describe("loadEnv (task.md T3.7)", () => {
  it("loads a minimal P0 development config with defaults", () => {
    const env = loadEnv(BASE);
    expect(env.CUSTODY_PHASE).toBe("P0");
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(8080);
    expect(env.AGGREGATOR_API_KEY).toBe("");
  });

  it("rejects a mistyped CUSTODY_PHASE instead of silently selecting Paystack", () => {
    expect(() => loadEnv({ ...BASE, CUSTODY_PHASE: "p0" })).toThrow(/CUSTODY_PHASE must be one of P0, P1, P2, P3, got "p0"/);
  });

  it("requires aggregator, Paystack webhook and SMS credentials outside P0", () => {
    let message = "";
    try {
      loadEnv({ ...BASE, CUSTODY_PHASE: "P1" });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("AGGREGATOR_API_KEY is required when CUSTODY_PHASE=P1");
    expect(message).toContain("AGGREGATOR_BASE_URL is required when CUSTODY_PHASE=P1");
    expect(message).toContain("PAYSTACK_WEBHOOK_SECRET is required when CUSTODY_PHASE=P1");
    expect(message).toContain("ARKESEL_SMS_API_KEY is required when CUSTODY_PHASE=P1");
  });

  it("accepts P1 when every live credential is present", () => {
    expect(loadEnv({ ...BASE, ...LIVE_CREDENTIALS, CUSTODY_PHASE: "P1" }).CUSTODY_PHASE).toBe("P1");
  });

  it("requires evidence storage in production so uploads fail closed", () => {
    expect(() =>
      loadEnv({ ...BASE, NODE_ENV: "production", JWT_SECRET: STRONG, OTP_PEPPER: STRONG }),
    ).toThrow(/S3_BUCKET is required when NODE_ENV=production/);
  });

  it("rejects short signing secrets in production", () => {
    expect(() => loadEnv({ ...BASE, ...STORAGE, NODE_ENV: "production" })).toThrow(
      /JWT_SECRET must be at least 32 characters in production/,
    );
  });

  it("requires an explicit TRUST_PROXY_HOPS in production (task.md T7.1)", () => {
    const { TRUST_PROXY_HOPS: _omit, ...storageWithoutHops } = STORAGE;
    expect(() =>
      loadEnv({ ...BASE, ...storageWithoutHops, NODE_ENV: "production", JWT_SECRET: STRONG, OTP_PEPPER: STRONG }),
    ).toThrow(/TRUST_PROXY_HOPS is required when NODE_ENV=production/);
  });

  it("accepts a complete P0 production (staging) config", () => {
    const env = loadEnv({ ...BASE, ...STORAGE, NODE_ENV: "production", JWT_SECRET: STRONG, OTP_PEPPER: STRONG });
    expect(env.NODE_ENV).toBe("production");
  });

  it("reports every missing required variable at once", () => {
    let message = "";
    try {
      loadEnv({});
    } catch (err) {
      message = (err as Error).message;
    }
    for (const name of ["DATABASE_URL", "MOMO_WEBHOOK_SECRET", "JWT_SECRET", "OTP_PEPPER"]) {
      expect(message).toContain(`${name} is required`);
    }
  });

  it("rejects a non-numeric rate limit", () => {
    expect(() => loadEnv({ ...BASE, RATE_LIMIT_OTP_MAX: "three" })).toThrow(/RATE_LIMIT_OTP_MAX must be a positive whole number/);
  });

  it("surfaces an invalid fee rate as a config problem", () => {
    expect(() => loadEnv({ ...BASE, COMMISSION_BPS: "2.5" })).toThrow(/COMMISSION_BPS must be a whole number/);
  });
});
