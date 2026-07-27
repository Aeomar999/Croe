import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { forensicCapture } from "./forensic.js";

function fakeReq(opts: {
  ip?: string;
  headers?: Record<string, string>;
} = {}): Request {
  return {
    ip: opts.ip,
    socket: { remoteAddress: "127.0.0.1" },
    headers: opts.headers ?? {},
  } as unknown as Request;
}

describe("forensicCapture middleware", () => {
  it("captures req.ip as forensic.ip", () => {
    const req = fakeReq({ ip: "192.168.1.1" });
    const res = {} as Response;
    const next = vi.fn();
    forensicCapture(req, res, next);
    expect(req.forensic?.ip).toBe("192.168.1.1");
    expect(next).toHaveBeenCalledOnce();
  });

  it("falls back to socket.remoteAddress when req.ip is undefined", () => {
    const req = fakeReq({ ip: undefined });
    const res = {} as Response;
    const next = vi.fn();
    forensicCapture(req, res, next);
    expect(req.forensic?.ip).toBe("127.0.0.1");
  });

  it("falls back to 'unknown' when both ip and remoteAddress are missing", () => {
    const req = {
      ip: undefined,
      socket: {},
      headers: {},
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();
    forensicCapture(req, res, next);
    expect(req.forensic?.ip).toBe("unknown");
  });

  it("captures X-Device-Fingerprint header", () => {
    const req = fakeReq({ headers: { "x-device-fingerprint": "fp-abc-123" } });
    const res = {} as Response;
    const next = vi.fn();
    forensicCapture(req, res, next);
    expect(req.forensic?.deviceId).toBe("fp-abc-123");
  });

  it("defaults deviceId to 'unknown' when header missing", () => {
    const req = fakeReq();
    const res = {} as Response;
    const next = vi.fn();
    forensicCapture(req, res, next);
    expect(req.forensic?.deviceId).toBe("unknown");
  });

  it("captures X-Network-Type header", () => {
    const req = fakeReq({ headers: { "x-network-type": "4g" } });
    const res = {} as Response;
    const next = vi.fn();
    forensicCapture(req, res, next);
    expect(req.forensic?.networkType).toBe("4g");
  });

  it("defaults networkType to 'unknown' when header missing", () => {
    const req = fakeReq();
    const res = {} as Response;
    const next = vi.fn();
    forensicCapture(req, res, next);
    expect(req.forensic?.networkType).toBe("unknown");
  });

  it("captures all three fields together (AUD-02)", () => {
    const req = fakeReq({
      ip: "10.0.0.5",
      headers: {
        "x-device-fingerprint": "dev-999",
        "x-network-type": "wifi",
      },
    });
    const res = {} as Response;
    const next = vi.fn();
    forensicCapture(req, res, next);
    expect(req.forensic).toEqual({
      ip: "10.0.0.5",
      deviceId: "dev-999",
      networkType: "wifi",
    });
  });
});
