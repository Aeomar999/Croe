import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const { mockPoolQuery, mockPing } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
  mockPing: vi.fn(),
}));

vi.mock("../db/pool.js", () => ({
  pool: { query: mockPoolQuery, totalCount: 2, idleCount: 1, waitingCount: 0 },
}));
vi.mock("../config/redis.js", () => ({ redis: { ping: mockPing } }));
vi.mock("../config/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { default: healthRoutes } = await import("./health.js");

const app = express();
app.use("/", healthRoutes);

describe("health routes (task.md T3.10)", () => {
  beforeEach(() => {
    mockPoolQuery.mockReset().mockResolvedValue({ rows: [{ "?column?": 1 }] });
    mockPing.mockReset().mockResolvedValue("PONG");
  });

  it("GET /health/ready returns 200 when PostgreSQL and Redis answer", async () => {
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.checks.database.ok).toBe(true);
    expect(res.body.checks.redis.ok).toBe(true);
  });

  it("GET /health/ready returns 503 during a Redis outage", async () => {
    mockPing.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.checks.redis.ok).toBe(false);
    expect(res.body.checks.database.ok).toBe(true);
  });

  it("GET /health/ready returns 503 when the database is down", async () => {
    mockPoolQuery.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.checks.database.ok).toBe(false);
  });

  it("GET /health stays a database-only liveness probe", async () => {
    mockPing.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});
