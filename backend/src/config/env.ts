import { config } from "dotenv";
import { resolve } from "path";
import { parseFeeSchedule } from "./fees.js";

config({ path: resolve(import.meta.dirname, "../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "8080", 10),
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  MOMO_WEBHOOK_SECRET: required("MOMO_WEBHOOK_SECRET"),
  // Paystack signs webhooks with the account secret key (HMAC-SHA512), so this
  // must equal the Paystack secret key and be rotated with it (task.md T1.5/T7.8).
  PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET ?? "",
  JWT_SECRET: required("JWT_SECRET"),
  OTP_PEPPER: required("OTP_PEPPER"),
  CUSTODY_PHASE: (process.env.CUSTODY_PHASE ?? "P0") as "P0" | "P1" | "P2" | "P3",
  AGGREGATOR_API_KEY: process.env.AGGREGATOR_API_KEY ?? "",
  AGGREGATOR_BASE_URL: process.env.AGGREGATOR_BASE_URL ?? "",
  ARKESEL_SMS_API_KEY: process.env.ARKESEL_SMS_API_KEY ?? "",
  LLM_URL: process.env.LLM_URL ?? "http://localhost:11434",
  LLM_MODEL: process.env.LLM_MODEL ?? "",
  S3_BUCKET: process.env.S3_BUCKET ?? "",
  S3_REGION: process.env.S3_REGION ?? "",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? "",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? "",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  // Rate limiting
  RATE_LIMIT_AUTH_MAX: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? "5", 10),
  RATE_LIMIT_OTP_MAX: parseInt(process.env.RATE_LIMIT_OTP_MAX ?? "3", 10),
  RATE_LIMIT_PAYMENT_MAX: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX ?? "10", 10),
  RATE_LIMIT_EVIDENCE_MAX: parseInt(process.env.RATE_LIMIT_EVIDENCE_MAX ?? "10", 10),
  RATE_LIMIT_DISPUTE_MAX: parseInt(process.env.RATE_LIMIT_DISPUTE_MAX ?? "5", 10),
  RATE_LIMIT_ADMIN_MAX: parseInt(process.env.RATE_LIMIT_ADMIN_MAX ?? "20", 10),

  // Data retention
  RETENTION_NOTIFICATION_DAYS: parseInt(process.env.RETENTION_NOTIFICATION_DAYS ?? "30", 10),
  RETENTION_MESSAGE_DAYS: parseInt(process.env.RETENTION_MESSAGE_DAYS ?? "90", 10),
  RETENTION_SESSION_DAYS: parseInt(process.env.RETENTION_SESSION_DAYS ?? "7", 10),

  // Alerting
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL ?? "",

  // Fees per market: COMMISSION_BPS, BUYER_PROTECTION_FEE_BPS, optional _<CUR> overrides
  FEE_SCHEDULE: parseFeeSchedule(process.env),
} as const;
