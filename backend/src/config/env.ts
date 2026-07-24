import { config } from "dotenv";
import { resolve } from "path";

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
  JWT_SECRET: required("JWT_SECRET"),
  OTP_PEPPER: required("OTP_PEPPER"),
  CUSTODY_PHASE: (process.env.CUSTODY_PHASE ?? "P0") as "P0" | "P1" | "P2" | "P3",
  AGGREGATOR_API_KEY: process.env.AGGREGATOR_API_KEY ?? "",
  AGGREGATOR_BASE_URL: process.env.AGGREGATOR_BASE_URL ?? "",
  LLM_URL: process.env.LLM_URL ?? "http://localhost:11434",
  LLM_MODEL: process.env.LLM_MODEL ?? "",
  S3_BUCKET: process.env.S3_BUCKET ?? "",
  S3_REGION: process.env.S3_REGION ?? "",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? "",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? "",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
} as const;
