/**
 * Scheduled reconciliation job — 3-way compare per currency:
 *   ledger sub-sums vs custody provider balances vs transaction state.
 *
 * 23-Observability-and-Reconciliation.md §1.
 * 06-Money-Custody-and-Settlement.md §2/§4 (unswept revenue).
 * Rule: never UPDATE/DELETE transaction_ledger — only read (AUD-01).
 * FIN-01: Money is NUMERIC(15,2) strings; no JS float arithmetic.
 * FIN-02: Every amount carries explicit currency; no cross-currency arithmetic.
 */
import { pool, type PoolClient } from "../db/pool.js";
import { logger } from "../config/logger.js";
import { custodyProvider } from "../providers/index.js";
import { recordReconciliationLatency, incrementReconciliationAnomaly } from "../services/metrics.js";
import { alertReconciliationAnomaly } from "../services/alerting.js";
import type { Currency, EscrowState } from "../types/domain.js";
import { toMinor, fromMinor, compareAmounts } from "../services/money.js";

export interface CurrencyReconciliation {
  currency: Currency;
  ledger: {
    totalDeposited: string;
    totalReleased: string;
    totalRefunded: string;
    netHeld: string;
    unsweptRevenue: string;
  };
  custodyBalance: string;
  gap: string;
  matched: boolean;
}

export interface ReconciliationResult {
  timestamp: string;
  perCurrency: CurrencyReconciliation[];
  stateSummary: Record<string, number>;
  anomalies: string[];
}

/**
 * Compute unswept revenue (commission + buyer protection fee) for a currency.
 * This is Croe revenue retained in the pool, not yet swept to operating accounts.
 * 06-Money-Custody-and-Settlement.md §4.
 */
async function computeUnsweptRevenue(
  client: PoolClient,
  currency: Currency,
): Promise<string> {
  // Sum of commission from released escrows + buyer protection fee from deposited escrows
  // Commission is recorded as part of FUNDS_RELEASED amount_delta (negative full amount)
  // but vendorNet = amount - commission. We need to extract commission.
  // For P0, we approximate: commission = 2.5% of released, buyerProtectionFee = 1.5% of deposited
  // This will be refined when buyer protection fee branch lands.
  const result = await client.query<{
    total_released: string;
    total_deposited: string;
  }>(
    // COALESCE to 0.00 (not '0') so an empty sum is still a NUMERIC(15,2) string (FIN-01)
    `SELECT
       COALESCE(SUM(CASE WHEN event_type = 'FUNDS_RELEASED' THEN ABS(amount_delta) END), 0.00)::text AS total_released,
       COALESCE(SUM(CASE WHEN event_type = 'FUNDS_DEPOSITED' THEN ABS(amount_delta) END), 0.00)::text AS total_deposited
     FROM transaction_ledger
     WHERE currency = $1`,
    [currency],
  );
  const { rows } = result;

  const totalReleased = toMinor(rows[0]?.total_released ?? "0.00");
  const totalDeposited = toMinor(rows[0]?.total_deposited ?? "0.00");

  // Commission: 250 bps of released amount
  const COMMISSION_BPS = 250n;
  const BPS_PER_UNIT = 10_000n;
  const commissionMinor = (totalReleased * COMMISSION_BPS) / BPS_PER_UNIT;
  const commissionRemainder = (totalReleased * COMMISSION_BPS) % BPS_PER_UNIT;
  const commissionFinal = commissionRemainder * 2n >= BPS_PER_UNIT ? commissionMinor + 1n : commissionMinor;

  // Buyer protection fee: 150 bps of deposited amount
  const BPF_BPS = 150n;
  const bpfMinor = (totalDeposited * BPF_BPS) / BPS_PER_UNIT;
  const bpfRemainder = (totalDeposited * BPF_BPS) % BPS_PER_UNIT;
  const bpfFinal = bpfRemainder * 2n >= BPS_PER_UNIT ? bpfMinor + 1n : bpfMinor;

  return fromMinor(commissionFinal + bpfFinal);
}

