import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../config/logger.js", () => ({ logger: mockLogger }));

const { MockSmsProvider } = await import("./mock-provider.js");
const { ArkeselSmsProvider } = await import("./arkesel-provider.js");
const { selectSmsProvider } = await import("./index.js");

describe("MockSmsProvider (task.md T7.9)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs the OTP in development so local testers can sign in", async () => {
    await new MockSmsProvider("development").sendOtp("+233240000000", "123456");
    expect(JSON.stringify(mockLogger.info.mock.calls)).toContain("123456");
  });

  it("never logs the OTP on staging or production", async () => {
    await new MockSmsProvider("production").sendOtp("+233240000000", "654321");
    const everything = JSON.stringify([mockLogger.info.mock.calls, mockLogger.warn.mock.calls]);
    expect(everything).not.toContain("654321");
    expect(everything).not.toContain("+233240000000");
  });
});

describe("selectSmsProvider", () => {
  it("uses the mock in tests even with a key", () => {
    expect(selectSmsProvider({ NODE_ENV: "test", ARKESEL_SMS_API_KEY: "k" })).toBeInstanceOf(MockSmsProvider);
  });

  it("uses Arkesel whenever a key is configured outside tests", () => {
    expect(selectSmsProvider({ NODE_ENV: "production", ARKESEL_SMS_API_KEY: "k" })).toBeInstanceOf(ArkeselSmsProvider);
  });

  it("falls back to the redacting mock on keyless staging", () => {
    expect(selectSmsProvider({ NODE_ENV: "production", ARKESEL_SMS_API_KEY: "" })).toBeInstanceOf(MockSmsProvider);
  });
});
