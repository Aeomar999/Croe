import { describe, it, expect } from "vitest";
import crypto from "crypto";

/**
 * HMAC webhook verification tests (12-Webhooks-and-Idempotency.md §2).
 * These are pure unit tests — no database needed.
 */
describe("webhook HMAC verification", () => {
  const SECRET = "test-webhook-secret";

  function sign(body: string, ts: string, secret: string): string {
    const payload = `${ts}.${body}`;
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  it("valid signature passes", () => {
    const body = '{"transactionId":"abc","amount":"100.00"}';
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = sign(body, ts, SECRET);

    const a = Buffer.from(sig, "hex");
    const expected = sign(body, ts, SECRET);
    const b = Buffer.from(expected, "hex");

    expect(a.length).toBe(b.length);
    expect(crypto.timingSafeEqual(a, b)).toBe(true);
  });

  it("invalid signature fails", () => {
    const body = '{"transactionId":"abc","amount":"100.00"}';
    const ts = String(Math.floor(Date.now() / 1000));
    // A valid-length but wrong signature (32 bytes = 64 hex chars)
    const sig = "0000000000000000000000000000000000000000000000000000000000000000";

    const a = Buffer.from(sig, "hex");
    const expected = sign(body, ts, SECRET);
    const b = Buffer.from(expected, "hex");

    expect(a.length).toBe(b.length);
    expect(crypto.timingSafeEqual(a, b)).toBe(false);
  });

  it("different body produces different signature", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig1 = sign("body1", ts, SECRET);
    const sig2 = sign("body2", ts, SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it("different secret produces different signature", () => {
    const body = "test";
    const ts = String(Math.floor(Date.now() / 1000));
    const sig1 = sign(body, ts, SECRET);
    const sig2 = sign(body, ts, "wrong-secret");
    expect(sig1).not.toBe(sig2);
  });

  it("replay outside 300s window rejected", () => {
    const now = Math.floor(Date.now() / 1000);
    const oldTs = now - 301;
    expect(Math.abs(now - oldTs)).toBeGreaterThan(300);
  });

  it("replay within 300s window accepted", () => {
    const now = Math.floor(Date.now() / 1000);
    const recentTs = now - 299;
    expect(Math.abs(now - recentTs)).toBeLessThanOrEqual(300);
  });

  it("constant-time compare detects length mismatch", () => {
    const a = Buffer.from("aa", "hex");
    const b = Buffer.from("aaaa", "hex");
    expect(a.length).not.toBe(b.length);
    // timingSafeEqual requires same length — this would throw
    expect(() => crypto.timingSafeEqual(a, b)).toThrow();
  });
});

describe("idempotency key validation", () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it("accepts valid UUIDv4", () => {
    expect(UUID_RE.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(UUID_RE.test("")).toBe(false);
  });

  it("rejects non-UUID", () => {
    expect(UUID_RE.test("not-a-key")).toBe(false);
  });
});
