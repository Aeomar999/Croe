import type { PoolClient } from "pg";
import { getTransactionClient } from "../db/pool.js";
import { AppError } from "../middleware/error-handler.js";
import { validateTransition } from "./state-machine.js";
import type { DisputeReasonCode, DisputeStatus, EscrowState, LedgerEvent } from "../types/domain.js";
import { DISPUTE_REASON_CODES } from "../types/domain.js";
import type { ForensicContext } from "../middleware/forensic.js";
import { runHeuristics, applyTrustPenalty, freezeDevice } from "./heuristics.js";
import { logger } from "../config/logger.js";

type DisputeRow = {
  dispute_id: string;
  transaction_id: string;
  initiated_by: string;
  reason_code: string;
  buyer_claim: string;
  ai_model_version: string | null;
  ai_confidence_score: string | null;
  ai_recommended_action: string | null;
  ai_reasoning_payload: unknown;
  status: DisputeStatus;
  final_resolution: string | null;
  created_at: Date;
  resolved_at: Date | null;
};

type EscrowRow = {
  transaction_id: string;
  vendor_id: string;
  buyer_id: string | null;
  amount: string;
  currency: string;
  current_status: EscrowState;
  [key: string]: unknown;
};

/**
 * Append a ledger entry (AUD-01: append-only).
 */
async function appendLedger(
  client: PoolClient,
  p: {
    transactionId: string;
    actorId: string | null;
    eventType: LedgerEvent;
    previousStatus: EscrowState | null;
    newStatus: EscrowState;
    forensic?: ForensicContext;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO transaction_ledger
       (transaction_id, actor_id, event_type, previous_status, new_status,
        ip_address, device_id, network_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      p.transactionId,
      p.actorId,
      p.eventType,
      p.previousStatus,
      p.newStatus,
      p.forensic?.ip ?? null,
      p.forensic?.deviceId ?? null,
      p.forensic?.networkType ?? null,
    ],
  );
}

/**
 * Open a dispute for an escrow transaction.
 *
 * Flow:
 * 1. Validate escrow state (FUNDS_SECURED or SHIPPED)
 * 2. Transition escrow to DISPUTE_OPENED
 * 3. Create dispute_cases row
 * 4. Run SQL heuristics (13-Disputes-and-AI-Triage.md §3)
 *    - Rule 1 (recycled) or Rule 2 (Sybil) → FRAUD_LOCKOUT + trust −50
 *    - Rule 3 (burner) → UNDER_HUMAN_REVIEW
 *    - Rule 4 (pass) → AI_PROCESSING (Phase 5 will handle)
 */
