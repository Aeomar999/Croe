import type { EscrowState, LedgerEvent } from "../types/domain.js";

/**
 * Valid state transitions per 07-Escrow-Lifecycle.md §2.
 * Key = current state, Value = map of allowed target states and their ledger event.
 */
export const VALID_TRANSITIONS: Partial<
  Record<
    EscrowState,
    Partial<Record<EscrowState, LedgerEvent | null>>
  >
> = {
  LINK_CREATED: {
    AWAITING_DEPOSIT: "BUYER_CLAIMED",
    CANCELLED: null,
  },
  AWAITING_DEPOSIT: {
    FUNDS_SECURED: "FUNDS_DEPOSITED",
    EXPIRED: null,
  },
  FUNDS_SECURED: {
    SHIPPED: "SHIPPED",
    DISPUTE_OPENED: "DISPUTE_OPENED",
  },
  SHIPPED: {
    DELIVERED_CONFIRMED: "DELIVERY_CONFIRMED",
    FUNDS_RELEASED: "FUNDS_RELEASED",
    DISPUTE_OPENED: "DISPUTE_OPENED",
  },
  DELIVERED_CONFIRMED: {
    FUNDS_RELEASED: "FUNDS_RELEASED",
  },
  DISPUTE_OPENED: {
    AI_PROCESSING: null,
    FRAUD_LOCKOUT: "FRAUD_FLAGGED",
  },
  AI_PROCESSING: {
    RESOLVED_AUTO: null,
    UNDER_HUMAN_REVIEW: null,
  },
  RESOLVED_AUTO: {
    FUNDS_RELEASED: "FUNDS_RELEASED",
    FUNDS_REFUNDED: "REFUND_ISSUED",
  },
  UNDER_HUMAN_REVIEW: {
    FUNDS_RELEASED: "FUNDS_RELEASED",
    FUNDS_REFUNDED: "REFUND_ISSUED",
  },
};

/** Terminal states — no transitions leave these. */
export const TERMINAL_STATES: ReadonlySet<EscrowState> = new Set([
  "FUNDS_RELEASED",
  "FUNDS_REFUNDED",
  "FRAUD_LOCKOUT",
  "EXPIRED",
  "CANCELLED",
]);

/**
 * Check if a transition is valid.
 * Returns the ledger event to write, or null if no ledger event.
 * Throws if the transition is invalid.
 */
export function validateTransition(
  from: EscrowState,
  to: EscrowState,
): LedgerEvent | null {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !(to in allowed)) {
    throw new InvalidTransitionError(from, to);
  }
  return allowed[to] ?? null;
}

export class InvalidTransitionError extends Error {
  constructor(
    public from: EscrowState,
    public to: EscrowState,
  ) {
    super(`Invalid state transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}
