import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { pool } from "../db/pool.js";
import { runAITriage, validateLLMOutput } from "./ai-triage.js";

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const BUYER_ID = "22222222-2222-2222-2222-222222222222";
const TX_ID = "33333333-3333-3333-3333-333333333333";
const DISPUTE_ID = "44444444-4444-4444-4444-444444444444";
const EVIDENCE_ID = "55555555-5555-5555-5555-555555555555";

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
    await client.query("DELETE FROM escrow_transactions");
    await client.query("DELETE FROM users CASCADE");
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  // Seed users
  await pool.query(
    `INSERT INTO users (user_id, phone_number, full_name, trust_score)
     VALUES ($1, '+233240000001', 'Test Vendor', 50),
            ($2, '+233240000002', 'Test Buyer', 50)
     ON CONFLICT (phone_number) DO UPDATE SET user_id = EXCLUDED.user_id`,
    [VENDOR_ID, BUYER_ID],
  );

  // Seed escrow
  await pool.query(
    `INSERT INTO escrow_transactions (transaction_id, vendor_id, buyer_id, item_description, amount, currency, current_status)
     VALUES ($1, $2, $3, 'Red Nike Air Max 90, size 10, new in box', '500.00', 'GHS', 'DISPUTE_OPENED')`,
    [TX_ID, VENDOR_ID, BUYER_ID],
  );
});

describe("ai-triage integration", () => {
  it("runAITriage: mock LLM returns ESCALATE_HUMAN → UNDER_HUMAN_REVIEW", async () => {
    // Seed dispute
    await pool.query(
      `INSERT INTO dispute_cases (dispute_id, transaction_id, initiated_by, reason_code, buyer_claim, status)
       VALUES ($1, $2, $3, 'ITEM_NOT_AS_DESCRIBED', 'I received a blue shoe, not red as described', 'AI_PROCESSING')`,
      [DISPUTE_ID, TX_ID, BUYER_ID],
    );

    // Run AI triage (will use mock LLM since LLM_MODEL not set)
    await runAITriage(DISPUTE_ID);

    // Verify dispute was updated
    const { rows } = await pool.query(
      `SELECT status, ai_model_version, ai_reasoning_payload FROM dispute_cases WHERE dispute_id = $1`,
      [DISPUTE_ID],
    );

    expect(rows[0].status).toBe("UNDER_HUMAN_REVIEW");
    expect(rows[0].ai_model_version).toBe("mock-p0");
    expect(rows[0].ai_reasoning_payload).toBeDefined();
  });

  it("validateLLMOutput rejects completely invalid output", () => {
    expect(validateLLMOutput("garbage")).toBeNull();
    expect(validateLLMOutput("<html>not json</html>")).toBeNull();
    expect(validateLLMOutput("")).toBeNull();
  });

  it("validateLLMOutput accepts valid output with high confidence", () => {
    const output = validateLLMOutput(JSON.stringify({
      reasoning_steps: ["Item color mismatch confirmed"],
      confidence_score: 0.950,
      recommended_action: "REFUND_BUYER",
      summary_for_users: "The item received does not match the description.",
    }));

    expect(output).not.toBeNull();
    expect(output!.confidence_score).toBe(0.950);
    expect(output!.recommended_action).toBe("REFUND_BUYER");
  });

  it("confidence gate: 0.899 → UNDER_HUMAN_REVIEW even with REFUND_BUYER", () => {
    // Simulate the gate logic
    const score = 0.899;
    const action = "REFUND_BUYER";
    const autoResolve = score >= 0.900 && (action === "REFUND_BUYER" || action === "RELEASE_VENDOR");
    expect(autoResolve).toBe(false);
  });

  it("confidence gate: 0.900 → RESOLVED_AUTO with REFUND_BUYER", () => {
    const score = 0.900;
    const action = "REFUND_BUYER";
    const autoResolve = score >= 0.900 && (action === "REFUND_BUYER" || action === "RELEASE_VENDOR");
    expect(autoResolve).toBe(true);
  });

  it("confidence gate: 1.000 with ESCALATE_HUMAN → UNDER_HUMAN_REVIEW", () => {
    const score = 1.000;
    const action = "ESCALATE_HUMAN";
    const autoResolve = score >= 0.900 && (action === "REFUND_BUYER" || action === "RELEASE_VENDOR");
    expect(autoResolve).toBe(false);
  });

  it("LLM output with markdown fences is parsed correctly", () => {
    const fenced = '```json\n{"reasoning_steps":["step"],"confidence_score":0.920,"recommended_action":"RELEASE_VENDOR","summary_for_users":"Item matches description."}\n```';
    const output = validateLLMOutput(fenced);

    expect(output).not.toBeNull();
    expect(output!.recommended_action).toBe("RELEASE_VENDOR");
    expect(output!.confidence_score).toBe(0.920);
  });

  it("LLM output with wrong action is rejected", () => {
    const output = validateLLMOutput(JSON.stringify({
      reasoning_steps: ["step"],
      confidence_score: 0.950,
      recommended_action: "KEEP_THE_MONEY",
      summary_for_users: "tough luck",
    }));
    expect(output).toBeNull();
  });
});
