/**
 * Exact money arithmetic for mobile (FIN-01).
 * Mirrors backend money.ts logic for fee preview without parseFloat.
 * Currency is carried by the caller (FIN-02).
 */

/** NUMERIC(15,2) wire format: up to 13 integer digits, exactly 2 decimals. */
export const AMOUNT_RE = /^\d{1,13}\.\d{2}$/;
const SIGNED_AMOUNT_RE = /^-?\d{1,13}\.\d{2}$/;

/** Fee rates are basis points: 1 bp = 0.01%, 10000 bp = 100%. */
const BPS_PER_UNIT = 10000n;

/** Parse a NUMERIC(15,2) string into integer minor units (BigInt). */
export function toMinor(amount: string): bigint {
  if (!SIGNED_AMOUNT_RE.test(amount)) {
    throw new Error(`Not a NUMERIC(15,2) decimal string: "${amount}"`);
  }
  return BigInt(amount.replace(".", ""));
}

/** Format integer minor units as a NUMERIC(15,2) string. */
export function fromMinor(minor: bigint): string {
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(3, "0");
  const formatted = `${digits.slice(0, -2)}.${digits.slice(-2)}`;
  if (!AMOUNT_RE.test(formatted)) {
    throw new Error(`Amount exceeds NUMERIC(15,2): ${negative ? "-" : ""}${formatted}`);
  }
  return negative ? `-${formatted}` : formatted;
}

/**
 * `bps` basis points of a non-negative amount, rounded half-up to the minor unit.
 * Equivalent to PostgreSQL `ROUND(amount * bps / 10000, 2)`.
 */
export function applyBps(amountMinor: bigint, bps: number): bigint {
  if (amountMinor < 0n) {
    throw new Error("applyBps expects a non-negative amount");
  }
  if (!Number.isSafeInteger(bps) || bps < 0) {
    throw new Error(`Basis points must be a non-negative integer, got ${bps}`);
  }
  const scaled = amountMinor * BigInt(bps);
  const quotient = scaled / BPS_PER_UNIT;
  const remainder = scaled % BPS_PER_UNIT;
  return remainder * 2n >= BPS_PER_UNIT ? quotient + 1n : quotient;
}

/** Fee rates in basis points. */
export type FeeRates = {
  commissionBps: number;
  buyerProtectionFeeBps: number;
};

/** Fee breakdown for display. */
export type FeeBreakdown = {
  amount: string;
  commission: string;
  vendorNet: string;
  buyerProtectionFee: string;
  amountCollected: string;
};

/** Default fee rates: 2.5% commission, 1.5% buyer protection fee. */
export const DEFAULT_FEE_RATES: FeeRates = {
  commissionBps: 250,
  buyerProtectionFeeBps: 150,
};

/**
 * Calculate fee breakdown for a given amount and rates.
 * Pure integer arithmetic — no float anywhere.
 */
export function calculateFees(amount: string, rates: FeeRates = DEFAULT_FEE_RATES): FeeBreakdown {
  const amountMinor = toMinor(amount);
  if (amountMinor <= 0n) {
    throw new Error(`Escrow amount must be positive, got ${amount}`);
  }

  const commissionMinor = applyBps(amountMinor, rates.commissionBps);
  const buyerProtectionFeeMinor = applyBps(amountMinor, rates.buyerProtectionFeeBps);
  if (commissionMinor > amountMinor) {
    throw new Error(`Commission ${rates.commissionBps}bps exceeds the escrow amount`);
  }

  const amountCollectedMinor = amountMinor + buyerProtectionFeeMinor;

  return {
    amount: fromMinor(amountMinor),
    commission: fromMinor(commissionMinor),
    vendorNet: fromMinor(amountMinor - commissionMinor),
    buyerProtectionFee: fromMinor(buyerProtectionFeeMinor),
    amountCollected: fromMinor(amountCollectedMinor),
  };
}