export async function openDispute(p: {
  transactionId: string;
  initiatedBy: string;
  reasonCode: DisputeReasonCode;
  claimDescription: string;
  evidenceArtifactIds: string[];
  forensic?: ForensicContext;
}): Promise<DisputeRow> {
  if (!DISPUTE_REASON_CODES.includes(p.reasonCode)) {
    throw new AppError(400, `Invalid reason code: ${p.reasonCode}`, "VALIDATION_ERROR");
  }

  if (!p.claimDescription || p.claimDescription.length < 10 || p.claimDescription.length > 2000) {
    throw new AppError(400, "claim_description must be 10–2000 characters", "VALIDATION_ERROR");
  }

  if (!p.evidenceArtifactIds || p.evidenceArtifactIds.length === 0) {
    throw new AppError(400, "At least one evidence artifact is required", "VALIDATION_ERROR");
  }

  const client = await getTransactionClient();
  try {
    await client.query("BEGIN");

    // Step 1: Fetch escrow with FOR UPDATE
    const { rows: escrowRows } = await client.query<EscrowRow>(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1 FOR UPDATE`,
      [p.transactionId],
    );

    const tx = escrowRows[0];
    if (!tx) {
      throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
    }

    // Validate transition: FUNDS_SECURED or SHIPPED → DISPUTE_OPENED
    if (tx.current_status !== "FUNDS_SECURED" && tx.current_status !== "SHIPPED") {
      throw new AppError(
        409,
        `Cannot open dispute: transaction is ${tx.current_status} (must be FUNDS_SECURED or SHIPPED)`,
        "INVALID_STATE_TRANSITION",
      );
    }

    // Step 2: Transition escrow to DISPUTE_OPENED
    const ledgerEvent = validateTransition(tx.current_status, "DISPUTE_OPENED");
    await client.query(
      `UPDATE escrow_transactions SET current_status = 'DISPUTE_OPENED' WHERE transaction_id = $1`,
      [p.transactionId],
    );

    await appendLedger(client, {
      transactionId: p.transactionId,
      actorId: p.initiatedBy,
      eventType: ledgerEvent ?? "DISPUTE_OPENED",
      previousStatus: tx.current_status,
      newStatus: "DISPUTE_OPENED",
      forensic: p.forensic,
    });

    // Step 3: Create dispute_cases row
    const { rows: disputeRows } = await client.query<DisputeRow>(
      `INSERT INTO dispute_cases (transaction_id, initiated_by, reason_code, buyer_claim, status)
       VALUES ($1, $2, $3, $4, 'AI_PROCESSING')
       RETURNING *`,
      [p.transactionId, p.initiatedBy, p.reasonCode, p.claimDescription],
    );

    const dispute = disputeRows[0]!;

    // Step 4: Verify evidence exists and belongs to this transaction
    const { rows: evidenceRows } = await client.query<{ artifact_id: string }>(
      `SELECT artifact_id FROM evidence_artifacts WHERE artifact_id = ANY($1) AND transaction_id = $2`,
      [p.evidenceArtifactIds, p.transactionId],
    );

    if (evidenceRows.length !== p.evidenceArtifactIds.length) {
      throw new AppError(400, "One or more evidence artifacts not found or belong to a different transaction", "VALIDATION_ERROR");
    }

    await client.query("COMMIT");

    // Step 5: Run heuristics OUTSIDE the transaction (non-blocking per spec)
    // Heuristics are read-only queries; safe to run after commit
    const sha256Hash = await getPrimaryEvidenceHash(p.evidenceArtifactIds);
    const heuristicResult = await runHeuristics({
      transactionId: p.transactionId,
      userId: p.initiatedBy,
      sha256Hash: sha256Hash ?? "",
      ipAddress: p.forensic?.ip ?? "unknown",
      deviceId: p.forensic?.deviceId ?? "unknown",
    });

    // Apply rule-specific actions
    if (heuristicResult.ruleTriggered === "RECYCLED_MEDIA") {
      await applyRule1(client, dispute, p.initiatedBy, p.forensic);
    } else if (heuristicResult.ruleTriggered === "SYBIL_VELOCITY") {
      await applyRule2(dispute, p.forensic);
    } else if (heuristicResult.ruleTriggered === "BURNER_ACCOUNT") {
      await applyRule3(dispute);
    } else {
      // Rule 4: Pass — keep as AI_PROCESSING (Phase 5 will handle LLM)
      logger.info({ disputeId: dispute.dispute_id }, "Heuristics passed — awaiting AI triage");
    }

    // Re-fetch dispute
    const { rows: updatedDispute } = await client.query<DisputeRow>(
      `SELECT * FROM dispute_cases WHERE dispute_id = $1`,
      [dispute.dispute_id],
    );

    return updatedDispute[0]!;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get dispute by ID.
 */
export async function getDispute(disputeId: string): Promise<DisputeRow> {
  const { rows } = await getTransactionClient().then(async (client) => {
    try {
      return await client.query<DisputeRow>(
        `SELECT * FROM dispute_cases WHERE dispute_id = $1`,
        [disputeId],
      );
    } finally {
      client.release();
    }
  });

  const dispute = rows[0];
  if (!dispute) {
    throw new AppError(404, "Dispute not found", "DISPUTE_NOT_FOUND");
  }
  return dispute;
}

/**
 * Get dispute by transaction ID.
 */
export async function getDisputeByTransaction(transactionId: string): Promise<DisputeRow> {
  const { rows } = await getTransactionClient().then(async (client) => {
    try {
      return await client.query<DisputeRow>(
        `SELECT * FROM dispute_cases WHERE transaction_id = $1`,
        [transactionId],
      );
    } finally {
      client.release();
    }
  });

  const dispute = rows[0];
  if (!dispute) {
    throw new AppError(404, "Dispute not found for this transaction", "DISPUTE_NOT_FOUND");
  }
  return dispute;
}

// ── Rule applications ──────────────────────────────────────

/**
 * Rule 1: Recycled media.
 * FRAUD_FLAGGED + trust −50 + freeze device + FRAUD_LOCKOUT.
 * AI bypassed.
 */
async function applyRule1(
  client: PoolClient,
  dispute: DisputeRow,
  uploaderId: string,
  forensic?: ForensicContext,
): Promise<void> {
  logger.warn({ disputeId: dispute.dispute_id }, "Applying Rule 1: recycled media");

  // Trust penalty
  await applyTrustPenalty(uploaderId, 50);

  // Freeze device
  if (forensic?.deviceId && forensic.deviceId !== "unknown") {
    await freezeDevice(forensic.deviceId);
  }

  // Update dispute status
  await client.query(
    `UPDATE dispute_cases SET
       status = 'FRAUD_LOCKOUT',
       final_resolution = 'REFUND_BUYER',
       resolved_at = NOW()
     WHERE dispute_id = $1`,
    [dispute.dispute_id],
  );

  // FRAUD_FLAGGED + FRAUD_LOCKOUT on escrow
  await client.query(
    `UPDATE escrow_transactions SET current_status = 'FRAUD_LOCKOUT' WHERE transaction_id = $1`,
    [dispute.transaction_id],
  );

  await appendLedger(client, {
    transactionId: dispute.transaction_id,
    actorId: null, // System/AI
    eventType: "FRAUD_FLAGGED",
    previousStatus: "DISPUTE_OPENED",
    newStatus: "FRAUD_LOCKOUT",
    forensic,
  });
}

/**
 * Rule 2: Sybil velocity.
 * Freeze linked accounts + FRAUD_LOCKOUT. AI bypassed.
 */
async function applyRule2(
  dispute: DisputeRow,
  forensic?: ForensicContext,
): Promise<void> {
  logger.warn({ disputeId: dispute.dispute_id }, "Applying Rule 2: Sybil velocity");

  if (forensic?.deviceId && forensic.deviceId !== "unknown") {
    await freezeDevice(forensic.deviceId);
  }

  // Note: We don't have a transaction client here since heuristics run post-commit.
  // Use pool directly for this update.
  const { pool: dbPool } = await import("../db/pool.js");

  await dbPool.query(
    `UPDATE dispute_cases SET status = 'FRAUD_LOCKOUT', resolved_at = NOW() WHERE dispute_id = $1`,
    [dispute.dispute_id],
  );

  await dbPool.query(
    `UPDATE escrow_transactions SET current_status = 'FRAUD_LOCKOUT' WHERE transaction_id = $1`,
    [dispute.transaction_id],
  );
}

/**
 * Rule 3: Burner account.
 * Route to UNDER_HUMAN_REVIEW.
 */
async function applyRule3(dispute: DisputeRow): Promise<void> {
  logger.warn({ disputeId: dispute.dispute_id }, "Applying Rule 3: burner account");

  const { pool: dbPool } = await import("../db/pool.js");

  await dbPool.query(
    `UPDATE dispute_cases SET status = 'UNDER_HUMAN_REVIEW' WHERE dispute_id = $1`,
    [dispute.dispute_id],
  );
}

/**
 * Get the SHA-256 hash of the first evidence artifact (for heuristics).
 */
async function getPrimaryEvidenceHash(artifactIds: string[]): Promise<string | null> {
  if (artifactIds.length === 0) return null;
  const { rows } = await getTransactionClient().then(async (client) => {
    try {
      return await client.query<{ sha256_hash: string }>(
        `SELECT sha256_hash FROM evidence_artifacts WHERE artifact_id = $1`,
        [artifactIds[0]],
      );
    } finally {
      client.release();
    }
  });
  return rows[0]?.sha256_hash ?? null;
}
