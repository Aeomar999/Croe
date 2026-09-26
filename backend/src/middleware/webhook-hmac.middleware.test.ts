import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

const mockEnv = vi.hoisted(() => ({
  MOMO_WEBHOOK_SECRET: "momo-secret",
  PAYSTACK_WEBHOOK_SECRET: "paystack-secret",
}));
vi.mock("../config/env.js", () => ({ env: mockEnv }));
vi.mock("../config/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { verifyMoMoWebhook } = await import("./webhook-hmac.js");

function run(headers: Record<string, string>, rawBody: Buffer) {
  const req = { headers, rawBody } as unknown as Request;
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const next = vi.fn() as unknown as NextFunction;
  verifyMoMoWebhook(req, res as unknown as Response, next);
  return { res, next };
}

const paystackSign = (body: Buffer, secret: string) =>
  crypto.createHmac("sha512", secret).update(body).digest("hex");

describe("verifyMoMoWebhook — Paystack secret isolation (task.md T1.5)", () => {
  const body = Buffer.from('{"event":"charge.success","data":{"reference":"ref-1"}}');

  beforeEach(() => {
    mockEnv.PAYSTACK_WEBHOOK_SECRET = "paystack-secret";
  });

  it("accepts a Paystack signature made with PAYSTACK_WEBHOOK_SECRET", () => {
    const { res, next } = run({ "x-paystack-signature": paystackSign(body, "paystack-secret") }, body);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("rejects a Paystack signature made with MOMO_WEBHOOK_SECRET", () => {
    const { res, next } = run({ "x-paystack-signature": paystackSign(body, "momo-secret") }, body);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("fails closed when PAYSTACK_WEBHOOK_SECRET is not configured", () => {
    mockEnv.PAYSTACK_WEBHOOK_SECRET = "";
    const { res, next } = run({ "x-paystack-signature": paystackSign(body, "") }, body);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("still verifies sandbox signatures with MOMO_WEBHOOK_SECRET", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac("sha256", "momo-secret").update(`${ts}.${body.toString("utf8")}`).digest("hex");
    const { next } = run({ "x-momo-signature": sig, "x-momo-timestamp": ts }, body);
    expect(next).toHaveBeenCalledOnce();
  });
});
