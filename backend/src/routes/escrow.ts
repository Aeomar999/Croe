import { Router, type Router as RouterType } from "express";
import type { Request, Response } from "express";
import { AppError } from "../middleware/error-handler.js";
import { requireIdempotencyKey, idempotencyGuard } from "../middleware/idempotency.js";
import { paymentRateLimiter } from "../middleware/rate-limiter.js";
import { authenticate } from "../middleware/auth.js";
import {
  createEscrow,
  getEscrow,
  initiateDeposit,
  shipEscrow,
  confirmDelivery,
  cancelEscrow,
  releaseFunds,
  refundFunds,
} from "../services/escrow.js";
import type { Currency, Carrier } from "../types/domain.js";
import { CURRENCIES } from "../types/domain.js";

const router: RouterType = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT_RE = /^\d{1,13}\.\d{2}$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;
const CARRIERS: readonly Carrier[] = ["MTN", "TELECEL", "AIRTELTIGO"];
const MAX_DESC_LEN = 500;
const MIN_DESC_LEN = 10;

function validateId(id: string | undefined): string {
  if (!id || !UUID_RE.test(id)) {
    throw new AppError(400, "Invalid transaction ID format", "VALIDATION_ERROR");
  }
  return id;
}

/**
 * POST /v1/escrow — Create escrow contract (vendor)
 * 18-API-Reference.md §2 Escrow
 */
router.post("/escrow", authenticate, paymentRateLimiter, requireIdempotencyKey, idempotencyGuard, async (req: Request, res: Response) => {
  const { item_description, amount, currency } = req.body as {
    item_description?: string;
    amount?: string;
    currency?: string;
  };

  if (!item_description || item_description.length < MIN_DESC_LEN || item_description.length > MAX_DESC_LEN) {
    throw new AppError(400, `item_description must be ${MIN_DESC_LEN}–${MAX_DESC_LEN} chars`, "VALIDATION_ERROR");
  }
  if (!amount || !AMOUNT_RE.test(amount)) {
    throw new AppError(400, "amount must be decimal string with 2 decimal places (e.g. 450.00)", "VALIDATION_ERROR");
  }
  if (!currency || !CURRENCIES.includes(currency as Currency)) {
    throw new AppError(400, `currency must be one of: ${CURRENCIES.join(", ")}`, "VALIDATION_ERROR");
  }

  const tx = await createEscrow({
    vendorId: req.userId!,
    itemDescription: item_description,
    amount,
    currency: currency as Currency,
    forensic: req.forensic,
  });

  res.status(201).json({
    transaction_id: tx.transaction_id,
    current_status: tx.current_status,
    amount: tx.amount,
    currency: tx.currency,
    created_at: tx.created_at,
  });
});

/**
 * GET /v1/escrow/:id — Get escrow status
 */
router.get("/escrow/:id", authenticate, async (req: Request, res: Response) => {
  const id = validateId(req.params["id"] as string);
  const tx = await getEscrow(id);

  res.json({
    transaction_id: tx.transaction_id,
    vendor_id: tx.vendor_id,
    buyer_id: tx.buyer_id,
    amount: tx.amount,
    currency: tx.currency,
    commission: tx.commission,
    item_description: tx.item_description,
    current_status: tx.current_status,
    deposit_expires_at: tx.deposit_expires_at,
    dispute_closes_at: tx.dispute_closes_at,
    created_at: tx.created_at,
    updated_at: tx.updated_at,
  });
});

/**
 * POST /v1/escrow/:id/deposit — Initiate deposit (buyer)
 * Guard: must be in LINK_CREATED. Calls PaymentRail.initiateDeposit().
 * Returns 202 {collectionRef, status} per 18-API-Reference.md §2.
 */
router.post("/escrow/:id/deposit", authenticate, paymentRateLimiter, requireIdempotencyKey, idempotencyGuard, async (req: Request, res: Response) => {
  const id = validateId(req.params["id"] as string);
  const { msisdn, carrier } = req.body as { msisdn?: string; carrier?: string };

  if (!msisdn || !E164_RE.test(msisdn)) {
    throw new AppError(400, "msisdn must be E.164 format (e.g. +233240000000)", "VALIDATION_ERROR");
  }
  if (!carrier || !CARRIERS.includes(carrier as Carrier)) {
    throw new AppError(400, `carrier must be one of: ${CARRIERS.join(", ")}`, "VALIDATION_ERROR");
  }

  const { collectionRef, status } = await initiateDeposit({
    transactionId: id,
    buyerId: req.userId!,
    msisdn,
    carrier: carrier as Carrier,
    forensic: req.forensic,
  });

  res.status(202).json({
    collectionRef,
    status,
  });
});

/**
 * POST /v1/escrow/:id/ship — Mark shipped (vendor)
 * Guard: must be in FUNDS_SECURED
 */
router.post("/escrow/:id/ship", authenticate, requireIdempotencyKey, idempotencyGuard, async (req: Request, res: Response) => {
  const id = validateId(req.params["id"] as string);
  const tx = await shipEscrow({
    transactionId: id,
    vendorId: req.userId!,
    forensic: req.forensic,
  });

  res.json({
    transaction_id: tx.transaction_id,
    current_status: tx.current_status,
  });
});

/**
 * POST /v1/escrow/:id/confirm-delivery — Confirm delivery (buyer)
 * Guard: must be in SHIPPED
 */
router.post("/escrow/:id/confirm-delivery", authenticate, requireIdempotencyKey, idempotencyGuard, async (req: Request, res: Response) => {
  const id = validateId(req.params["id"] as string);
  const tx = await confirmDelivery({
    transactionId: id,
    buyerId: req.userId!,
    forensic: req.forensic,
  });

  res.json({
    transaction_id: tx.transaction_id,
    current_status: tx.current_status,
  });
});

/**
 * POST /v1/escrow/:id/cancel — Cancel (vendor)
 * Guard: must be in LINK_CREATED
 */
router.post("/escrow/:id/cancel", authenticate, requireIdempotencyKey, idempotencyGuard, async (req: Request, res: Response) => {
  const id = validateId(req.params["id"] as string);
  const tx = await cancelEscrow({
    transactionId: id,
    vendorId: req.userId!,
    forensic: req.forensic,
  });

  res.json({
    transaction_id: tx.transaction_id,
    current_status: tx.current_status,
  });
});

/**
 * POST /v1/escrow/:id/release — Release funds to vendor
 * Guard: must be in DELIVERED_CONFIRMED. MONEY-01: pay then ledger.
 */
router.post("/escrow/:id/release", authenticate, requireIdempotencyKey, idempotencyGuard, async (req: Request, res: Response) => {
  const id = validateId(req.params["id"] as string);
  const tx = await releaseFunds({
    transactionId: id,
    forensic: req.forensic,
  });

  res.json({
    transaction_id: tx.transaction_id,
    current_status: tx.current_status,
  });
});

/**
 * POST /v1/escrow/:id/refund — Refund buyer
 * Guard: must be in RESOLVED_AUTO or UNDER_HUMAN_REVIEW. MONEY-01: pay then ledger.
 */
router.post("/escrow/:id/refund", authenticate, requireIdempotencyKey, idempotencyGuard, async (req: Request, res: Response) => {
  const id = validateId(req.params["id"] as string);
  const tx = await refundFunds({
    transactionId: id,
    forensic: req.forensic,
  });

  res.json({
    transaction_id: tx.transaction_id,
    current_status: tx.current_status,
  });
});

export default router;
