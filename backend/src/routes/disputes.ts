import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { requireIdempotencyKey, idempotencyGuard } from "../middleware/idempotency.js";
import { disputeRateLimiter } from "../middleware/rate-limiter.js";
import { openDispute, getDispute } from "../services/disputes.js";
import { AppError } from "../middleware/error-handler.js";
import type { DisputeReasonCode } from "../types/domain.js";
import { DISPUTE_REASON_CODES } from "../types/domain.js";

const router: RouterType = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateId(id: string | undefined): string {
  if (!id || !UUID_RE.test(id)) {
    throw new AppError(400, "Invalid ID format", "VALIDATION_ERROR");
  }
  return id;
}

/**
 * POST /v1/disputes — Open a dispute
 * 13-Disputes-and-AI-Triage.md §2
 */
router.post(
  "/disputes",
  disputeRateLimiter,
  requireIdempotencyKey,
  idempotencyGuard,
  async (req: Request, res: Response) => {
    const { transaction_id, reason_code, claim_description, evidence_artifact_ids } = req.body as {
      transaction_id?: string;
      reason_code?: string;
      claim_description?: string;
      evidence_artifact_ids?: string[];
    };

    if (!transaction_id || !UUID_RE.test(transaction_id)) {
      throw new AppError(400, "transaction_id must be a valid UUID", "VALIDATION_ERROR");
    }

    if (!reason_code || !DISPUTE_REASON_CODES.includes(reason_code as DisputeReasonCode)) {
      throw new AppError(
        400,
        `reason_code must be one of: ${DISPUTE_REASON_CODES.join(", ")}`,
        "VALIDATION_ERROR",
      );
    }

    if (!claim_description || claim_description.length < 10 || claim_description.length > 2000) {
      throw new AppError(400, "claim_description must be 10–2000 characters", "VALIDATION_ERROR");
    }

    if (!Array.isArray(evidence_artifact_ids) || evidence_artifact_ids.length === 0) {
      throw new AppError(400, "evidence_artifact_ids must be a non-empty array of UUIDs", "VALIDATION_ERROR");
    }

    for (const id of evidence_artifact_ids) {
      if (!UUID_RE.test(id)) {
        throw new AppError(400, `Invalid evidence artifact ID: ${id}`, "VALIDATION_ERROR");
      }
    }

    const dispute = await openDispute({
      transactionId: transaction_id,
      initiatedBy: "00000000-0000-0000-0000-000000000001", // placeholder until auth
      reasonCode: reason_code as DisputeReasonCode,
      claimDescription: claim_description,
      evidenceArtifactIds: evidence_artifact_ids,
      forensic: req.forensic,
    });

    res.status(201).json({
      dispute_id: dispute.dispute_id,
      transaction_id: dispute.transaction_id,
      status: dispute.status,
      reason_code: dispute.reason_code,
      created_at: dispute.created_at,
    });
  },
);

/**
 * GET /v1/disputes/:id — Get dispute status
 */
router.get("/disputes/:id", async (req: Request, res: Response) => {
  const id = validateId(req.params["id"] as string);
  const dispute = await getDispute(id);

  res.json({
    dispute_id: dispute.dispute_id,
    transaction_id: dispute.transaction_id,
    status: dispute.status,
    reason_code: dispute.reason_code,
    buyer_claim: dispute.buyer_claim,
    ai_confidence_score: dispute.ai_confidence_score,
    ai_recommended_action: dispute.ai_recommended_action,
    final_resolution: dispute.final_resolution,
    created_at: dispute.created_at,
    resolved_at: dispute.resolved_at,
  });
});

export default router;
