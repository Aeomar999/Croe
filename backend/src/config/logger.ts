import pino from "pino";
import { env } from "./env.js";

const SENSITIVE_KEYS = [
  "otp_code",
  "code",
  "password",
  "token",
  "refresh_token",
  "access_token",
  "secret",
  "pepper",
  "authorization",
  "x-momo-signature",
  "momo_webhook_secret",
  "rawBody",
];

/**
 * Base logger — pino redact handles key-based removal; see utils/log-sanitizer.ts
 * for regex-based inline pattern scrubbing (phones, OTPs, JWTs, long tokens).
 * Use `scrubLogData()` when passing user-controlled strings to log calls.
 */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => {
      const serialized = pino.stdSerializers.req(req);
      if (serialized.headers) {
        delete serialized.headers.authorization;
      }
      return serialized;
    },
    res: pino.stdSerializers.res,
  },
  redact: {
    paths: SENSITIVE_KEYS.map((k) => `*.${k}`),
    remove: true,
  },
});
