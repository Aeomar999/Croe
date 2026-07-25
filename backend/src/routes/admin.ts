import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import {
  getDisputeQueue,
  resolveDispute,
  freezeUser,
  adjustTrustScore,
  getReconciliationReport,
  getKYCQueue,
} from "../services/admin.js";
import { reviewKYC } from "../services/kyc.js";
import { AppError } from "../middleware/error-handler.js";

const router: RouterType = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const VALID_DISPUTE_ACTIONS = ["REFUND_BUYER", "RELEASE_VENDOR"] as const;

function validateId(id: string | undefined): string {
  if (!id || !UUID_RE.test(id)) {
    throw new AppError(400, "Invalid ID format", "VALIDATION_ERROR");
  }
  return id;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(400, `${field} must be a non-empty string`, "VALIDATION_ERROR");
  }
  return value.trim();
}

/**
 * GET /admin/disputes/queue
 * Roles: reviewer, ops, admin
 */
router.get(
  "/admin/disputes/queue",
  authenticate,
  requireRole("reviewer", "ops", "admin"),
  async (_req: Request, res: Response) => {
    const limit = Math.min(Math.max(parseInt(_req.query.limit as string, 10) || 50, 1), 200);
    const items = await getDisputeQueue(limit);
    res.json({ items });
  },
);

/**
 * POST /admin/disputes/:id/resolve
 * Roles: reviewer, ops, admin
 */
router.post(
  "/admin/disputes/:id/resolve",
  authenticate,
  requireRole("reviewer", "ops", "admin"),
  async (req: Request, res: Response) => {
    const disputeId = validateId(req.params["id"] as string);
    const { action, reason } = req.body as {
      action?: string;
      reason?: string;
    };

    if (!action || !(VALID_DISPUTE_ACTIONS as readonly string[]).includes(action)) {
      throw new AppError(
        400,
        `action must be one of: ${VALID_DISPUTE_ACTIONS.join(", ")}`,
        "VALIDATION_ERROR",
      );
    }
    requireNonEmptyString(reason, "reason");

    const { newStatus } = await resolveDispute(
      disputeId,
      req.userId!,
      action as "REFUND_BUYER" | "RELEASE_VENDOR",
      reason!,
    );

    res.json({ status: newStatus });
  },
);

/**
 * POST /admin/users/:id/freeze
 * Roles: reviewer, ops, admin
 */
router.post(
  "/admin/users/:id/freeze",
  authenticate,
  requireRole("reviewer", "ops", "admin"),
  async (req: Request, res: Response) => {
    const targetUserId = validateId(req.params["id"] as string);
    const { frozen, reason } = req.body as {
      frozen?: boolean;
      reason?: string;
    };

    if (typeof frozen !== "boolean") {
      throw new AppError(400, "frozen must be a boolean", "VALIDATION_ERROR");
    }
    requireNonEmptyString(reason, "reason");

    const { isFrozen } = await freezeUser(targetUserId, frozen, reason!, req.userId!);

    res.json({ is_frozen: isFrozen });
  },
);

/**
 * POST /admin/users/:id/trust-score
 * Roles: ops, admin
 */
router.post(
  "/admin/users/:id/trust-score",
  authenticate,
  requireRole("ops", "admin"),
  async (req: Request, res: Response) => {
    const targetUserId = validateId(req.params["id"] as string);
    const { trust_score, reason } = req.body as {
      trust_score?: number;
      reason?: string;
    };

    if (typeof trust_score !== "number" || trust_score < 0 || trust_score > 100) {
      throw new AppError(400, "trust_score must be a number between 0 and 100", "VALIDATION_ERROR");
    }
    requireNonEmptyString(reason, "reason");

    const { trustScore } = await adjustTrustScore(targetUserId, trust_score, reason!, req.userId!);

    res.json({ trust_score: trustScore });
  },
);

/**
 * GET /admin/reconciliation
 * Roles: ops, admin
 */
router.get(
  "/admin/reconciliation",
  authenticate,
  requireRole("ops", "admin"),
  async (req: Request, res: Response) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!from || !ISO_DATETIME_RE.test(from)) {
      throw new AppError(400, "from must be a valid ISO 8601 datetime", "VALIDATION_ERROR");
    }
    if (!to || !ISO_DATETIME_RE.test(to)) {
      throw new AppError(400, "to must be a valid ISO 8601 datetime", "VALIDATION_ERROR");
    }

    const report = await getReconciliationReport(from, to);

    res.json({
      summary: report.summary,
      custodyAccounts: report.custodyAccounts,
    });
  },
);

/**
 * GET /admin/kyc/queue
 * Roles: ops, admin
 */
router.get(
  "/admin/kyc/queue",
  authenticate,
  requireRole("ops", "admin"),
  async (_req: Request, res: Response) => {
    const items = await getKYCQueue();
    res.json({ items });
  },
);

/**
 * POST /admin/kyc/:id/review
 * Roles: ops, admin
 */
router.post(
  "/admin/kyc/:id/review",
  authenticate,
  requireRole("ops", "admin"),
  async (req: Request, res: Response) => {
    const kycId = validateId(req.params["id"] as string);
    const { approved, reason } = req.body as {
      approved?: boolean;
      reason?: string;
    };

    if (typeof approved !== "boolean") {
      throw new AppError(400, "approved must be a boolean", "VALIDATION_ERROR");
    }

    await reviewKYC(kycId, req.userId!, approved, reason);

    res.json({ status: approved ? "APPROVED" : "REJECTED" });
  },
);

export default router;
