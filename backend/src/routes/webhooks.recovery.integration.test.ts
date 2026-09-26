import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import crypto from "crypto";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db/pool.js";
import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { createEscrow, initiateDeposit, processDepositWebhook, shipEscrow, getEscrow } from "../services/escrow.js";
import { WEBHOOK_MAX_ATTEMPTS } from "../services/webhook-inbox.js";
import { runWebhookSweeper, WEBHOOK_SWEEPER_LOCK_KEY } from "../jobs/webhook-sweeper.js";
import { clearAlert, getActiveAlerts } from "../services/alerting.js";

/**
 * Webhook failure recovery (task.md T6.1, T6.2, T6.7): a webhook whose
 * processing fails must not be lost. The inbox row stays unprocessed, the
 * Redis gate is released, and the sweeper applies it once conditions allow.
 */
const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const BUYER_ID = "22222222-2222-2222-2222-222222222222";

beforeAll(async () => {
  await pool.query("SELECT 1");
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM evidence_artifacts");
    await client.query("DELETE FROM dispute_cases");
    await client.query("DELETE FROM idempotency_keys");
    await client.query("DELETE FROM transaction_ledger");
    await client.query("DELETE FROM payouts");
    await client.query("DELETE FROM webhook_inbox");
    await client.query("DELETE FROM escrow_transactions");
    await client.query("DELETE FROM users CASCADE");
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  await pool.query(
    `INSERT INTO users (user_id, phone_number, full_name, kyc_tier)
     VALUES ($1, '+233240000001', 'Test Vendor', 2),
            ($2, '+233240000002', 'Test Buyer', 1)`,
    [VENDOR_ID, BUYER_ID],
  );
  const keys = await redis.keys("idemp:recovery-*");
  if (keys.length > 0) await redis.del(...keys);
  const rl = await redis.keys("rl:*");
  if (rl.length > 0) await redis.del(...rl);
});

