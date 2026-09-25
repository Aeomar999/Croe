/**
 * Exact money arithmetic (FIN-01).
 *
 * Money crosses every boundary as a NUMERIC(15,2) decimal string ("450.00").
 * Arithmetic runs on integer minor units (pesewas / kobo / cents) held in a
 * BigInt, so there is no JS number float anywhere on the money path.
 * Currency is carried by the caller (FIN-02); these helpers are currency-free
 * because GHS, NGN and KES all have exactly two minor-unit digits.
 *
 * See 11-Payouts-Refunds.md §2 for the fee rounding rule.
 */
import type { FeeRates } from "../types/domain.js";

/** NUMERIC(15,2) wire format: up to 13 integer digits, exactly 2 decimals. */
export const AMOUNT_RE = /^\d{1,13}\.\d{2}$/;
const SIGNED_AMOUNT_RE = /^-?\d{1,13}\.\d{2}$/;

/** Largest NUMERIC(15,2) value, 9999999999999.99, in minor units. */
export const MAX_AMOUNT_MINOR = 999_999_999_999_999n;

/** Fee rates are basis points: 1 bp = 0.01%, 10000 bp = 100%. */
export const BPS_PER_UNIT = 10_000n;

export class MoneyFormatError extends Error {
  constructor(value: string) {
    super(`Not a NUMERIC(15,2) decimal string: "${value}"`);
    this.name = "MoneyFormatError";
  }
}

/** Parse a NUMERIC(15,2) string ("-12.50" allowed) into integer minor units. */
export function toMinor(amount: string): bigint {
  if (!SIGNED_AMOUNT_RE.test(amount)) {
    throw new MoneyFormatError(amount);
  }
  return BigInt(amount.replace(".", ""));
}

/** Format integer minor units as a NUMERIC(15,2) string. */
export function fromMinor(minor: bigint): string {
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(3, "0");
  const formatted = `${digits.slice(0, -2)}.${digits.slice(-2)}`;
  if (!AMOUNT_RE.test(formatted)) {
    throw new RangeError(`Amount exceeds NUMERIC(15,2): ${negative ? "-" : ""}${formatted}`);
  }
  return negative ? `-${formatted}` : formatted;
}

/**
 * `bps` basis points of a non-negative amount, rounded half-up to the minor
 * unit. Equivalent to PostgreSQL `ROUND(amount * bps / 10000, 2)`.
 */
export function applyBps(amountMinor: bigint, bps: number): bigint {
  if (amountMinor < 0n) {
    throw new RangeError("applyBps expects a non-negative amount");
  }
  if (!Number.isSafeInteger(bps) || bps < 0) {
    throw new RangeError(`Basis points must be a non-negative integer, got ${bps}`);
  }
  const scaled = amountMinor * BigInt(bps);
  const quotient = scaled / BPS_PER_UNIT;
  const remainder = scaled % BPS_PER_UNIT;
  return remainder * 2n >= BPS_PER_UNIT ? quotient + 1n : quotient;
}

/** Every amount is a NUMERIC(15,2) string in the transaction's currency. */
export type FeeBreakdown = {
  /** Escrow amount set by the vendor. */
  amount: string;
  /** Croe commission, paid by the vendor out of `amount`. */
  commission: string;
  /** What the vendor receives on release: `amount − commission`. */
  vendorNet: string;
  /** Buyer protection fee, paid by the buyer on top of `amount`. */
  buyerProtectionFee: string;
  /** What the buyer pays at deposit: `amount + buyerProtectionFee`. */
  amountCollected: string;
};

/**
 * Split an escrow amount into commission, vendor net and buyer protection fee.
 *
 * Each fee is rounded once, then the counterpart is derived by exact
 * subtraction/addition, so these hold with zero drift for every input:
 *   vendorNet + commission             == amount
 *   amount + buyerProtectionFee        == amountCollected
 *
 * Throws RangeError if `amountCollected` would not fit in NUMERIC(15,2).
 */
export function calculateFees(amount: string, rates: FeeRates): FeeBreakdown {
  const amountMinor = toMinor(amount);
  if (amountMinor <= 0n) {
    throw new RangeError(`Escrow amount must be positive, got ${amount}`);
  }

  const commissionMinor = applyBps(amountMinor, rates.commissionBps);
  const buyerProtectionFeeMinor = applyBps(amountMinor, rates.buyerProtectionFeeBps);
  if (commissionMinor > amountMinor) {
    throw new RangeError(`Commission ${rates.commissionBps}bps exceeds the escrow amount`);
  }

  const amountCollectedMinor = amountMinor + buyerProtectionFeeMinor;
  if (amountCollectedMinor > MAX_AMOUNT_MINOR) {
    throw new RangeError(`Amount collected exceeds NUMERIC(15,2) for amount ${amount}`);
  }

  return {
    amount: fromMinor(amountMinor),
    commission: fromMinor(commissionMinor),
    vendorNet: fromMinor(amountMinor - commissionMinor),
    buyerProtectionFee: fromMinor(buyerProtectionFeeMinor),
    amountCollected: fromMinor(amountCollectedMinor),
  };
}

/** Add two NUMERIC(15,2) strings, return NUMERIC(15,2) string. */
export function addAmounts(a: string, b: string): string {
  return fromMinor(toMinor(a) + toMinor(b));
}

/** Subtract b from a (both NUMERIC(15,2) strings), return NUMERIC(15,2) string. */
export function subtractAmounts(a: string, b: string): string {
  return fromMinor(toMinor(a) - toMinor(b));
}

/** Compare two NUMERIC(15,2) strings: returns -1, 0, or 1. */
export function compareAmounts(a: string, b: string): number {
  const aMinor = toMinor(a);
  const bMinor = toMinor(b);
  if (aMinor < bMinor) return -1;
  if (aMinor > bMinor) return 1;
  return 0;
}

/** Sum an array of NUMERIC(15,2) strings, return NUMERIC(15,2) string. */
export function sumAmounts(amounts: string[]): string {
  if (amounts.length === 0) return "0.00";
  return amounts.reduce((acc, curr) => fromMinor(toMinor(acc) + toMinor(curr)), "0.00");
}