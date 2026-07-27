import { pool } from "../db/pool.js";
import { callLLM } from "../config/llm.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import type { AIAction } from "../types/domain.js";
import { AI_ACTIONS } from "../types/domain.js";

/**
 * System prompt (verbatim from 13-Disputes-and-AI-Triage.md §4).
 * NEVER concatenate raw user text into instructions (AI-04).
 * User claims go inside a JSON "buyer_claim" field only.
 */
const SYSTEM_PROMPT = `You are an impartial Dispute Resolution Arbitrator for the Croe escrow platform.
Evaluate a dispute between a Buyer and a Vendor and output STRICT JSON only.

Input JSON contains: original item description & price, the Buyer's claim, the
Vendor's defense (if any), and text descriptions of verified image artifacts.

RULES:
- BE OBJECTIVE: decide only from the provided evidence.
- STRICT MATCHING: if the received item deviates materially from the description
  (wrong color, broken, different model), favor the Buyer.
- BUYER'S REMORSE: if the item matches but the Buyer changed their mind, favor the Vendor.
- INCONCLUSIVE: if there is no evidence to decide, escalate to human.
- NO CODE BLOCKS: output raw JSON, never wrapped in markdown fences.

Output a single valid JSON object:
{
  "reasoning_steps": ["...", "...", "..."],
  "confidence_score": 0.000,
  "recommended_action": "REFUND_BUYER" | "RELEASE_VENDOR" | "ESCALATE_HUMAN",
  "summary_for_users": "A calm, 2-sentence explanation."
}
confidence_score MUST be a float between 0.000 and 1.000.`;

const REPAIR_PROMPT = `Your previous response was not valid JSON or did not match the required schema.
Please output ONLY a valid JSON object matching this exact schema:
{
  "reasoning_steps": ["step1", "step2", "step3"],
  "confidence_score": 0.000,
  "recommended_action": "REFUND_BUYER" | "RELEASE_VENDOR" | "ESCALATE_HUMAN",
  "summary_for_users": "A calm, 2-sentence explanation."
}
Do not wrap in markdown fences. Output raw JSON only.`;

// ── Schema validation (AI-02) ──

export type AITriageOutput = {
  reasoning_steps: string[];
  confidence_score: number;
  recommended_action: AIAction;
  summary_for_users: string;
};

/**
 * Validate LLM output matches the required schema (AI-02).
 * Returns parsed output or null if invalid.
 */
export function validateLLMOutput(raw: string): AITriageOutput | null {
  let parsed: unknown;

  // Strip markdown fences if present (common LLM mistake)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  // Validate reasoning_steps
  if (!Array.isArray(obj.reasoning_steps)) return null;
  if (!obj.reasoning_steps.every((s: unknown) => typeof s === "string")) return null;

  // Validate confidence_score
  const score = obj.confidence_score;
  if (typeof score !== "number" || score < 0 || score > 1) return null;

  // Validate recommended_action
  const action = obj.recommended_action;
  if (typeof action !== "string" || !AI_ACTIONS.includes(action as AIAction)) return null;

  // Validate summary_for_users
  if (typeof obj.summary_for_users !== "string") return null;

  return {
    reasoning_steps: obj.reasoning_steps as string[],
    confidence_score: score,
    recommended_action: action as AIAction,
    summary_for_users: obj.summary_for_users as string,
  };
}

// ── Confidence gate (AI-03) ──
const CONFIDENCE_THRESHOLD = 0.900;

// ── Dispute context query ──

type DisputeContext = {
  dispute_id: string;
  transaction_id: string;
  reason_code: string;
  buyer_claim: string;
  item_description: string;
  amount: string;
  currency: string;
};

async function getDisputeContext(disputeId: string): Promise<DisputeContext> {
  const { rows } = await pool.query<DisputeContext>(
    `SELECT d.dispute_id, d.transaction_id, d.reason_code, d.buyer_claim,
            e.item_description, e.amount, e.currency
     FROM dispute_cases d
     JOIN escrow_transactions e ON d.transaction_id = e.transaction_id
     WHERE d.dispute_id = $1`,
    [disputeId],
  );

  if (!rows[0]) {
    throw new AppError(404, "Dispute not found", "DISPUTE_NOT_FOUND");
  }
  return rows[0];
}

// ── Main triage function ──

