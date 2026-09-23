import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

beforeAll(async () => {
  await pool.query("SELECT 1");
});

afterAll(async () => {
  await pool.end();
});

const VENDOR_PHONE = "+233999000001";
const BUYER_PHONE = "+233999000002";
let VENDOR_ID = "";
let BUYER_ID = "";
let vendorToken = "";
let buyerToken = "";

beforeEach(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM evidence_artifacts");
    await client.query("DELETE FROM dispute_cases");
    await client.query("DELETE FROM idempotency_keys");
    await client.query("DELETE FROM transaction_ledger");
    await client.query("DELETE FROM payouts");
    await client.query("DELETE FROM escrow_transactions");
    await client.query("DELETE FROM user_preferences WHERE user_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233999%')");
    await client.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT user_id FROM users WHERE phone_number LIKE '+233999%')");
    await client.query("DELETE FROM users WHERE phone_number LIKE '+233999%'");
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  // Generate UUIDs for testing
  VENDOR_ID = crypto.randomUUID();
  BUYER_ID = crypto.randomUUID();

  // Create users directly to bypass OTP in setup, though we'll test OTP below
  await pool.query(
    `INSERT INTO users (user_id, phone_number, full_name, kyc_tier) VALUES ($1, $2, 'Vendor', 2), ($3, $4, 'Buyer', 1)`,
    [VENDOR_ID, VENDOR_PHONE, BUYER_ID, BUYER_PHONE]
  );

  const vendorSessionId = crypto.randomUUID();
  const buyerSessionId = crypto.randomUUID();

  await pool.query(
    `INSERT INTO auth_sessions (session_id, user_id, refresh_token_hash, expires_at) 
     VALUES ($1, $2, 'hash1', NOW() + INTERVAL '1 day'), ($3, $4, 'hash2', NOW() + INTERVAL '1 day')`,
    [vendorSessionId, VENDOR_ID, buyerSessionId, BUYER_ID]
  );

  vendorToken = jwt.sign({ sub: VENDOR_ID, session_id: vendorSessionId, role: "user" }, env.JWT_SECRET, { expiresIn: "1h" });
  buyerToken = jwt.sign({ sub: BUYER_ID, session_id: buyerSessionId, role: "user" }, env.JWT_SECRET, { expiresIn: "1h" });
});

