import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

vi.mock("../services/auth.js", () => ({
  requestOTP: vi.fn(),
  verifyOTP: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
  adminLogin: vi.fn(),
}));

vi.mock("../middleware/rate-limiter.js", () => {
  const pass = (_req: Request, _res: Response, next: NextFunction) => next();
  return { authRateLimiter: pass, otpRateLimiter: pass };
});

const { requestOTP } = await import("../services/auth.js");
const { AppError, errorHandler } = await import("../middleware/error-handler.js");
const { default: authRoutes } = await import("./auth.js");

const app = express();
app.use(express.json());
app.use("/v1", authRoutes);
app.use(errorHandler);

const mockedRequestOTP = vi.mocked(requestOTP);

describe("POST /v1/auth/otp/request (task.md T1.4)", () => {
  beforeEach(() => {
    mockedRequestOTP.mockReset();
  });

  it("returns 202 after the OTP is sent", async () => {
    mockedRequestOTP.mockResolvedValue(undefined);
    const res = await request(app).post("/v1/auth/otp/request").send({ phone_number: "+233240000000" });
    expect(res.status).toBe(202);
    expect(mockedRequestOTP).toHaveBeenCalledOnce();
  });

  it("returns 400 for an invalid phone number instead of pretending to send", async () => {
    const res = await request(app).post("/v1/auth/otp/request").send({ phone_number: "0240000000" });
    expect(res.status).toBe(400);
    expect(mockedRequestOTP).not.toHaveBeenCalled();
  });

  it("returns 503 when the database or SMS provider fails", async () => {
    mockedRequestOTP.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const res = await request(app).post("/v1/auth/otp/request").send({ phone_number: "+233240000000" });
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
  });

  it("keeps the 429 when the per-phone OTP limit is hit", async () => {
    mockedRequestOTP.mockRejectedValue(new AppError(429, "Too many requests", "OTP_RATE_LIMITED"));
    const res = await request(app).post("/v1/auth/otp/request").send({ phone_number: "+233240000000" });
    expect(res.status).toBe(429);
  });
});
