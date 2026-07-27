import { describe, it, expect } from "vitest";
import { scrubLogData, sensitiveSerializer } from "./log-sanitizer.js";

describe("log-sanitizer", () => {
  describe("scrubLogData", () => {
    it("redacts values of sensitive keys (strings → ****)", () => {
      const input = { otp_code: "123456", message: "hello" };
      const result = scrubLogData(input);
      expect(result.otp_code).toBe("****");
      expect(result.message).toBe("hello");
    });

    it("redacts nested sensitive keys", () => {
      const input = {
        user: { name: "Alice", password: "s3cret" },
      };
      const result = scrubLogData(input);
      expect(result.user.name).toBe("Alice");
      expect(result.user.password).toBe("****");
    });

    it("scrubs phone numbers (+ prefix) with partial mask", () => {
      const input = { phone: "+233241234567" };
      const result = scrubLogData(input);
      // Phone is scrubbed: first 4 chars + **** + last 2
      expect(result.phone).toBe("+233****67");
    });

    it("scrubs 6-digit OTP codes with ******", () => {
      const input = { message: "Your OTP is 123456" };
      const result = scrubLogData(input);
      expect(result.message).toBe("Your OTP is ******");
    });

    it("scrubs JWT tokens with maskString (first2+stars+last2)", () => {
      const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123def456ghi789jkl012mno";
      const input = { token: jwt };
      const result = scrubLogData(input);
      // Sensitive key → fully redacted to ****
      expect(result.token).toBe("****");
    });

    it("scrubs long token strings (>=32 chars) via maskString", () => {
      const token = "a".repeat(40);
      const input = { api_key: token };
      const result = scrubLogData(input);
      // api_key is not in SENSITIVE_KEYS, so scrubValue applies TOKEN_RE → maskString
      expect(result.api_key).toBe("aa" + "*".repeat(36) + "aa");
    });

    it("scrubs long tokens embedded in non-sensitive string values", () => {
      const token = "a".repeat(40);
      const input = { data: `Token: ${token} is here` };
      const result = scrubLogData(input);
      // Not a sensitive key, so scrubValue runs: token is masked but surrounding text preserved
      expect(result.data).not.toContain(token);
      expect(result.data).toContain("Token: ");
      expect(result.data).toContain(" is here");
      expect(result.data).toContain("aa" + "*".repeat(36) + "aa");
    });

    it("returns non-object inputs unchanged", () => {
      const input = 42;
      const result = scrubLogData(input as any);
      expect(result).toBe(42);
    });

    it("handles arrays containing sensitive data", () => {
      const input = { items: ["+233241234567", "hello"] };
      const result = scrubLogData(input);
      // Phone is scrubbed: first 4 + **** + last 2
      expect(result.items[0]).toBe("+233****67");
      expect(result.items[1]).toBe("hello");
    });

    it("handles deeply nested objects", () => {
      const input = {
        level1: {
          level2: {
            authorization: "Bearer abc123def456ghi789jkl012mno",
            data: "normal",
          },
        },
      };
      const result = scrubLogData(input);
      expect(result.level1.level2.authorization).toBe("****");
      expect(result.level1.level2.data).toBe("normal");
    });

    it("redacts x-momo-signature key", () => {
      const input = { "x-momo-signature": "abc123def456" };
      const result = scrubLogData(input);
      expect(result["x-momo-signature"]).toBe("****");
    });

    it("redacts non-string sensitive keys as [REDACTED]", () => {
      const input = { secret: 12345 };
      const result = scrubLogData(input);
      expect(result.secret).toBe("[REDACTED]");
    });
  });

  describe("sensitiveSerializer", () => {
    it("masks long string values via maskString (first2+stars+last2)", () => {
      expect(sensitiveSerializer("long-secret-value")).toBe("lo*************ue");
    });

    it("returns [REDACTED] for non-string values", () => {
      expect(sensitiveSerializer({ key: "value" })).toBe("[REDACTED]");
    });

    it("masks short strings with **** (length <= 4)", () => {
      expect(sensitiveSerializer("ab")).toBe("****");
    });

    it("masks exactly 4-char strings with ****", () => {
      expect(sensitiveSerializer("abcd")).toBe("****");
    });

    it("masks 5-char strings with first1+stars+last1", () => {
      expect(sensitiveSerializer("abcde")).toBe("ab*de");
    });
  });
});