export async function runReconciliation(): Promise<ReconciliationResult> {
  const start = Date.now();
  const anomalies: string[] = [];
  const stateSummary: Record<string, number> = {};
  const perCurrency: CurrencyReconciliation[] = [];

  logger.info("Starting reconciliation job");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Get distinct currencies from active custody accounts and ledger ──
    const { rows: currencyRows } = await client.query<{ currency: string }>(
      `SELECT DISTINCT currency FROM custody_accounts WHERE is_active = true
       UNION
       SELECT DISTINCT currency FROM transaction_ledger`,
    );

    // ── 2. Per-currency reconciliation ──
    for (const row of currencyRows) {
      const currency = row.currency as Currency;

      // Ledger sub-sums per currency
      const { rows: ledgerRows } = await client.query<{
        event_type: string;
        total: string;
      }>(
        `SELECT event_type, COALESCE(SUM(ABS(amount_delta)), 0)::text AS total
         FROM transaction_ledger
         WHERE event_type IN ('FUNDS_DEPOSITED', 'FUNDS_RELEASED', 'REFUND_ISSUED')
           AND currency = $1
         GROUP BY event_type`,
        [currency],
      );

      const totals: Record<string, string> = {};
      for (const lr of ledgerRows) {
        totals[lr.event_type] = lr.total;
      }

      const depositedStr = totals["FUNDS_DEPOSITED"] ?? "0.00";
      const releasedStr = totals["FUNDS_RELEASED"] ?? "0.00";
      const refundedStr = totals["REFUND_ISSUED"] ?? "0.00";

      // netHeld = deposited - released - refunded (exact minor-unit arithmetic)
      const netHeldStr = fromMinor(
        toMinor(depositedStr) - toMinor(releasedStr) - toMinor(refundedStr),
      );

      // Compute unswept revenue (commission + buyer protection fee)
      const unsweptRevenueStr = await computeUnsweptRevenue(client, currency);

      // Expected custody balance = netHeld + unsweptRevenue
      const expectedCustodyStr = fromMinor(toMinor(netHeldStr) + toMinor(unsweptRevenueStr));

      // Custody provider balance
      const balance = await custodyProvider.getBalance(currency);
      const custodyBalanceStr = balance.amount;

      // Compare
      const cmp = compareAmounts(expectedCustodyStr, custodyBalanceStr);
      const matched = cmp === 0;

      const gapStr = cmp !== 0
        ? fromMinor(toMinor(expectedCustodyStr) > toMinor(custodyBalanceStr)
            ? toMinor(expectedCustodyStr) - toMinor(custodyBalanceStr)
            : toMinor(custodyBalanceStr) - toMinor(expectedCustodyStr))
        : "0.00";

      if (!matched) {
        anomalies.push(
          `Currency ${currency}: Expected custody ${expectedCustodyStr} (netHeld ${netHeldStr} + unswept ${unsweptRevenueStr}) differs from actual ${custodyBalanceStr} by ${gapStr}`,
        );
        incrementReconciliationAnomaly();
        alertReconciliationAnomaly(gapStr, currency);
      }

      perCurrency.push({
        currency,
        ledger: {
          totalDeposited: depositedStr,
          totalReleased: releasedStr,
          totalRefunded: refundedStr,
          netHeld: netHeldStr,
          unsweptRevenue: unsweptRevenueStr,
        },
        custodyBalance: custodyBalanceStr,
        gap: gapStr,
        matched,
      });
    }

    // ── 3. Escrow state counts ──
    const { rows: stateRows } = await client.query<{
      current_status: EscrowState;
      cnt: string;
    }>(
      `SELECT current_status, COUNT(*)::text AS cnt
       FROM escrow_transactions
       GROUP BY current_status`,
    );

    for (const row of stateRows) {
      stateSummary[row.current_status] = parseInt(row.cnt, 10);
    }

    // ── 4. Check for orphaned dispute cases ──
    const { rows: orphans } = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM dispute_cases dc
       LEFT JOIN escrow_transactions et ON dc.transaction_id = et.transaction_id
       WHERE et.transaction_id IS NULL`,
    );

    if (parseInt(orphans[0]?.cnt ?? "0", 10) > 0) {
      anomalies.push(`${orphans[0].cnt} dispute cases reference non-existent transactions`);
      incrementReconciliationAnomaly();
    }

    // ── 5. Check for ledger entries without matching state transitions ──
    const { rows: staleEntries } = await client.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM transaction_ledger tl
       WHERE tl.event_type = 'FUNDS_DEPOSITED'
         AND NOT EXISTS (
           SELECT 1 FROM escrow_transactions et
           WHERE et.transaction_id = tl.transaction_id
             AND et.current_status IN ('FUNDS_SECURED', 'SHIPPED', 'DELIVERED_CONFIRMED', 'FUNDS_RELEASED', 'DISPUTE_OPENED', 'AI_PROCESSING', 'UNDER_HUMAN_REVIEW', 'RESOLVED_AUTO', 'FUNDS_REFUNDED', 'FRAUD_LOCKOUT')
         )`,
    );

    if (parseInt(staleEntries[0]?.cnt ?? "0", 10) > 0) {
      anomalies.push(`${staleEntries[0].cnt} deposited ledger entries with no matching active escrow`);
      incrementReconciliationAnomaly();
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Reconciliation job failed");
    throw err;
  } finally {
    client.release();
  }

  const durationMs = Date.now() - start;
  recordReconciliationLatency(durationMs);

  const result: ReconciliationResult = {
    timestamp: new Date().toISOString(),
    perCurrency,
    stateSummary,
    anomalies,
  };

  if (anomalies.length > 0) {
    logger.warn({ anomalies, durationMs }, "Reconciliation completed with anomalies");
  } else {
    logger.info({ durationMs }, "Reconciliation completed cleanly");
  }

  return result;
}