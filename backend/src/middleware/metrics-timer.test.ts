import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../services/metrics.js", () => ({
  metrics: { recordHistogram: vi.fn() },
}));

import { metricsTimer } from "./metrics-timer.js";
import { metrics } from "../services/metrics.js";

function mockReqRes(method = "GET", path = "/test", routePath?: string) {
  const req = {
    method,
    path,
    route: routePath !== undefined ? { path: routePath } : undefined,
  } as any;
  const res = {
    statusCode: 200,
    on: vi.fn(),
  } as any;
  const next = vi.fn();
  return { req, res, next };
}

describe("metricsTimer middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls next immediately", () => {
    const { req, res, next } = mockReqRes();
    metricsTimer(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("registers a finish listener", () => {
    const { req, res, next } = mockReqRes();
    metricsTimer(req, res, next);
    expect(res.on).toHaveBeenCalledWith("finish", expect.any(Function));
  });

  it("records histogram on finish event", () => {
    const spy = vi.spyOn(metrics, "recordHistogram");

    const { req, res, next } = mockReqRes("POST", "/api/escrow", "/api/escrow");
    metricsTimer(req, res, next);

    const finishCb = res.on.mock.calls.find((c: any[]) => c[0] === "finish")?.[1];
    expect(finishCb).toBeDefined();
    finishCb();

    expect(spy).toHaveBeenCalledWith(
      "http_request_duration_ms",
      expect.any(Number),
      {
        method: "POST",
        path: "/api/escrow",
        status: "200",
      },
    );
  });

  it("falls back to req.path when req.route is undefined", () => {
    const spy = vi.spyOn(metrics, "recordHistogram");

    const { req, res, next } = mockReqRes("GET", "/fallback/path");
    metricsTimer(req, res, next);

    const finishCb = res.on.mock.calls.find((c: any[]) => c[0] === "finish")?.[1];
    finishCb();

    expect(spy).toHaveBeenCalledWith(
      "http_request_duration_ms",
      expect.any(Number),
      {
        method: "GET",
        path: "/fallback/path",
        status: "200",
      },
    );
  });
});
