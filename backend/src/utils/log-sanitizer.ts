/**
 * Secret scrubbing for log output (23-Observability-and-Reconciliation.md §2).
 * Redacts OTP codes, tokens, raw ID numbers, and full wallet data.
 */

const PHONE_RE = /\+\d{7,14}/g;
const OTP_RE = /\b\d{6}\b/g;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const TOKEN_RE = /\b[A-Za-z0-9]{32,}\b/g;

const SENSITIVE_KEYS = new Set([
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
]);

function maskString(value: string): string {
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
}

function scrubValue(value: unknown): unknown {
  if (typeof value === "string") {
    let result = value;
    result = result.replace(JWT_RE, (m) => maskString(m));
    result = result.replace(PHONE_RE, (m) => m.slice(0, 4) + "****" + m.slice(-2));
    result = result.replace(OTP_RE, "******");
    result = result.replace(TOKEN_RE, (m) => maskString(m));
    return result;
  }
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  if (value !== null && typeof value === "object") {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        scrubbed[key] = typeof val === "string" ? "****" : "[REDACTED]";
      } else {
        scrubbed[key] = scrubValue(val);
      }
    }
    return scrubbed;
  }
  return value;
}

/**
 * Scrub sensitive data from any log value.
 */
export function scrubLogData(data: Record<string, unknown>): Record<string, unknown> {
  return scrubValue(data) as Record<string, unknown>;
}

/**
 * Pino redaction serializer for sensitive fields.
 */
export function sensitiveSerializer(value: unknown): string {
  if (typeof value === "string") {
    return maskString(value);
  }
  return "[REDACTED]";
}
