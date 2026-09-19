import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recordRateLimitHit } from "./rate-limiter.js";

vi.mock("../config/redis.js", () => ({
  redis: {
    pipeline: vi.fn(() => ({
      exec: vi.fn().mockResolvedValue([
        [null, 0],
        [null, "OK"],
        [null, 1],
        [null, "OK"],
      ]),
    })),
  },
}));

vi.mock("../config/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import { logger } from "../config/logger.js";

describe("rate-limiter escalation tracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records first hit without escalation", () => {
    recordRateLimitHit("user-1");
    // No escalation log = pass
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "user-1" }),
      expect.any(String),
    );
  });

  it("escalates after 5 hits within the window", () => {
    for (let i = 0; i < 5; i++) {
      recordRateLimitHit("user-escalate");
    }

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "user-escalate", hits: 5 }),
      "Rate limit escalation threshold reached",
    );
  });

  it("resets counter after escalation", () => {
    for (let i = 0; i < 5; i++) {
      recordRateLimitHit("user-reset");
    }
    const warnCallsBefore = (logger.warn as any).mock.calls.length;

    recordRateLimitHit("user-reset");
    expect((logger.warn as any).mock.calls.length).toBe(warnCallsBefore);
  });

  it("resets counter after window expires", () => {
    recordRateLimitHit("user-window");
    recordRateLimitHit("user-window");
    recordRateLimitHit("user-window");

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    recordRateLimitHit("user-window");
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "user-window" }),
      expect.any(String),
    );
  });
});