function sendSandboxWebhook(body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHmac("sha256", env.MOMO_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");
  return request(app)
    .post("/v1/webhooks/momo-callback")
    .set("x-momo-signature", signature)
    .set("x-momo-timestamp", timestamp)
    .set("Content-Type", "application/json")
    .send(payload);
}

async function inboxRow(providerRef: string) {
  const { rows } = await pool.query(
    `SELECT attempts, last_error, processed_at, dead_lettered_at FROM webhook_inbox WHERE provider_ref = $1`,
    [providerRef],
  );
  return rows[0] as
    | { attempts: number; last_error: string | null; processed_at: Date | null; dead_lettered_at: Date | null }
    | undefined;
}

async function waitFor<T>(fn: () => Promise<T | undefined>, ok: (v: T) => boolean): Promise<T> {
  for (let i = 0; i < 50; i++) {
    const v = await fn();
    if (v !== undefined && ok(v)) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("condition not met in time");
}

async function makeDue(providerRef: string) {
  await pool.query(`UPDATE webhook_inbox SET next_attempt_at = NOW() - INTERVAL '1 second' WHERE provider_ref = $1`, [
    providerRef,
  ]);
}

describe("webhook failure recovery", () => {
  it("keeps a failed deposit webhook and applies it on the next sweep (T6.1/T6.2)", async () => {
    const tx = await createEscrow({ vendorId: VENDOR_ID, itemDescription: "Recovery test item", amount: "120.00", currency: "GHS" });
    const providerRef = `recovery-${tx.transaction_id}`;

    // The escrow is still LINK_CREATED, so securing funds fails now.
    await sendSandboxWebhook({ transactionId: tx.transaction_id, providerRef, status: "SUCCESS", amount: "120.00" }).expect(200);

    const failed = await waitFor(() => inboxRow(providerRef), (r) => r.attempts === 1);
    expect(failed.processed_at).toBeNull();
    expect(failed.last_error).toBeTruthy();
    expect(await redis.exists(`idemp:${providerRef}`)).toBe(0);

    // The buyer's deposit initiation lands; the retry can now succeed.
    await initiateDeposit({ transactionId: tx.transaction_id, buyerId: BUYER_ID, msisdn: "+233240000000", carrier: "MTN" });
    await makeDue(providerRef);

    const sweep = await runWebhookSweeper();
    expect(sweep).toMatchObject({ skipped: false, processed: 1, failed: 0 });
    expect((await getEscrow(tx.transaction_id)).current_status).toBe("FUNDS_SECURED");
    expect((await inboxRow(providerRef))?.processed_at).not.toBeNull();

    const { rows: deposits } = await pool.query(
      `SELECT 1 FROM transaction_ledger WHERE transaction_id = $1 AND event_type = 'FUNDS_DEPOSITED'`,
      [tx.transaction_id],
    );
    expect(deposits).toHaveLength(1);

    // Nothing left to sweep.
    expect(await runWebhookSweeper()).toMatchObject({ processed: 0, failed: 0 });
  });

  it("does not sweep a fresh row before the inline grace period", async () => {
    const tx = await createEscrow({ vendorId: VENDOR_ID, itemDescription: "Grace test item", amount: "50.00", currency: "GHS" });
    const providerRef = `recovery-grace-${tx.transaction_id}`;
    await sendSandboxWebhook({ transactionId: tx.transaction_id, providerRef, status: "SUCCESS" }).expect(200);
    await waitFor(() => inboxRow(providerRef), (r) => r.attempts === 1);
    expect(await runWebhookSweeper()).toMatchObject({ processed: 0, failed: 0 });
  });

  it("dead-letters a webhook after the maximum attempts and alerts (T6.7)", async () => {
    const providerRef = "recovery-dead-letter";
    const source = `webhook_dead_letter:momo:${providerRef}`;
    clearAlert(source);
    await pool.query(
      `INSERT INTO webhook_inbox (provider, provider_ref, signature_valid, payload, attempts, next_attempt_at)
       VALUES ('momo', $1, true, $2, $3, NOW() - INTERVAL '1 second')`,
      [providerRef, JSON.stringify({ transactionId: crypto.randomUUID(), providerRef }), WEBHOOK_MAX_ATTEMPTS - 1],
    );

    expect(await runWebhookSweeper()).toMatchObject({ processed: 0, failed: 1 });
    const row = await inboxRow(providerRef);
    expect(row?.attempts).toBe(WEBHOOK_MAX_ATTEMPTS);
    expect(row?.dead_lettered_at).not.toBeNull();
    expect(getActiveAlerts().some((a) => a.source === source && a.severity === "critical")).toBe(true);

    // Dead-lettered rows are never retried automatically.
    await makeDue(providerRef);
    expect(await runWebhookSweeper()).toMatchObject({ processed: 0, failed: 0 });
  });

  it("treats a deposit replay after the escrow moved on as a no-op", async () => {
    const tx = await createEscrow({ vendorId: VENDOR_ID, itemDescription: "Replay test item", amount: "80.00", currency: "GHS" });
    await initiateDeposit({ transactionId: tx.transaction_id, buyerId: BUYER_ID, msisdn: "+233240000000", carrier: "MTN" });
    await processDepositWebhook({ transactionId: tx.transaction_id });
    await shipEscrow({ transactionId: tx.transaction_id, vendorId: VENDOR_ID });

    await expect(processDepositWebhook({ transactionId: tx.transaction_id })).resolves.toBeDefined();
    expect((await getEscrow(tx.transaction_id)).current_status).toBe("SHIPPED");
  });

  it("skips the run while another instance holds the sweeper lock", async () => {
    const other = await pool.connect();
    try {
      await other.query("SELECT pg_advisory_lock($1)", [WEBHOOK_SWEEPER_LOCK_KEY]);
      expect(await runWebhookSweeper()).toMatchObject({ skipped: true });
    } finally {
      await other.query("SELECT pg_advisory_unlock($1)", [WEBHOOK_SWEEPER_LOCK_KEY]);
      other.release();
    }
  });
});
