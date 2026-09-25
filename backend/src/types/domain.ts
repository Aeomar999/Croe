export const CANONICAL_STATES = [
  "LINK_CREATED",
  "AWAITING_DEPOSIT",
  "FUNDS_SECURED",
  "SHIPPED",
  "DELIVERED_CONFIRMED",
  "FUNDS_RELEASED",
  "DISPUTE_OPENED",
  "AI_PROCESSING",
  "UNDER_HUMAN_REVIEW",
  "RESOLVED_AUTO",
  "FUNDS_REFUNDED",
  "FRAUD_LOCKOUT",
  "EXPIRED",
  "CANCELLED",
] as const;

export type EscrowState = (typeof CANONICAL_STATES)[number];

export const CANONICAL_LEDGER_EVENTS = [
  "LINK_CREATED",
  "BUYER_CLAIMED",
  "FUNDS_DEPOSITED",
  "SHIPPED",
  "DELIVERY_CONFIRMED",
  "FUNDS_RELEASED",
  "DISPUTE_OPENED",
  "EVIDENCE_ADDED",
  "FRAUD_FLAGGED",
  "REFUND_ISSUED",
  "PAYOUT_INITIATED",
  "PAYOUT_FAILED",
] as const;

export type LedgerEvent = (typeof CANONICAL_LEDGER_EVENTS)[number];

export const DISPUTE_REASON_CODES = [
  "ITEM_NOT_RECEIVED",
  "ITEM_DAMAGED",
  "WRONG_ITEM",
  "ITEM_NOT_AS_DESCRIBED",
] as const;

export type DisputeReasonCode = (typeof DISPUTE_REASON_CODES)[number];

export const AI_ACTIONS = [
  "REFUND_BUYER",
  "RELEASE_VENDOR",
  "ESCALATE_HUMAN",
] as const;

export type AIAction = (typeof AI_ACTIONS)[number];

export const CURRENCIES = ["GHS", "NGN", "KES"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const CUSTODY_PHASES = ["P0", "P1", "P2", "P3"] as const;

export type CustodyPhase = (typeof CUSTODY_PHASES)[number];

export type Money = {
  amount: string;
  currency: Currency;
};

export const DISPUTE_STATUSES = [
  "AI_PROCESSING",
  "UNDER_HUMAN_REVIEW",
  "RESOLVED_AUTO",
  "FRAUD_LOCKOUT",
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const KYC_TIERS = [0, 1, 2] as const;

export type KYCTier = (typeof KYC_TIERS)[number];

export const CARRIERS = ["MTN", "TELECEL", "AIRTELTIGO"] as const;

export type Carrier = (typeof CARRIERS)[number];

/** Fee rates for one market, in basis points (250 = 2.5%). See 03-Business-Model-and-Costs.md §1. */
export type FeeRates = {
  /** Commission: vendor-paid, deducted at FUNDS_RELEASED. */
  commissionBps: number;
  /** Buyer protection fee: buyer-paid, added to the amount collected at deposit. */
  buyerProtectionFeeBps: number;
};

export type DisbursementResult = {
  payoutId: string;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  providerRef?: string;
  failureReason?: string;
};

export type ReconciliationReport = {
  pooled: Money;
  subLedgerSum: Money;
  statementSum: Money;
  matched: boolean;
  discrepancies: Array<{ transactionId?: string; note: string; delta: Money }>;
};
