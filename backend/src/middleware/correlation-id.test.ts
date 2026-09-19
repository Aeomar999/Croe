import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { correlationId } from "./correlation-id.js";

function mockReqRes(correlationIdHeader?: string) {
  const req = {
    headers: {} as Record<string, string | string[] | undefined>,
    correlationId: "",
  };
  if (correlationIdHeader !== undefined) {
    req.headers["x-correlation-id"] = correlationIdHeader;
  }
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
  };
  const next = vi.fn();
  return { req: req as any, res: res as any, next };
}

describe("correlationId middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates a UUID when no incoming header", () => {
    const { req, res, next } = mockReqRes();
    correlationId(req, res, next);
    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("propagates incoming x-correlation-id when valid", () => {
    const incoming = "trace-abc-123";
    const { req, res, next } = mockReqRes(incoming);
    correlationId(req, res, next);
    expect(req.correlationId).toBe(incoming);
  });

  it("generates UUID when header is empty string", () => {
    const { req, res, next } = mockReqRes("");
    correlationId(req, res, next);
    expect(req.correlationId).not.toBe("");
    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("generates UUID when header exceeds 128 chars", () => {
    const longHeader = "x".repeat(129);
    const { req, res, next } = mockReqRes(longHeader);
    correlationId(req, res, next);
    expect(req.correlationId).not.toBe(longHeader);
    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("accepts header of exactly 128 chars", () => {
    const header128 = "a".repeat(128);
    const { req, res, next } = mockReqRes(header128);
    correlationId(req, res, next);
    expect(req.correlationId).toBe(header128);
  });

  it("generates UUID when header is an array (malformed)", () => {
    const { req, res, next } = mockReqRes();
    req.headers["x-correlation-id"] = ["first", "second"] as any;
    correlationId(req, res, next);
    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("sets x-correlation-id response header", () => {
    const { req, res, next } = mockReqRes();
    correlationId(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith("x-correlation-id", req.correlationId);
  });
});
