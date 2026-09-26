import { config } from "dotenv";
import { resolve } from "path";
import { parseFeeSchedule } from "./fees.js";

config({ path: resolve(import.meta.dirname, "../../.env") });

export const CUSTODY_PHASES = ["P0", "P1", "P2", "P3"] as const;
export type CustodyPhase = (typeof CUSTODY_PHASES)[number];

/** Minimum length for signing keys and peppers in production (32 random bytes, task.md T7.8). */
const MIN_PRODUCTION_SECRET_LENGTH = 32;

type Source = Record<string, string | undefined>;

/**
 * Parse and validate configuration from `source` (task.md T3.7).
 *
 * Collects every problem and throws once, so a misconfigured deploy fails at
 * boot with the full list instead of failing later on the first request that
 * touches a missing value:
 *   - always:                    DATABASE_URL, MOMO_WEBHOOK_SECRET, JWT_SECRET, OTP_PEPPER;
 *                                CUSTODY_PHASE ∈ {P0,P1,P2,P3} (exact case)
 *   - CUSTODY_PHASE ≠ P0:         aggregator, Paystack webhook and SMS credentials
 *   - NODE_ENV = production:     evidence storage (S3/R2) and strong secrets
 */
export function loadEnv(source: Source = process.env) {
  const problems: string[] = [];

  const read = (name: string): string => source[name]?.trim() ?? "";
  const required = (name: string): string => {
    const value = read(name);
    if (!value) problems.push(`${name} is required`);
    return value;
  };
  const requiredWhen = (condition: boolean, reason: string, name: string): string => {
    const value = read(name);
    if (condition && !value) problems.push(`${name} is required when ${reason}`);
    return value;
  };
  const positiveInt = (name: string, fallback: number): number => {
    const raw = read(name);
    if (!raw) return fallback;
    if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
      problems.push(`${name} must be a positive whole number, got "${raw}"`);
      return fallback;
    }
    return Number(raw);
  };

  const NODE_ENV = read("NODE_ENV") || "development";
  const isProduction = NODE_ENV === "production";

  const rawPhase = read("CUSTODY_PHASE") || "P0";
  const phaseValid = (CUSTODY_PHASES as readonly string[]).includes(rawPhase);
  if (!phaseValid) {
    problems.push(`CUSTODY_PHASE must be one of ${CUSTODY_PHASES.join(", ")}, got "${rawPhase}"`);
  }
  const CUSTODY_PHASE = rawPhase as CustodyPhase;
  const livePhase = phaseValid && rawPhase !== "P0";
  const liveReason = `CUSTODY_PHASE=${rawPhase}`;

  const JWT_SECRET = required("JWT_SECRET");
  const OTP_PEPPER = required("OTP_PEPPER");
  if (isProduction) {
    for (const [name, value] of [["JWT_SECRET", JWT_SECRET], ["OTP_PEPPER", OTP_PEPPER]] as const) {
      if (value && value.length < MIN_PRODUCTION_SECRET_LENGTH) {
        problems.push(`${name} must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`);
      }
    }
  }

  const values = {
    NODE_ENV,
    PORT: positiveInt("PORT", 8080),
    DATABASE_URL: required("DATABASE_URL"),
    REDIS_URL: read("REDIS_URL") || "redis://localhost:6379",
    MOMO_WEBHOOK_SECRET: required("MOMO_WEBHOOK_SECRET"),
    // Paystack signs webhooks with the account secret key (HMAC-SHA512), so this
    // must equal the Paystack secret key and be rotated with it (task.md T1.5/T7.8).
    PAYSTACK_WEBHOOK_SECRET: requiredWhen(livePhase, liveReason, "PAYSTACK_WEBHOOK_SECRET"),
    JWT_SECRET,
    OTP_PEPPER,
    CUSTODY_PHASE,
    AGGREGATOR_API_KEY: requiredWhen(livePhase, liveReason, "AGGREGATOR_API_KEY"),
    AGGREGATOR_BASE_URL: requiredWhen(livePhase, liveReason, "AGGREGATOR_BASE_URL"),
    ARKESEL_SMS_API_KEY: requiredWhen(livePhase, liveReason, "ARKESEL_SMS_API_KEY"),
    LLM_URL: read("LLM_URL") || "http://localhost:11434",
    LLM_MODEL: read("LLM_MODEL"),
    S3_BUCKET: requiredWhen(isProduction, "NODE_ENV=production", "S3_BUCKET"),
    S3_REGION: requiredWhen(isProduction, "NODE_ENV=production", "S3_REGION"),
    S3_ENDPOINT: read("S3_ENDPOINT"),
    S3_ACCESS_KEY: requiredWhen(isProduction, "NODE_ENV=production", "S3_ACCESS_KEY"),
    S3_SECRET_KEY: requiredWhen(isProduction, "NODE_ENV=production", "S3_SECRET_KEY"),
    // Comma-separated exact origins. Default: the admin console dev server.
    CORS_ORIGIN: read("CORS_ORIGIN") || "http://localhost:3001",

    // Rate limiting
    RATE_LIMIT_AUTH_MAX: positiveInt("RATE_LIMIT_AUTH_MAX", 5),
    RATE_LIMIT_OTP_MAX: positiveInt("RATE_LIMIT_OTP_MAX", 3),
    RATE_LIMIT_PAYMENT_MAX: positiveInt("RATE_LIMIT_PAYMENT_MAX", 10),
    RATE_LIMIT_EVIDENCE_MAX: positiveInt("RATE_LIMIT_EVIDENCE_MAX", 10),
    RATE_LIMIT_DISPUTE_MAX: positiveInt("RATE_LIMIT_DISPUTE_MAX", 5),
    RATE_LIMIT_ADMIN_MAX: positiveInt("RATE_LIMIT_ADMIN_MAX", 20),

    // Data retention (jobs/retention.ts). Values to be confirmed by legal (task.md T8.6).
    /** Notifications older than this are purged (unless tied to an open dispute). */
    RETENTION_NOTIFICATION_DAYS: positiveInt("RETENTION_NOTIFICATION_DAYS", 30),
    /** Expired or revoked auth sessions are kept this long after expiry, then purged. */
    RETENTION_SESSION_DAYS: positiveInt("RETENTION_SESSION_DAYS", 7),

    // Alerting
    ALERT_WEBHOOK_URL: read("ALERT_WEBHOOK_URL"),

    // Fees per market: COMMISSION_BPS, BUYER_PROTECTION_FEE_BPS, optional _<CUR> overrides
    FEE_SCHEDULE: (() => {
      try {
        return parseFeeSchedule(source);
      } catch (err) {
        problems.push((err as Error).message);
        return parseFeeSchedule({});
      }
    })(),
  } as const;

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${problems.join("\n  - ")}`);
  }
  return values;
}

export type Env = ReturnType<typeof loadEnv>;

export const env: Env = loadEnv();
