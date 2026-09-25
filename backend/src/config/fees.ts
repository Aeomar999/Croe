import { CURRENCIES, type Currency, type FeeRates } from "../types/domain.js";

/**
 * Fee schedule per market (03-Business-Model-and-Costs.md §1).
 *
 * Rates are config, never constants in revenue logic. A market is keyed by
 * its currency (GHS = Ghana). Each rate is a whole number of basis points:
 *
 *   COMMISSION_BPS / BUYER_PROTECTION_FEE_BPS                 all markets
 *   COMMISSION_BPS_<CUR> / BUYER_PROTECTION_FEE_BPS_<CUR>     one market (e.g. _GHS)
 *
 * The 4% vendor-only fallback is COMMISSION_BPS=400, BUYER_PROTECTION_FEE_BPS=0.
 */
export const DEFAULT_FEE_RATES: Readonly<FeeRates> = Object.freeze({
  commissionBps: 250, // 2.5%
  buyerProtectionFeeBps: 150, // 1.5%
});

/**
 * Upper bound per rate (10%). Catches a mistyped rate at boot, and keeps
 * the commission below the escrow amount so a vendor payout is never zero.
 */
export const MAX_FEE_BPS = 1_000;

export type FeeSchedule = Readonly<Record<Currency, Readonly<FeeRates>>>;

function parseBps(
  source: Record<string, string | undefined>,
  name: string,
  fallback: number,
): number {
  const raw = source[name]?.trim();
  if (raw === undefined || raw === "") {
    return fallback;
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be a whole number of basis points (250 = 2.5%), got "${raw}"`);
  }
  const bps = Number(raw);
  if (bps > MAX_FEE_BPS) {
    throw new Error(`${name} must be between 0 and ${MAX_FEE_BPS} basis points, got ${bps}`);
  }
  return bps;
}

/** Build the per-market fee schedule from environment variables. Throws on invalid values. */
export function parseFeeSchedule(source: Record<string, string | undefined>): FeeSchedule {
  const commissionBps = parseBps(source, "COMMISSION_BPS", DEFAULT_FEE_RATES.commissionBps);
  const buyerProtectionFeeBps = parseBps(
    source,
    "BUYER_PROTECTION_FEE_BPS",
    DEFAULT_FEE_RATES.buyerProtectionFeeBps,
  );

  const schedule = {} as Record<Currency, Readonly<FeeRates>>;
  for (const currency of CURRENCIES) {
    schedule[currency] = Object.freeze({
      commissionBps: parseBps(source, `COMMISSION_BPS_${currency}`, commissionBps),
      buyerProtectionFeeBps: parseBps(
        source,
        `BUYER_PROTECTION_FEE_BPS_${currency}`,
        buyerProtectionFeeBps,
      ),
    });
  }
  return Object.freeze(schedule);
}

/** Look up the fee rates for a transaction's currency. */
export function feeRatesFor(schedule: FeeSchedule, currency: string): Readonly<FeeRates> {
  const rates = (schedule as Partial<Record<string, Readonly<FeeRates>>>)[currency];
  if (!rates) {
    throw new Error(`No fee schedule for currency ${currency}`);
  }
  return rates;
}