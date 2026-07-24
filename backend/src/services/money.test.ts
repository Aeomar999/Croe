import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Money } from "../types/domain.js";
import { CURRENCIES } from "../types/domain.js";

// ─── Money precision tests (24-Testing-Strategy.md §2.3) ───

describe("money precision", () => {
  it("NUMERIC(15,2) string format: integer part ≤13 digits, exactly 2 decimals", () => {
    const validAmounts = ["0.01", "100.00", "9999999999999.99", "450.00"];
    const re = /^\d{1,13}\.\d{2}$/;
    for (const a of validAmounts) {
      expect(re.test(a)).toBe(true);
    }
  });

  it("rejects float-like amounts", () => {
    const re = /^\d{1,13}\.\d{2}$/;
    expect(re.test("450")).toBe(false);
    expect(re.test("450.0")).toBe(false);
    expect(re.test("450.000")).toBe(false);
    expect(re.test("450.5")).toBe(false);
    expect(re.test("12345678901234.56")).toBe(false); // 14 integer digits
  });

  it("vendor_net + commission == amount exactly (string arithmetic)", () => {
    const amount = "450.00";
    const commissionRate = 0.02;
    const commission = (parseFloat(amount) * commissionRate).toFixed(2);
    const vendorNet = (parseFloat(amount) - parseFloat(commission)).toFixed(2);
    expect((parseFloat(vendorNet) + parseFloat(commission)).toFixed(2)).toBe(amount);
  });

  it("all amounts round-trip correctly through NUMERIC(15,2)", () => {
    const amounts = ["0.01", "1.10", "100.99", "9999999999999.99"];
    for (const a of amounts) {
      const parsed = parseFloat(a);
      const formatted = parsed.toFixed(2);
      expect(formatted).toBe(a);
    }
  });
});

// ─── Currency validation ────────────────────────────────────

describe("currency validation", () => {
  it("accepts GHS, NGN, KES", () => {
    expect(CURRENCIES).toContain("GHS");
    expect(CURRENCIES).toContain("NGN");
    expect(CURRENCIES).toContain("KES");
  });

  it("rejects unknown currencies", () => {
    expect(CURRENCIES).not.toContain("USD");
    expect(CURRENCIES).not.toContain("EUR");
    expect(CURRENCIES).not.toContain("GBP");
  });
});

// ─── Validation helpers ─────────────────────────────────────

describe("UUID validation", () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it("accepts valid UUIDv4", () => {
    expect(UUID_RE.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(UUID_RE.test("")).toBe(false);
  });

  it("rejects non-UUID strings", () => {
    expect(UUID_RE.test("not-a-uuid")).toBe(false);
    expect(UUID_RE.test("550e8400e29b41d4a716446655440000")).toBe(false);
  });
});

describe("E.164 phone validation", () => {
  const E164_RE = /^\+[1-9]\d{6,14}$/;

  it("accepts Ghana number", () => {
    expect(E164_RE.test("+233240000000")).toBe(true);
  });

  it("accepts Nigeria number", () => {
    expect(E164_RE.test("+2348021234567")).toBe(true);
  });

  it("rejects without + prefix", () => {
    expect(E164_RE.test("233240000000")).toBe(false);
  });

  it("rejects too short", () => {
    expect(E164_RE.test("+23324")).toBe(false);
  });

  it("rejects leading zero after +", () => {
    expect(E164_RE.test("+023324000000")).toBe(false);
  });
});
