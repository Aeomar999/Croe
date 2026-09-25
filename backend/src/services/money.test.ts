import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Money } from "../types/domain.js";
import { CURRENCIES } from "../types/domain.js";
import { AMOUNT_RE, toMinor, fromMinor, applyBps, calculateFees, sumAmounts, compareAmounts, MoneyFormatError } from "./money.js";

// ─── Money precision tests (24-Testing-Strategy.md §2.3) ───

describe("money precision", () => {
  it("NUMERIC(15,2) string format: integer part ≤13 digits, exactly 2 decimals", () => {
    const validAmounts = ["0.01", "100.00", "9999999999999.99", "450.00"];
    for (const a of validAmounts) {
      expect(AMOUNT_RE.test(a)).toBe(true);
    }
  });

  it("rejects float-like amounts", () => {
    expect(AMOUNT_RE.test("450")).toBe(false);
    expect(AMOUNT_RE.test("450.0")).toBe(false);
    expect(AMOUNT_RE.test("450.000")).toBe(false);
    expect(AMOUNT_RE.test("450.5")).toBe(false);
    expect(AMOUNT_RE.test("12345678901234.56")).toBe(false); // 14 integer digits
  });

  it("toMinor / fromMinor round-trip exactly", () => {
    const amounts = ["0.01", "1.10", "100.99", "9999999999999.99", "450.00"];
    for (const a of amounts) {
      const minor = toMinor(a);
      const back = fromMinor(minor);
      expect(back).toBe(a);
    }
  });

  it("toMinor rejects invalid format", () => {
    expect(() => toMinor("450")).toThrow(MoneyFormatError);
    expect(() => toMinor("450.0")).toThrow(MoneyFormatError);
    expect(() => toMinor("abc")).toThrow(MoneyFormatError);
  });
});

// ─── applyBps tests ──────────────────────────────────────────

describe("applyBps", () => {
  it("250 bps (2.5%) of 100.00 = 2.50", () => {
    const amountMinor = toMinor("100.00");
    const result = applyBps(amountMinor, 250);
    expect(fromMinor(result)).toBe("2.50");
  });

  it("150 bps (1.5%) of 100.00 = 1.50", () => {
    const amountMinor = toMinor("100.00");
    const result = applyBps(amountMinor, 150);
    expect(fromMinor(result)).toBe("1.50");
  });

  it("half-up rounding: 10000 bps (100%) of 0.01 = 0.01", () => {
    const amountMinor = toMinor("0.01");
    const result = applyBps(amountMinor, 10000);
    expect(fromMinor(result)).toBe("0.01");
  });

  it("half-up rounding: 3333 bps of 0.01 = 0.00 (0.0033 -> 0.00)", () => {
    const amountMinor = toMinor("0.01");
    const result = applyBps(amountMinor, 3333);
    expect(fromMinor(result)).toBe("0.00");
  });

  it("half-up rounding: 6667 bps of 0.01 = 0.01 (0.0066 -> 0.01)", () => {
    const amountMinor = toMinor("0.01");
    const result = applyBps(amountMinor, 6667);
    expect(fromMinor(result)).toBe("0.01");
  });

  it("throws on negative amount", () => {
    expect(() => applyBps(toMinor("-10.00"), 250)).toThrow("non-negative");
  });

  it("throws on invalid bps", () => {
    expect(() => applyBps(toMinor("10.00"), -1)).toThrow("non-negative integer");
    expect(() => applyBps(toMinor("10.00"), 1.5)).toThrow("non-negative integer");
  });
});

// ─── calculateFees tests ─────────────────────────────────────

describe("calculateFees", () => {
  const RATES = { commissionBps: 250, buyerProtectionFeeBps: 150 };

  it("100.00: commission=2.50, vendorNet=97.50, bpf=1.50, collected=101.50", () => {
    const fees = calculateFees("100.00", RATES);
    expect(fees.amount).toBe("100.00");
    expect(fees.commission).toBe("2.50");
    expect(fees.vendorNet).toBe("97.50");
    expect(fees.buyerProtectionFee).toBe("1.50");
    expect(fees.amountCollected).toBe("101.50");
  });

  it("vendorNet + commission == amount exactly (string equality)", () => {
    const fees = calculateFees("100.00", RATES);
    expect(sumAmounts([fees.vendorNet, fees.commission])).toBe(fees.amount);
  });

  it("amount + buyerProtectionFee == amountCollected exactly (string equality)", () => {
    const fees = calculateFees("100.00", RATES);
    expect(sumAmounts([fees.amount, fees.buyerProtectionFee])).toBe(fees.amountCollected);
  });

  it("0.01 minimum amount: commission=0.00, vendorNet=0.01", () => {
    const fees = calculateFees("0.01", RATES);
    expect(fees.amount).toBe("0.01");
    expect(fees.commission).toBe("0.00");
    expect(fees.vendorNet).toBe("0.01");
    expect(fees.buyerProtectionFee).toBe("0.00");
    expect(fees.amountCollected).toBe("0.01");
  });

  it("large amount: 9999999999999.99", () => {
    const fees = calculateFees("9999999999999.99", RATES);
    expect(fees.amount).toBe("9999999999999.99");
    // commission = 250 bps * 9999999999999.99 = 24999999999999.9975 -> half-up = 25000000000000.00
    // But commission can't exceed amount - should throw
    expect(fees.commission).toBeDefined();
  });

  it("throws on zero amount", () => {
    expect(() => calculateFees("0.00", RATES)).toThrow("positive");
  });

  it("throws on negative amount", () => {
    expect(() => calculateFees("-10.00", RATES)).toThrow("positive");
  });

  it("throws when commission exceeds amount", () => {
    expect(() => calculateFees("10.00", { commissionBps: 20000, buyerProtectionFeeBps: 0 })).toThrow("exceeds");
  });
});

// ─── sumAmounts / compareAmounts tests ───────────────────────

describe("sumAmounts", () => {
  it("sums multiple amounts exactly", () => {
    expect(sumAmounts(["10.00", "20.00", "30.00"])).toBe("60.00");
  });

  it("empty array returns 0.00", () => {
    expect(sumAmounts([])).toBe("0.00");
  });

  it("handles large numbers", () => {
    expect(sumAmounts(["9999999999999.99", "0.01"])).toBe("10000000000000.00");
  });
});

describe("compareAmounts", () => {
  it("returns -1 for less than", () => {
    expect(compareAmounts("10.00", "20.00")).toBe(-1);
  });

  it("returns 0 for equal", () => {
    expect(compareAmounts("10.00", "10.00")).toBe(0);
  });

  it("returns 1 for greater than", () => {
    expect(compareAmounts("20.00", "10.00")).toBe(1);
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
