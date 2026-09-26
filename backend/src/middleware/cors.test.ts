import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { env } from "../config/env.js";

describe("CORS allowlist (task.md T7.21)", () => {
  it("allows a configured origin with credentials", async () => {
    const origin = env.CORS_ORIGINS[0]!;
    const res = await request(app).get("/health").set("Origin", origin);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("does not allow a look-alike subdomain", async () => {
    const res = await request(app).get("/health").set("Origin", "https://evil.admin.croe.co");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    // Rejected by the browser, not answered with a 500.
    expect(res.status).not.toBe(500);
  });
});
