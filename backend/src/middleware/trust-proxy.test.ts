import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { loadEnv } from "../config/env.js";
import { app } from "../app.js";

/** Minimal app with the same trust-proxy setting as app.ts, echoing req.ip. */
function echoIp(hops: number) {
  const a = express();
  a.set("trust proxy", hops);
  a.get("/ip", (req, res) => {
    res.json({ ip: req.ip });
  });
  return a;
}

describe("trust proxy (task.md T7.1)", () => {
  it("app.ts trusts exactly TRUST_PROXY_HOPS, never `true`", () => {
    expect(app.get("trust proxy")).toBe(Number(process.env.TRUST_PROXY_HOPS ?? 0));
    expect(app.get("trust proxy")).not.toBe(true);
  });

  it("with one hop (Render), req.ip is the client address Render appended", async () => {
    const res = await request(echoIp(1)).get("/ip").set("X-Forwarded-For", "41.66.1.10");
    expect(res.body.ip).toBe("41.66.1.10");
  });

  it("ignores a spoofed extra X-Forwarded-For hop sent by the client", async () => {
    // Client sends "6.6.6.6"; Render appends the real client IP.
    const res = await request(echoIp(1)).get("/ip").set("X-Forwarded-For", "6.6.6.6, 41.66.1.10");
    expect(res.body.ip).toBe("41.66.1.10");
  });

  it("with two hops (Cloudflare + Render), skips exactly the two proxies", async () => {
    const res = await request(echoIp(2))
      .get("/ip")
      .set("X-Forwarded-For", "6.6.6.6, 41.66.1.10, 172.70.0.1");
    expect(res.body.ip).toBe("41.66.1.10");
  });

  it("with zero hops (local), X-Forwarded-For is ignored entirely", async () => {
    const res = await request(echoIp(0)).get("/ip").set("X-Forwarded-For", "6.6.6.6");
    expect(res.body.ip).not.toBe("6.6.6.6");
  });

  it("rejects a non-numeric TRUST_PROXY_HOPS such as `true`", () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: "postgres://x",
        MOMO_WEBHOOK_SECRET: "m",
        JWT_SECRET: "j",
        OTP_PEPPER: "o",
        TRUST_PROXY_HOPS: "true",
      }),
    ).toThrow(/TRUST_PROXY_HOPS must be the exact number of trusted proxy hops/);
  });
});