/**
 * Run AI triage on a dispute (13-Disputes-and-AI-Triage.md §4-5).
 *
 * Flow:
 * 1. Fetch dispute context (item description, claim, reason)
 * 2. Build user message (JSON — user text isolated per AI-04)
 * 3. Call LLM with system prompt
 * 4. Validate output schema (AI-02) — repair once if invalid
 * 5. Confidence gate (AI-03):
 *    - ≥ 0.900 + REFUND_BUYER/RELEASE_VENDOR → auto-execute, RESOLVED_AUTO
 *    - Otherwise → UNDER_HUMAN_REVIEW
 * 6. Store ai_reasoning_payload, ai_confidence_score, ai_recommended_action
 */
export async function runAITriage(disputeId: string): Promise<void> {
  const context = await getDisputeContext(disputeId);

  // Build user message — user text isolated in JSON fields (AI-04)
  const userMessage = JSON.stringify({
    item_description: context.item_description,
    amount: context.amount,
    currency: context.currency,
    reason_code: context.reason_code,
    buyer_claim: context.buyer_claim,
    evidence_artifacts: "No text descriptions available for P0 sandbox.",
  });

  // Step 3: Call LLM
  let llmResponse: string;
  let model: string;
  try {
    const result = await callLLM({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
    });
    llmResponse = result.text;
    model = result.model;
  } catch (err) {
    logger.error({ disputeId, err }, "LLM call failed — escalating to human review");
    await escalateToHuman(disputeId, "LLM call failed");
    return;
  }

  // Step 4: Validate output (AI-02)
  let validated = validateLLMOutput(llmResponse);

  // Repair attempt: if invalid, re-request once
  if (!validated) {
    logger.warn({ disputeId, raw: llmResponse.slice(0, 200) }, "Invalid LLM output — attempting repair");
    try {
      const repairResult = await callLLM({
        systemPrompt: SYSTEM_PROMPT,
        userMessage: `${userMessage}\n\n${REPAIR_PROMPT}`,
      });
      validated = validateLLMOutput(repairResult.text);
    } catch {
      // Repair failed
    }

    if (!validated) {
      logger.warn({ disputeId }, "LLM output invalid after repair — escalating");
      await escalateToHuman(disputeId, "LLM output invalid after repair");
      return;
    }
  }

  // Step 5: Store results
  await pool.query(
    `UPDATE dispute_cases SET
       ai_model_version = $1,
       ai_confidence_score = $2,
       ai_recommended_action = $3,
       ai_reasoning_payload = $4
     WHERE dispute_id = $5`,
    [model, validated.confidence_score, validated.recommended_action, validated, disputeId],
  );

  logger.info(
    {
      disputeId,
      confidence: validated.confidence_score,
      action: validated.recommended_action,
    },
    "AI triage completed",
  );

  // Step 6: Confidence gate (AI-03)
  if (
    validated.confidence_score >= CONFIDENCE_THRESHOLD &&
    (validated.recommended_action === "REFUND_BUYER" || validated.recommended_action === "RELEASE_VENDOR")
  ) {
    // Auto-resolve: RESOLVED_AUTO
    await pool.query(
      `UPDATE dispute_cases SET
         status = 'RESOLVED_AUTO',
         final_resolution = $1,
         resolved_at = NOW()
       WHERE dispute_id = $2`,
      [validated.recommended_action, disputeId],
    );

    logger.info(
      { disputeId, action: validated.recommended_action, confidence: validated.confidence_score },
      "Dispute auto-resolved by AI",
    );
  } else {
    // Low confidence or ESCALATE_HUMAN → human review
    await pool.query(
      `UPDATE dispute_cases SET status = 'UNDER_HUMAN_REVIEW' WHERE dispute_id = $1`,
      [disputeId],
    );

    logger.info({ disputeId, confidence: validated.confidence_score }, "Dispute escalated to human review");
  }
}

/**
 * Escalate to human review on LLM failure.
 */
async function escalateToHuman(disputeId: string, reason: string): Promise<void> {
  await pool.query(
    `UPDATE dispute_cases SET
       status = 'UNDER_HUMAN_REVIEW',
       ai_reasoning_payload = $1
     WHERE dispute_id = $2`,
    [{ escalation_reason: reason }, disputeId],
  );
}