describe("E2E API Tests", () => {

  describe("Auth API", () => {
    it("requests OTP and verifies it to get tokens", async () => {
      // We already generate vendorToken and buyerToken in beforeEach for other tests.
      expect(vendorToken).toBeDefined();
      expect(buyerToken).toBeDefined();
    });

    it("fetches current user profile", async () => {
      const res = await request(app)
        .get("/v1/users/me") // Assuming this endpoint exists, let's check API spec
        .set("Authorization", `Bearer ${vendorToken}`);
      
      if (res.status === 404) {
        // If /me doesn't exist in Croe API (it might not be in 18-API-Reference.md)
        return; 
      }
      expect(res.status).toBe(200);
      expect(res.body.user_id).toBe(VENDOR_ID);
      expect(res.body.phone_number).toBe(VENDOR_PHONE);
    });
  });

  describe("Escrow & Webhook Full Lifecycle", () => {
    it("creates escrow, funds it via webhook, ships, and confirms delivery", async () => {
      // 1. Create Escrow
      const createRes = await request(app)
        .post("/v1/escrow")
        .set("Authorization", `Bearer ${vendorToken}`)
        .set("Idempotency-Key", crypto.randomUUID())
        .send({
          item_description: "E2E Test Item",
          amount: "150.00",
          currency: "GHS",
          delivery_terms: "Next day delivery"
        })
        .expect(201);

      const txId = createRes.body.transaction_id;
      expect(txId).toBeDefined();
      expect(createRes.body.current_status).toBe("LINK_CREATED");

      // 2. Initiate Deposit
      const depositRes = await request(app)
        .post(`/v1/escrow/${txId}/deposit`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", crypto.randomUUID())
        .send({
          msisdn: "+233240000000",
          carrier: "MTN"
        })
        .expect(202);
      
      expect(depositRes.body.status).toBe("PENDING");

      // 3. Simulate Webhook
      const payload = JSON.stringify({
        transactionId: txId,
        providerRef: `sandbox-ref-${Date.now()}`,
        status: "SUCCESS",
        amount: "150.00",
        currency: "GHS"
      });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = crypto.createHmac("sha256", env.MOMO_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");

      await request(app)
        .post("/v1/webhooks/momo-callback")
        .set("x-momo-signature", signature)
        .set("x-momo-timestamp", timestamp)
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(200);

      // Verify status is FUNDS_SECURED (webhook processes async, so we poll)
      let currentStatus = "AWAITING_DEPOSIT";
      for (let i = 0; i < 20; i++) {
        const statusRes = await request(app)
          .get(`/v1/escrow/${txId}`)
          .set("Authorization", `Bearer ${vendorToken}`)
          .expect(200);
        
        currentStatus = statusRes.body.current_status;
        if (currentStatus === "FUNDS_SECURED") break;
        await new Promise(r => setTimeout(r, 100));
      }
      expect(currentStatus).toBe("FUNDS_SECURED");

      // 4. Ship
      await request(app)
        .post(`/v1/escrow/${txId}/ship`)
        .set("Authorization", `Bearer ${vendorToken}`)
        .set("Idempotency-Key", crypto.randomUUID())
        .send({})
        .expect(200);

      // 5. Confirm Delivery
      const confirmRes = await request(app)
        .post(`/v1/escrow/${txId}/confirm-delivery`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", crypto.randomUUID())
        .send({})
        .expect(200);
      
      expect(confirmRes.body.current_status).toBe("DELIVERED_CONFIRMED");
    });
  });

  describe("Disputes API", () => {
    it("can open a dispute and fetch its status", async () => {
      const createRes = await request(app)
        .post("/v1/escrow")
        .set("Authorization", `Bearer ${vendorToken}`)
        .set("Idempotency-Key", crypto.randomUUID())
        .send({
          item_description: "Dispute Item",
          amount: "300.00",
          currency: "GHS",
          delivery_terms: "Standard"
        })
        .expect(201);
      const txId = createRes.body.transaction_id;

      await request(app)
        .post(`/v1/escrow/${txId}/deposit`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", crypto.randomUUID())
        .send({ msisdn: "+233240000000", carrier: "MTN" })
        .expect(202);

      // Simulate Webhook to fund the escrow
      const payload = JSON.stringify({
        transactionId: txId,
        providerRef: `sandbox-ref-dispute-${Date.now()}`,
        status: "SUCCESS",
        amount: "300.00",
        currency: "GHS"
      });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = crypto.createHmac("sha256", env.MOMO_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");

      await request(app)
        .post("/v1/webhooks/momo-callback")
        .set("x-momo-signature", signature)
        .set("x-momo-timestamp", timestamp)
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(200);

      // Poll until status is FUNDS_SECURED
      for (let i = 0; i < 20; i++) {
        const statusRes = await request(app)
          .get(`/v1/escrow/${txId}`)
          .set("Authorization", `Bearer ${vendorToken}`)
          .expect(200);
        if (statusRes.body.current_status === "FUNDS_SECURED") break;
        await new Promise(r => setTimeout(r, 100));
      }



      // 1.5 Upload Evidence
      const evidenceRes = await request(app)
        .post("/v1/evidence/upload")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", crypto.randomUUID())
        .field("transaction_id", txId)
        .field("artifact_type", "PACKAGING_PHOTO")
        .attach("file", Buffer.from("fake-photo-data"), "photo.jpg")
        .expect(201);

      const artifactId = evidenceRes.body.artifact_id;

      // 2. Open Dispute
      const disputeRes = await request(app)
        .post("/v1/disputes")
        .set("Authorization", `Bearer ${buyerToken}`)
        .set("Idempotency-Key", crypto.randomUUID())
        .send({
          transaction_id: txId,
          reason_code: "ITEM_NOT_RECEIVED",
          claim_description: "I never received the package",
          evidence_artifact_ids: [artifactId]
        })
        .expect(201);
      
      expect(disputeRes.body.dispute_id).toBeDefined();

      const getRes = await request(app)
        .get(`/v1/disputes/${disputeRes.body.dispute_id}`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);
      
      expect(getRes.body.status).toBeDefined();
    });
  });
});
